/** Objetivos de cumplimiento de la semana: qué se mira cada día y cómo se cuenta.
 *  Sin datos personales: horarios, pautas y listas salen de los ajustes de cada usuaria. */
import { addDays } from '../../lib/dates'
import { levantarHecho, objetivo, total, type HidraCfg, type HidraDia } from '../hidratacion/logica'
import { aMin, ayuno, finDe, hecha, horarios, tomasDe, type Estado, type NutriCfg, type NutriDia } from '../nutricion/logica'
import { cumplimiento, type SuplCfg, type SuplDia } from '../suplementos/logica'

/** Datos del descanso, que llegarán del anillo (Oura): no se teclean. `despertar` y `sueno_min` son de la
 *  noche que termina ese día; `dormir` es la hora a la que se acuesta la noche de ese día (si es de
 *  madrugada se guarda igual en el día que termina). */
export type DescansoDia = { despertar?: string | null; dormir?: string | null; sueno_min?: number | null }

/** Márgenes por defecto, en minutos. Se pueden cambiar en los ajustes (`objetivos`). */
export const DESAYUNO_MAX_MIN = 60
export const DORMIR_TRAS_CENA_MIN = 120
export const SUENO_MIN_H = 8
export type ObjCfg = { desayuno_max_min?: number; dormir_tras_cena_min?: number; sueno_min_h?: number }

/** `ok` cumplido (100 %) · `parcial` a medias (del 50 al 99 %) · `no` no cumplido (menos del 50 %) ·
 *  `pend` hoy, todavía a tiempo · `nada` sin datos o día futuro. */
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
  /** Por qué no se puede medir todavía (dato que aún no llega a la app). */
  falta?: string
}

/** Cumplido con el 100 %, a medias del 50 al 99 % y no cumplido por debajo del 50 %. */
export const grado = (parte: number): 'ok' | 'parcial' | 'no' => { const p = Math.round(parte * 100); return p >= 100 ? 'ok' : p >= 50 ? 'parcial' : 'no' }
/** Lo mismo para un día: hoy, mientras no esté cumplido, sigue pendiente. */
const delDia = (parte: number, day: string, D: Datos): Marca => { const g = grado(parte); return g !== 'ok' && day === D.hoy ? 'pend' : g }

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
  return delDia(h.hechas / h.total, day, D)
}
const desayuno: Regla = (day, D) => {
  const w = aMin(D.descanso.get(day)?.despertar)
  if (w == null) return 'nada'
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
  if (n == null) return 'nada'
  if (fin == null) return sinDato(day, D)
  return n - fin >= (D.objCfg.dormir_tras_cena_min ?? DORMIR_TRAS_CENA_MIN) ? 'ok' : 'no'
}
const hidratada: Regla = (day, D) => {
  const d = D.hidra.get(day)
  return d ? delDia(total(d) / objetivo(D.hidraCfg), day, D) : sinDato(day, D)
}
const alLevantar: Regla = (day, D) => {
  const d = D.hidra.get(day)
  if (!d) return sinDato(day, D)
  return levantarHecho(D.hidraCfg, d) ? 'ok' : day === D.hoy ? 'pend' : 'no'
}

const PARTE: { [k in Estado]: number } = { entera: 1, tres_cuartos: 0.75, media: 0.5, no: 0 }
/** Kilocalorías estimadas de un día a partir de lo registrado: las de los platos del menú de cada toma,
 *  por la parte que se tomó. `null` si no se pueden calcular (un plato sin cifra, o una toma en la que
 *  comió otra cosa o no dijo cuánto). Es un suelo que alcanzar, nunca un tope. */
