/** Resúmenes de un periodo que comparten el informe de consulta y la exportación. Sin datos personales:
 *  todo sale de los registros y los ajustes de la usuaria. */
import { addDays } from '../../lib/dates'
import { FASES, infoDia, type Mapa, type Modelo } from '../ciclo/logica'
import { objetivo, total, type HidraCfg, type HidraDia } from '../hidratacion/logica'
import type { Pesada } from '../nutricion/Peso'
import { kcalDia } from '../nutricion/kcal'
import { aMin, ayuno, duracion, hecha, horarios, menuDe, platosDe, tomasDe, type NutriCfg, type NutriDia } from '../nutricion/logica'
import { objetivosEn, type ObjCfg, type Objetivo } from '../objetivos/logica'
import { COMIDAS, conOpciones, gruposDe, tieneEscala, type Grupo, type SintCfg, type SintDia } from '../sintomas/logica'
import { MOMENTOS, cumplimiento, enTerapia, proximaDe, vigente, type Producto, type SuplCfg, type SuplDia } from '../suplementos/logica'
import { diasDe, type Periodo } from './datos'

export const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
export const dec = (n: number) => n.toFixed(1).replace('.', ',')
export const pl = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
export const corta = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
export const pct = (x: number) => Math.round(x * 100) + ' %'
/** Número con separador de miles también en las cifras de cuatro dígitos (2.340, no 2340). */
export const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
/** «18 de septiembre de 2026». */
export const larga = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
const MOMENTO: { [k: string]: string } = Object.fromEntries(MOMENTOS)

export interface Contexto {
  hoy: string
  ahoraMin: number
  modelo: Modelo
  cicloMapa: Mapa
  sintCfg: SintCfg | null
  nutriCfg: NutriCfg | null
  hidraCfg: HidraCfg | null
  suplCfg: SuplCfg | null
  objCfg: ObjCfg | null
}

/** Días del periodo que ya han llegado (sin los futuros). */
export const diasHasta = (p: Periodo, hoy: string) => diasDe(p.desde, p.hasta < hoy ? p.hasta : hoy)

// ---------- Ciclo ----------
export function cicloTxt(c: Contexto, day: string): string | null {
  const i = infoDia(c.modelo, c.cicloMapa, day)
  if (!i) return null
  return `día ${i.dia} del ciclo, ${FASES[i.fase].toLowerCase()}${i.critica ? ', ventana crítica' : ''}`
}

// ---------- Signos y síntomas ----------
export interface Episodio { dia: string; hora: string; nombre: string; gravedad?: number | null; urgencias: boolean }

export function episodiosDe(grupos: Grupo[], dias: { day: string; value: SintDia }[]): Episodio[] {
  return grupos.filter((g) => g.tipo === 'detalle').flatMap((g) =>
    dias.flatMap((d) => (d.value.sel?.[g.id] ?? []).map((id) => {
      const det = d.value.det?.[g.id]?.[id] ?? {}
      return { dia: d.day, hora: det.hora ?? '', nombre: g.opciones?.find((o) => o.id === id)?.nombre ?? id, gravedad: det.gravedad, urgencias: !!det.urgencias }
    })),
  ).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora))
}

/** Días en que se marcó cada opción de un grupo, sin contar la opción neutra («sin dolor»…). */
function diasPorOpcion(g: Grupo, dias: { day: string; value: SintDia }[]): string {
  const ops = (g.opciones ?? []).slice(g.tipo === 'varias' && g.neutra ? 1 : 0)
  return ops
    .map((o) => [o.nombre, dias.filter((d) => d.value.sel?.[g.id]?.includes(o.id)).length] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, n]) => `${nombre}: ${pl(n, 'día', 'días')}`)
    .join(' · ')
}

