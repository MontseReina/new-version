/** Objetivos de cumplimiento de la semana: qué se mira cada día y cómo se cuenta.
 *  Sin datos personales: horarios, pautas y listas salen de los ajustes de cada usuaria. */
import { addDays } from '../../lib/dates'
import { levantarHecho, objetivo, total, type HidraCfg, type HidraDia } from '../hidratacion/logica'
import { aMin, ayuno, finDe, hecha, horarios, tomasDe, type NutriCfg, type NutriDia } from '../nutricion/logica'
import { cumplimiento, nivel, type SuplCfg, type SuplDia } from '../suplementos/logica'

/** Horas del día que no salen de ninguna otra área: despertar y acostarse. `dormir` es la hora a la que
 *  se acuesta la noche de ese día; si es de madrugada se guarda igual en el día que termina. */
export type DescansoDia = { despertar?: string | null; dormir?: string | null }

/** Márgenes por defecto, en minutos. Se pueden cambiar en los ajustes (`objetivos`). */
export const DESAYUNO_MAX_MIN = 60
export const DORMIR_TRAS_CENA_MIN = 120
export type ObjCfg = { desayuno_max_min?: number; dormir_tras_cena_min?: number }

/** `ok` cumplido · `no` no cumplido · `parcial` a medias · `pend` hoy, todavía a tiempo · `nada` sin datos o día futuro. */
export type Marca = 'ok' | 'no' | 'parcial' | 'pend' | 'nada'

export interface Datos {
  hoy: string
  ahoraMin: number
  nutriCfg: NutriCfg
  hidraCfg: HidraCfg | null
  suplCfg: SuplCfg
  objCfg: ObjCfg
  nutri: Map<string, NutriDia>
  hidra: Map<string, HidraDia>
  supl: Map<string, SuplDia>
  descanso: Map<string, DescansoDia>
}

export interface Objetivo {
  id: string
  nombre: string
  /** Página en la que se registra. */
  ruta: string
  dias: Marca[]
  /** Parte cumplida, de 0 a 1. `null` = sin datos esta semana. */
  parte: number | null
  texto: string
}

/** Una hora de acostarse de madrugada cuenta como del día siguiente. */
const nocheMin = (h?: string | null) => { const m = aMin(h); return m == null ? null : m < 720 ? m + 1440 : m }
const primeraToma = (cfg: NutriCfg, d: NutriDia) => {
  let p: number | null = null
  for (const t of tomasDe(cfg)) { const x = d.tomas?.[t.id]; const i = aMin(x?.ini) ?? aMin(x?.fin); if (hecha(x) && i != null && (p == null || i < p)) p = i }
  return p
}

type Regla = (day: string, D: Datos) => Marca
const sinDato = (day: string, D: Datos): Marca => (day === D.hoy ? 'pend' : 'nada')

const ayunoMax: Regla = (day, D) => {
  const a = ayuno(D.nutriCfg, D.nutri.get(addDays(day, -1)) ?? null, D.nutri.get(day) ?? {})
  if (a.ok != null) return a.ok ? 'ok' : 'no'
  if (day !== D.hoy) return 'nada'
  // Hoy, con la última comida de ayer anotada y sin primera toma: a tiempo mientras no pase la hora límite.
  const ayer = D.nutri.get(addDays(day, -1))
  if (!tomasDe(D.nutriCfg).some((t) => hecha(ayer?.tomas?.[t.id]) && finDe(ayer?.tomas?.[t.id]) != null)) return 'nada'
  const tope = aMin(a.antesDe)
  return tope == null || D.ahoraMin > tope ? 'no' : 'pend'
}
const sinSaltar: Regla = (day, D) => {
  const d = D.nutri.get(day)
  if (!tomasDe(D.nutriCfg).length) return 'nada'
  if (!d) return sinDato(day, D)
  const h = horarios(D.nutriCfg, d, day, D.hoy, D.ahoraMin)
  if (h.saltadas.length) return 'no'
  return h.hechas === h.total ? 'ok' : 'pend'
}
const desayuno: Regla = (day, D) => {
  const w = aMin(D.descanso.get(day)?.despertar)
  if (w == null) return sinDato(day, D)
  const max = D.objCfg.desayuno_max_min ?? DESAYUNO_MAX_MIN
  const p = primeraToma(D.nutriCfg, D.nutri.get(day) ?? {})
  if (p != null) return p - w <= max ? 'ok' : 'no'
  if (day !== D.hoy) return 'nada'
  return D.ahoraMin > w + max ? 'no' : 'pend'
}
const cena = (day: string, D: Datos) => horarios(D.nutriCfg, D.nutri.get(day) ?? {}, day, D.hoy, D.ahoraMin)
const cenaAHora: Regla = (day, D) => { const c = cena(day, D).cenaOk; return c == null ? sinDato(day, D) : c ? 'ok' : 'no' }
const dormir: Regla = (day, D) => {
  const fin = aMin(cena(day, D).cenaFin), n = nocheMin(D.descanso.get(day)?.dormir)
  if (fin == null || n == null) return sinDato(day, D)
  return n - fin >= (D.objCfg.dormir_tras_cena_min ?? DORMIR_TRAS_CENA_MIN) ? 'ok' : 'no'
}
const hidratada: Regla = (day, D) => {
  const d = D.hidra.get(day)
  if (!d) return sinDato(day, D)
  return total(d) >= objetivo(D.hidraCfg) ? 'ok' : day === D.hoy ? 'pend' : 'no'
}
const alLevantar: Regla = (day, D) => {
  const d = D.hidra.get(day)
  if (!d) return sinDato(day, D)
  return levantarHecho(D.hidraCfg, d) ? 'ok' : day === D.hoy ? 'pend' : 'no'
}