export function kcalDe(cfg: NutriCfg, d: NutriDia): number | null {
  let suma = 0
  for (const t of tomasDe(cfg)) {
    const x = d.tomas?.[t.id]
    if (!x || (!x.estado && !hecha(x))) continue
    if (!x.estado || x.otro?.trim()) return null
    for (const id of x.platos ?? []) {
      if (x.postre?.[id] === 'no') continue
      const k = cfg.platos?.[id]?.kcal
      if (k == null) return null
      suma += k * PARTE[x.estado]
    }
  }
  return suma
}
const aporte: Regla = (day, D) => {
  const d = D.nutri.get(day), min = D.nutriCfg.kcal_min
  if (!min) return 'nada'
  if (!d) return sinDato(day, D)
  const k = kcalDe(D.nutriCfg, d)
  return k == null ? 'nada' : delDia(k / min, day, D)
}
const sueno: Regla = (day, D) => {
  const m = D.descanso.get(day)?.sueno_min
  return m == null ? 'nada' : grado(m / ((D.objCfg.sueno_min_h ?? SUENO_MIN_H) * 60))
}

const horaTxt = (min: number) => (min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`)

/** Los objetivos de una semana (de lunes a domingo), en el orden en que se enseñan. */
export function objetivosDe(lunes: string, D: Datos): Objetivo[] {
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const fila = (id: string, nombre: string, ruta: string, regla: Regla, falta?: string): Objetivo => {
    const m = dias.map((d) => (d > D.hoy ? 'nada' : regla(d, D)))
    const ok = m.filter((x) => x === 'ok').length, n = ok + m.filter((x) => x === 'no' || x === 'parcial').length
    return { id, nombre, ruta, dias: m, parte: n ? ok / n : null, texto: n ? `${ok} de ${n} ${n === 1 ? 'día' : 'días'}` : 'Sin datos', ...(n ? {} : { falta }) }
  }
  const lista = D.suplCfg.lista ?? []
  let hechas = 0, pautadas = 0
  const supl = dias.map((d): Marca => {
    const x = D.supl.get(d)
    if (d > D.hoy || (!x && d !== D.hoy)) return 'nada'
    const c = cumplimiento(lista, x ?? {}, d)
    if (!c.pautadas) return 'nada'
    hechas += c.hechas; pautadas += c.pautadas
    return delDia(c.pct, d, D)
  })
  const oura = 'Llegará con el anillo Oura'
  const sinKcal = !D.nutriCfg.kcal_min ? 'Falta la cifra diaria pautada' : 'Faltan las kilocalorías de los platos'
  return [
    fila('ayuno', `Ayuno de la noche de ${D.nutriCfg.ayuno_max_h ?? 12} h como máximo`, 'nutricion', ayunoMax),
    fila('comidas', 'No saltarme comidas', 'nutricion', sinSaltar),
    fila('desayuno', `Desayunar en ${horaTxt(D.objCfg.desayuno_max_min ?? DESAYUNO_MAX_MIN)} desde que me despierto`, 'nutricion', desayuno, oura),
    fila('cena', `Cena terminada a las ${D.nutriCfg.cena_fin_max ?? '21:00'}`, 'nutricion', cenaAHora),
    fila('dormir', `Irme a dormir ${horaTxt(D.objCfg.dormir_tras_cena_min ?? DORMIR_TRAS_CENA_MIN)} después de cenar`, 'nutricion', dormir, oura),
    fila('hidratacion', 'Hidratación del día cumplida', 'hidratacion', hidratada),
    fila('levantar', 'Vaso de agua y chupito de mar al levantarme', 'hidratacion', alLevantar),
    { id: 'suplementos', nombre: 'Toma de suplementos', ruta: 'suplementos', dias: supl, parte: pautadas ? hechas / pautadas : null, texto: pautadas ? `${hechas} de ${pautadas} tomas` : 'Sin datos' },
    fila('aporte', 'Aporte calórico diario adecuado para subir de peso', 'nutricion', aporte, sinKcal),
    fila('sueno', `Dormir ${D.objCfg.sueno_min_h ?? SUENO_MIN_H} horas como mínimo`, 'nutricion', sueno, oura),
  ]
}

/** Cumplimiento global: la media de los objetivos que tienen datos. */
export function global(o: Objetivo[]): number | null {
  const p = o.map((x) => x.parte).filter((x): x is number => x != null)
  return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null
}