/** Una fila por grupo con lo registrado en el periodo. */
export function filasSintomas(grupos: Grupo[], dias: { day: string; value: SintDia }[]): [string, string][] {
  const filas: [string, string][] = []
  for (const g of grupos) {
    if (conOpciones(g.tipo)) { const t = diasPorOpcion(g, dias); if (t) filas.push([g.nombre, t]) }
    if (tieneEscala(g)) {
      const antes = g.tipo === 'escala' ? diasPorOpcion(g, dias) : ''
      if (antes) filas.push([`${g.nombre} (registro anterior)`, antes])
      const xs = dias.map((d) => d.value.escala?.[g.id]).filter((x): x is number => x != null)
      if (xs.length) filas.push([g.tipo === 'escala' ? g.nombre : `${g.nombre} (escala)`, `Media ${dec(media(xs))} de 0 a 10 (${pl(xs.length, 'día', 'días')})${g.min_txt ? ` · 0 ${g.min_txt}` : ''}${g.max_txt ? ` · 10 ${g.max_txt}` : ''}`])
    }
    if (g.tipo === 'hambre') {
      const t = COMIDAS.map(([k, n]) => {
        const xs = dias.map((d) => d.value.hambre?.[k]).filter((x): x is number => x != null)
        return xs.length ? `${n.toLowerCase()} ${dec(media(xs))}` : ''
      }).filter(Boolean).join(' · ')
      const sin = dias.filter((d) => d.value.sin_hambre).length
      if (t || sin) filas.push([g.nombre, [t && `Media de 0 a 10: ${t}`, sin && `come sin hambre: ${pl(sin, 'día', 'días')}`].filter(Boolean).join(' · ')])
    }
    if (g.tipo === 'heces') {
      const deps = dias.flatMap((d) => d.value.heces ?? [])
      const sin = dias.filter((d) => d.value.sin_heces).length
      const porTipo = [1, 2, 3, 4, 5, 6, 7].map((b) => [b, deps.filter((x) => x.bristol === b).length] as const).filter(([, n]) => n > 0)
      const sangre = deps.filter((x) => x.sangre).length
      if (deps.length || sin) {
        filas.push([g.nombre, [
          `${pl(deps.length, 'deposición', 'deposiciones')} en ${pl(dias.filter((d) => d.value.heces?.length).length, 'día', 'días')}`,
          sin && `días sin deposición: ${sin}`,
          porTipo.length && 'Bristol ' + porTipo.map(([b, n]) => `${b}: ${n}`).join(', '),
          sangre && `con sangre: ${sangre}`,
        ].filter(Boolean).join(' · ')])
      }
    }
    if (g.tipo === 'micciones') {
      const xs = dias.map((d) => d.value.micciones).filter((x): x is number => x != null)
      if (xs.length) filas.push([g.nombre, `Media ${dec(media(xs))} al día (${pl(xs.length, 'día', 'días')})`])
    }
  }
  return filas
}

export const notasDe = (grupos: Grupo[], dias: { day: string; value: SintDia }[]) =>
  grupos.filter((g) => g.tipo === 'texto').flatMap((g) =>
    dias.filter((d) => d.value.texto?.[g.id]?.trim()).map((d) => ({ dia: d.day, texto: d.value.texto![g.id].trim() })))

export const sintomasDel = (p: Periodo, c: Contexto) => {
  const dias = diasHasta(p, c.hoy).filter((d) => p.sint.has(d)).map((d) => ({ day: d, value: p.sint.get(d)! }))
  return { dias, grupos: gruposDe(c.sintCfg) }
}

// ---------- Nutrición ----------
export interface ResumenNutricion {
  diasConRegistro: number
  hechas: number
  total: number
  /** Veces que se saltó cada toma (marcada «No» o sin registrar en un día con registro). */
  saltadas: [string, number][]
  cenasConHora: number
  cenasATiempo: number
  /** Noches con las dos horas (fin de la última toma y primera del día siguiente). */
  ayunos: number[]
  kcal: { dias: number; mediaComido: number; mediaReferencia: number; llega: number; sinContar: number; deMenu: boolean } | null
}

const menuDia = (c: Contexto, day: string) => menuDe(c.nutriCfg!, infoDia(c.modelo, c.cicloMapa, day), day)

export function resumenNutricion(p: Periodo, c: Contexto): ResumenNutricion | null {
  const cfg = c.nutriCfg
  if (!cfg || !tomasDe(cfg).length) return null
  // Hoy todavía no ha terminado: solo cuentan los días cerrados.
  const dias = diasHasta(p, addDays(c.hoy, -1)).filter((d) => d < c.hoy && p.nutri.has(d))
  const r: ResumenNutricion = { diasConRegistro: dias.length, hechas: 0, total: 0, saltadas: [], cenasConHora: 0, cenasATiempo: 0, ayunos: [], kcal: null }
  const salt = new Map<string, number>()
  const comidos: number[] = [], refs: number[] = []
  let llega = 0, sinContar = 0, deMenu = true
  for (const day of dias) {
    const d = p.nutri.get(day)!
    const h = horarios(cfg, d, day, c.hoy, c.ahoraMin)
    r.hechas += h.hechas; r.total += h.total
    for (const s of h.saltadas) salt.set(s, (salt.get(s) ?? 0) + 1)
    if (h.cenaOk != null) { r.cenasConHora++; if (h.cenaOk) r.cenasATiempo++ }
    const a = ayuno(cfg, p.nutri.get(addDays(day, -1)) ?? null, d)
    if (a.min != null) r.ayunos.push(a.min)
    const k = kcalDia(cfg, d, menuDia(c, day), null)
    if (!k.referencia || k.sinDato.length) { sinContar++; continue }
    comidos.push(k.comido); refs.push(k.referencia); deMenu = k.deMenu
    if (k.comido >= k.referencia) llega++
  }
  r.saltadas = [...salt.entries()].sort((a, b) => b[1] - a[1])
  if (comidos.length) r.kcal = { dias: comidos.length, mediaComido: Math.round(media(comidos)), mediaReferencia: Math.round(media(refs)), llega, sinContar, deMenu }
  return r
}