const horaTxt = (min: number) => (min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`)

/** Los objetivos de una semana (de lunes a domingo), en el orden en que se enseñan. */
export function objetivosDe(lunes: string, D: Datos): Objetivo[] {
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const fila = (id: string, nombre: string, ruta: string, regla: Regla): Objetivo => {
    const m = dias.map((d) => (d > D.hoy ? 'nada' : regla(d, D)))
    const ok = m.filter((x) => x === 'ok').length, n = ok + m.filter((x) => x === 'no').length
    return { id, nombre, ruta, dias: m, parte: n ? ok / n : null, texto: n ? `${ok} de ${n} ${n === 1 ? 'día' : 'días'}` : 'Sin datos' }
  }
  const lista = D.suplCfg.lista ?? []
  let hechas = 0, pautadas = 0
  const supl = dias.map((d): Marca => {
    const x = D.supl.get(d)
    if (d > D.hoy || (!x && d !== D.hoy)) return 'nada'
    const c = cumplimiento(lista, x ?? {}, d)
    if (!c.pautadas) return 'nada'
    hechas += c.hechas; pautadas += c.pautadas
    const lv = nivel(c.pct)
    return lv === 'verde' ? 'ok' : d === D.hoy ? 'pend' : lv === 'amarillo' ? 'parcial' : 'no'
  })
  return [
    fila('ayuno', `Ayuno de la noche de ${D.nutriCfg.ayuno_max_h ?? 12} h como máximo`, 'nutricion', ayunoMax),
    fila('comidas', 'No saltarme comidas', 'nutricion', sinSaltar),
    fila('desayuno', `Desayunar en ${horaTxt(D.objCfg.desayuno_max_min ?? DESAYUNO_MAX_MIN)} desde que me despierto`, 'nutricion', desayuno),
    fila('cena', `Cena terminada a las ${D.nutriCfg.cena_fin_max ?? '21:00'}`, 'nutricion', cenaAHora),
    fila('dormir', `Irme a dormir ${horaTxt(D.objCfg.dormir_tras_cena_min ?? DORMIR_TRAS_CENA_MIN)} después de cenar`, 'nutricion', dormir),
    fila('hidratacion', 'Hidratación del día cumplida', 'hidratacion', hidratada),
    fila('levantar', 'Vaso de agua y chupito de mar al levantarme', 'hidratacion', alLevantar),
    { id: 'suplementos', nombre: 'Toma de suplementos', ruta: 'suplementos', dias: supl, parte: pautadas ? hechas / pautadas : null, texto: pautadas ? `${hechas} de ${pautadas} tomas` : 'Sin datos' },
  ]
}

/** Cumplimiento global: la media de los objetivos que tienen datos. */
export function global(o: Objetivo[]): number | null {
  const p = o.map((x) => x.parte).filter((x): x is number => x != null)
  return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null
}