/** Las tomas de un día en una línea cada una, para la exportación. */
export function tomasDelDia(c: Contexto, day: string, d: NutriDia): string[] {
  const cfg = c.nutriCfg
  if (!cfg) return []
  const ESTADO: { [k: string]: string } = { entera: 'entera', tres_cuartos: '¾', media: 'media', hecha: 'hecha', no: 'no la hice' }
  const PLATO = { veg: ['nada', 'la mitad', 'entera'], prot: ['nada', 'la mitad', 'entera'], hid: ['nada', 'la mitad', 'entera', 'vez y media'] }
  return tomasDe(cfg).map((t) => {
    const x = d.tomas?.[t.id]
    if (!x || (!hecha(x) && x.estado !== 'no')) return `${t.nombre}: sin registrar`
    const horas = [x.ini, x.fin].filter((h) => aMin(h) != null).join('–')
    const partes: string[] = [x.estado ? ESTADO[x.estado] ?? x.estado : 'anotada']
    if (horas) partes.push(horas)
    if (x.otro?.trim()) partes.push(`tomó otra cosa: «${x.otro.trim()}»`)
    else if (x.estado !== 'no') {
      const ids = x.platos?.length ? x.platos : platosDe(cfg, menuDia(c, day), t.id).map((q) => q.id)
      const nombres = x.nombres?.length === ids.length ? x.nombres : ids.map((id) => cfg.platos?.[id]?.nombre ?? id)
      const dejado = (i: number) => !!t.postre && i > 0 && x.postre?.[ids[i]] === 'no'
      const tomados = nombres.filter((_, i) => !dejado(i)), dejados = nombres.filter((_, i) => dejado(i))
      if (tomados.length) partes.push(tomados.join(' + '))
      if (dejados.length) partes.push('sin ' + dejados.join(' ni '))
    }
    if (x.plato && x.estado !== 'no') {
      const pz = (['veg', 'prot', 'hid'] as const).filter((k) => x.plato?.[k] != null).map((k) => `${{ veg: 'verdura', prot: 'proteína', hid: 'hidratos' }[k]} ${PLATO[k][x.plato![k]!] ?? ''}`)
      if (pz.length) partes.push('plato: ' + pz.join(', '))
    }
    return `${t.nombre}: ${partes.join(' · ')}`
  })
}

export function kcalTxt(c: Contexto, day: string, d: NutriDia): string | null {
  if (!c.nutriCfg) return null
  const k = kcalDia(c.nutriCfg, d, menuDia(c, day), day === c.hoy ? c.ahoraMin : null)
  if (!k.referencia) return null
  const ref = day === c.hoy ? k.referenciaHasta : k.referencia
  const base = `unas ${miles(k.comido)} kcal${ref ? ` de ${miles(ref)} ${k.deMenu ? 'previstas en el menú' : 'pautadas'}${day === c.hoy ? ' hasta ahora' : ''} (${pct(k.comido / ref)})` : ''}`
  const extra = [k.sinDato.length && `sin contar: ${k.sinDato.join(', ')}`, k.enParte.length && `contadas en parte: ${k.enParte.join(', ')}`].filter(Boolean).join(' · ')
  return extra ? `${base} · ${extra}` : base
}

export const ayunoTxt = (c: Contexto, p: Periodo, day: string) => {
  if (!c.nutriCfg) return null
  const a = ayuno(c.nutriCfg, p.nutri.get(addDays(day, -1)) ?? null, p.nutri.get(day) ?? {})
  return a.min != null ? duracion(a.min) : null
}

// ---------- Hidratación ----------
export function resumenHidratacion(p: Periodo, c: Contexto) {
  const dias = diasHasta(p, addDays(c.hoy, -1)).filter((d) => d < c.hoy)
  const ml = dias.map((d) => p.hidra.get(d)).filter((x): x is HidraDia => !!x).map(total).filter((t) => t > 0)
  const obj = objetivo(c.hidraCfg)
  return ml.length ? { dias: ml.length, mediaMl: Math.round(media(ml)), llega: ml.filter((t) => t >= obj).length, obj } : null
}

export function hidratacionTxt(d: HidraDia, obj: number): string {
  const partes = [
    d.agua_ml ? `agua ${d.agua_ml} ml` : '', d.mar_ml ? `agua de mar ${d.mar_ml} ml` : '',
    d.caldo_tazas ? pl(d.caldo_tazas, 'taza de caldo', 'tazas de caldo') : '', d.infusion_tazas ? pl(d.infusion_tazas, 'infusión', 'infusiones') : '',
    d.cardo_tazas ? pl(d.cardo_tazas, 'manzanilla con cardo mariano', 'manzanillas con cardo mariano') : '',
  ].filter(Boolean)
  return `${miles(total(d))} ml de ${miles(obj)}${partes.length ? ` (${partes.join(', ')})` : ''}`
}

// ---------- Suplementos ----------
export function pautaTxt(p: Producto): string {
  return [p.dosis, p.fechas ? 'en fechas concretas' : p.cada_dias ? `cada ${p.cada_dias} días` : (p.momentos ?? []).map((m) => MOMENTO[m] ?? m).join(', '), p.via && p.via !== 'Oral' ? p.via : '', p.pautado_por ? `pautado por ${p.pautado_por}` : '']
    .filter(Boolean).join(' · ')
}

export const productosVigentes = (c: Contexto, fecha: string) => (c.suplCfg?.lista ?? []).filter((p) => vigente(p, fecha) && !enTerapia(p))

export function resumenSuplementos(p: Periodo, c: Contexto) {
  const lista = c.suplCfg?.lista ?? []
  const dias = diasHasta(p, c.hoy).filter((d) => p.supl.has(d))
  let hechas = 0, pautadas = 0, conMarcas = 0
  for (const d of dias) {
    const r = cumplimiento(lista, p.supl.get(d)!, d)
    if (!r.marcadas || !r.pautadas) continue
    conMarcas++; hechas += r.hechas; pautadas += r.pautadas
  }
  return pautadas ? { dias: conMarcas, hechas, pautadas } : null
}

/** Lo que no se tomó un día, por nombre y momento. */
export function sinTomar(c: Contexto, day: string, d: SuplDia): string[] {
  const t = d.tomas ?? {}
  return (c.suplCfg?.lista ?? []).filter((p) => vigente(p, day) && !enTerapia(p)).flatMap((p) =>
    (p.momentos?.length ? p.momentos : ['demanda']).filter((m) => t[p.id + ':' + m] === 'no').map((m) => `${p.nombre} (${(MOMENTO[m] ?? m).toLowerCase()})`))
}

export interface Terapia { nombre: string; pauta: string; veces: string[]; proxima: string | null }

/** Terapia endovenosa: veces hechas en el periodo y la próxima prevista. */
export function terapiaDel(p: Periodo, c: Contexto): Terapia[] {
  return (c.suplCfg?.lista ?? []).filter((x) => enTerapia(x) && (!x.retirado || x.retirado > p.desde)).map((x) => {
    const hechas = [...p.supl.entries()].filter(([, v]) => v.tomas?.[x.id] === 'si').map(([d]) => d).sort()
    const ultima = hechas.filter((d) => d <= c.hoy).pop()
    return { nombre: x.nombre, pauta: pautaTxt(x), veces: hechas.filter((d) => d >= p.desde && d <= p.hasta), proxima: x.retirado && x.retirado <= c.hoy ? null : proximaDe(x, c.hoy, ultima) }
  })
}

// ---------- Peso ----------
export function resumenPeso(p: Periodo) {
  const del = p.peso.filter((x) => x.dia >= p.desde && x.dia <= p.hasta)
  const conKg = del.filter((x) => x.kg != null)
  const anterior = [...p.peso].reverse().find((x) => x.dia < p.desde && x.kg != null) ?? null
  const ultima = [...del].reverse().find((x) => x.grasa_pct != null || x.musculo_kg != null || x.hueso_kg != null || x.agua_pct != null) ?? null
  return { del, primera: conKg[0] ?? null, ultimaKg: conKg[conKg.length - 1] ?? null, anterior, composicion: ultima }
}

export const composicionTxt = (x: Pesada) => [
  x.grasa_pct != null && `grasa ${dec(x.grasa_pct)} %`, x.musculo_kg != null && `músculo ${dec(x.musculo_kg)} kg`,
  x.hueso_kg != null && `hueso ${dec(x.hueso_kg)} kg`, x.agua_pct != null && `agua ${dec(x.agua_pct)} %`,
].filter(Boolean).join(' · ')

// ---------- Objetivos ----------
export function objetivosDel(p: Periodo, c: Contexto): Objetivo[] {
  if (!c.nutriCfg || !c.suplCfg) return []
  const dias = diasDe(p.desde, p.hasta)
  return objetivosEn(dias, {
    hoy: c.hoy, ahoraMin: c.ahoraMin, nutriCfg: c.nutriCfg, hidraCfg: c.hidraCfg, suplCfg: c.suplCfg, objCfg: c.objCfg ?? {},
    nutri: p.nutri, hidra: p.hidra, supl: p.supl, descanso: p.descanso, menuDia: (day) => menuDia(c, day),
  }).filter((o) => !o.falta && o.parte != null)
}
