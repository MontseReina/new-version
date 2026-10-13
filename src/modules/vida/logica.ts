/** La vida que sueño: forma de los datos y cálculos. El plan de cada mes llega del prompt
 *  mensual y vive en la cuenta de la usuaria (base de datos), nunca en el código. */
import { fmtDate } from '../../lib/dates'
import type { Json } from '../../store/types'

export type Area = { id: string; nombre: string; objetivo?: string; minimo?: string; resultado?: string; anual?: string }
export type Mantenimiento = { id?: string; nombre: string; minimo?: string }
export type Accion = { id: string; texto: string; area?: string; dia?: string }
export type Semana = { desde: string; hasta: string; acciones: Accion[] }
export type Plan = {
  mes: string // AAAA-MM
  frase?: string
  salud?: string
  areas?: Area[]
  mantenimiento?: Mantenimiento[]
  semanas: Semana[]
}

export type Estado = 'si' | 'media' | 'no'
export const ESTADOS: { [k in Estado]: string } = { si: 'Hecha', media: 'A medias', no: 'No hecha' }
/** Un toque: hecha · dos: a medias · tres: no hecha · cuatro: vuelve a vacío. */
export const siguiente = (e?: Estado | null): Estado | null => (!e ? 'si' : e === 'si' ? 'media' : e === 'media' ? 'no' : null)

export type Marca = { estado: Estado; dia?: string; nota?: string }
export type Logro = { texto: string; area?: string; dia: string }
/** Documento del mes (módulo `vida`, día AAAA-MM-01): el plan, lo marcado y los logros. */
export type VidaMes = { plan?: Plan; marcas?: { [accion: string]: Marca }; logros?: Logro[]; quitadas?: string[] }
/** Ajustes: qué mes está en curso. */
export type VidaCfg = { mes?: string }

export const diaDelMes = (mes: string) => mes + '-01'
export const nombreMes = (mes: string) => new Date(mes + '-15T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

/** La semana del plan que contiene `hoy`; si no hay ninguna, la más cercana. */
export function semanaDe(plan: Plan, hoy: string): number {
  const s = plan.semanas
  if (!s.length) return -1
  const i = s.findIndex((x) => x.desde <= hoy && hoy <= x.hasta)
  if (i >= 0) return i
  return hoy < s[0].desde ? 0 : s.length - 1
}

export const nombreArea = (plan: Plan | undefined, id?: string) =>
  (id ? plan?.areas?.find((a) => a.id === id)?.nombre ?? plan?.mantenimiento?.find((m) => m.id === id)?.nombre ?? id : '')

export type Grupo = { id: string; nombre: string; activa: boolean; acciones: Accion[] }
/**
 * Las acciones de una semana agrupadas por área: primero las áreas activas (aunque no tengan
 * acciones esa semana), después las de mantenimiento y las demás que tengan alguna, y al final
 * las acciones sin área.
 */
export function porArea(plan: Plan, acciones: Accion[]): Grupo[] {
  const out: Grupo[] = (plan.areas ?? []).map((a) => ({ id: a.id, nombre: a.nombre, activa: true, acciones: [] }))
  for (const m of plan.mantenimiento ?? []) if (m.id) out.push({ id: m.id, nombre: m.nombre, activa: false, acciones: [] })
  const sin: Grupo = { id: '', nombre: 'Sin área', activa: false, acciones: [] }
  for (const a of acciones) {
    let g = a.area ? out.find((x) => x.id === a.area) : sin
    if (!g) { g = { id: a.area!, nombre: a.area!, activa: false, acciones: [] }; out.push(g) }
    g.acciones.push(a)
  }
  return [...out.filter((g) => g.activa || g.acciones.length), ...(sin.acciones.length ? [sin] : [])]
}

export function recuento(plan: Plan | undefined, marcas: VidaMes['marcas']) {
  let total = 0, si = 0, media = 0, no = 0
  for (const s of plan?.semanas ?? []) for (const a of s.acciones) {
    total++
    const e = marcas?.[a.id]?.estado
    if (e === 'si') si++; else if (e === 'media') media++; else if (e === 'no') no++
  }
  return { total, si, media, no, sinMarcar: total - si - media - no }
}

/** Texto del mes para llevar al prompt mensual de «La vida que sueño». */
export function textoMes(m: VidaMes): string {
  const p = m.plan
  if (!p) return ''
  const r = recuento(p, m.marcas)
  const out: string[] = [
    `# La vida que sueño · ${nombreMes(p.mes)}`,
    '',
    `- Acciones del mes: ${r.total} · hechas ${r.si} · a medias ${r.media} · no hechas ${r.no} · sin marcar ${r.sinMarcar}`,
    `- Logros del mes: ${logrosDelMes(m).length} (${(m.logros ?? []).length} no previstos)`,
  ]
  if (p.frase) out.push(`- Frase guía: ${p.frase}`)
  if (p.salud) out.push(`- Prioridad salud: ${p.salud}`)
  if ((p.areas ?? []).length) {
    out.push('', '## Objetivos del mes')
    for (const a of p.areas!) {
      out.push('', `### ${a.nombre}`)
      if (a.objetivo) out.push(`- Objetivo: ${a.objetivo}`)
      if (a.minimo) out.push(`- Mínimo viable: ${a.minimo}`)
      if (a.resultado) out.push(`- Resultado esperado: ${a.resultado}`)
      if (a.anual) out.push(`- Sirve al objetivo del año: ${a.anual}`)
    }
  }
  if ((p.mantenimiento ?? []).length) {
    out.push('', '## En mantenimiento', ...p.mantenimiento!.map((x) => `- ${x.nombre}${x.minimo ? ': ' + x.minimo : ''}`))
  }
  out.push('', '## Semana a semana')
  for (const s of p.semanas) {
    out.push('', `### Del ${fmtDate(s.desde)} al ${fmtDate(s.hasta)}`)
    for (const g of porArea(p, s.acciones)) for (const a of g.acciones) {
      const k = m.marcas?.[a.id]
      const estado = k ? ESTADOS[k.estado].toLowerCase() + (k.dia ? ` (${fmtDate(k.dia)})` : '') : 'sin marcar'
      const quitada = (m.quitadas ?? []).includes(a.id) ? ' · quitada de pendientes' : ''
      out.push(`- [${estado}] ${a.texto}${a.area ? ' · ' + nombreArea(p, a.area) : ''}${a.dia ? ' · previsto ' + fmtDate(a.dia) : ''}${quitada}${k?.nota?.trim() ? ' — ' + k.nota.trim() : ''}`)
    }
  }
  out.push('', '## Logros del mes')
  const ls = logrosDelMes(m)
  if (ls.length) {
    for (const l of ls) out.push(`- ${fmtDate(l.dia)}${l.area ? ' · ' + nombreArea(p, l.area) : ''}: ${l.texto}${l.previsto ? '' : ' (no previsto)'}`)
  } else out.push('- Sin logros todavía.')
  return out.join('\n') + '\n'
}

export type LogroVisto = { texto: string; area?: string; dia: string; previsto: boolean; indice?: number }
/**
 * Los logros del mes: las acciones del plan marcadas como hechas y lo que se ha apuntado
 * sin estar previsto, por fecha.
 */
export function logrosDelMes(m: VidaMes): LogroVisto[] {
  const out: LogroVisto[] = []
  for (const s of m.plan?.semanas ?? []) for (const a of s.acciones) {
    const k = m.marcas?.[a.id]
    if (k?.estado === 'si') out.push({ texto: a.texto, area: a.area, dia: k.dia ?? a.dia ?? s.desde, previsto: true })
  }
  ;(m.logros ?? []).forEach((l, i) => out.push({ ...l, previsto: false, indice: i }))
  return out.sort((x, y) => x.dia.localeCompare(y.dia))
}

const esObj = (x: unknown): x is { [k: string]: Json } => typeof x === 'object' && x !== null && !Array.isArray(x)
const txt = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : undefined)
const fecha = (x: unknown) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : undefined)
const limpio = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

/** Lee el plan que devuelve el prompt mensual: `{"vida":{mes, frase?, salud?, areas?, mantenimiento?, semanas}}`. `null` si no vale. */
export function leerPlan(texto: string): Plan | null {
  let x: unknown
  try { x = JSON.parse(texto) } catch { return null }
  const v = esObj(x) ? x.vida : null
  if (!esObj(v) || typeof v.mes !== 'string' || !/^\d{4}-\d{2}$/.test(v.mes) || !Array.isArray(v.semanas)) return null
  const usados = new Set<string>()
  const semanas: Semana[] = v.semanas.filter(esObj).map((s, i) => ({
    desde: fecha(s.desde) ?? '', hasta: fecha(s.hasta) ?? '',
    acciones: (Array.isArray(s.acciones) ? s.acciones : []).filter(esObj).map((a, j) => {
      let id = txt(a.id) ?? `s${i + 1}a${j + 1}`
      while (usados.has(id)) id += '_'
      usados.add(id)
      return limpio({ id, texto: txt(a.texto) ?? '', area: txt(a.area), dia: fecha(a.dia) })
    }).filter((a) => a.texto),
  })).filter((s) => s.desde && s.hasta && s.desde <= s.hasta)
  if (!semanas.length) return null
  return limpio({
    mes: v.mes, frase: txt(v.frase), salud: txt(v.salud), semanas,
    areas: Array.isArray(v.areas)
      ? v.areas.filter(esObj).map((a) => limpio({ id: txt(a.id) ?? '', nombre: txt(a.nombre) ?? '', objetivo: txt(a.objetivo), minimo: txt(a.minimo), resultado: txt(a.resultado), anual: txt(a.anual) })).filter((a) => a.id && a.nombre)
      : undefined,
    mantenimiento: Array.isArray(v.mantenimiento)
      ? v.mantenimiento.filter(esObj).map((a) => limpio({ id: txt(a.id), nombre: txt(a.nombre) ?? '', minimo: txt(a.minimo) })).filter((a) => a.nombre)
      : undefined,
  })
}

/** Acción pendiente de una semana anterior que se arrastra a la semana en curso. */
export type Arrastrada = Accion & { origen: string }
/**
 * Lo que no se hizo en las semanas anteriores a la `i`: todo lo que no está marcado como hecho
 * y no se ha quitado de pendientes. Lo que se marca como hecho durante la semana `i` sigue a la vista.
 */
export function arrastradas(m: VidaMes, i: number): Arrastrada[] {
  const out: Arrastrada[] = []
  const quitadas = new Set(m.quitadas ?? [])
  const desde = m.plan?.semanas[i]?.desde ?? ''
  ;(m.plan?.semanas ?? []).slice(0, Math.max(0, i)).forEach((s) => {
    for (const a of s.acciones) {
      const k = m.marcas?.[a.id]
      // Las que se terminan esta semana siguen a la vista hasta que acabe.
      const sigue = k?.estado !== 'si' || (k.dia ?? '') >= desde
      if (sigue && !quitadas.has(a.id)) out.push({ ...a, origen: s.desde })
    }
  })
  return out
}

/** Lo hecho de cada área en el mes, para «Objetivos del mes». */
export function hechasPorArea(m: VidaMes): { [area: string]: { texto: string; dia: string }[] } {
  const out: { [area: string]: { texto: string; dia: string }[] } = {}
  for (const s of m.plan?.semanas ?? []) for (const a of s.acciones) {
    const k = m.marcas?.[a.id]
    if (k?.estado === 'si') (out[a.area ?? ''] ??= []).push({ texto: a.texto, dia: k.dia ?? a.dia ?? s.desde })
  }
  for (const l of Object.values(out)) l.sort((x, y) => x.dia.localeCompare(y.dia))
  return out
}

/**
 * Une un plan nuevo con el que ya hay para el mismo mes: las semanas que llegan sustituyen a las
 * que tienen la misma fecha de inicio y las demás se conservan. Así se puede cargar el mes entero
 * o solo la semana siguiente. La frase, la salud y las áreas se actualizan si llegan.
 */
export function unirPlan(actual: Plan | undefined, nuevo: Plan): Plan {
  if (!actual || actual.mes !== nuevo.mes) return nuevo
  const nuevas = new Set(nuevo.semanas.map((s) => s.desde))
  return {
    ...actual,
    ...(nuevo.frase ? { frase: nuevo.frase } : {}),
    ...(nuevo.salud ? { salud: nuevo.salud } : {}),
    ...(nuevo.areas ? { areas: nuevo.areas } : {}),
    ...(nuevo.mantenimiento ? { mantenimiento: nuevo.mantenimiento } : {}),
    semanas: [...actual.semanas.filter((s) => !nuevas.has(s.desde)), ...nuevo.semanas].sort((a, b) => a.desde.localeCompare(b.desde)),
  }
}

/**
 * Cumplimiento de cada área en el mes: de las acciones de las semanas ya empezadas (sin contar las
 * quitadas de pendientes), cuántas están hechas. A medias cuenta como media.
 */
export function cumplimientoPorArea(m: VidaMes, hoy: string): { [area: string]: { hechas: number; total: number; pct: number } } {
  const out: { [area: string]: { hechas: number; total: number; pct: number } } = {}
  const quitadas = new Set(m.quitadas ?? [])
  for (const s of m.plan?.semanas ?? []) {
    if (s.desde > hoy) continue
    for (const a of s.acciones) {
      if (quitadas.has(a.id)) continue
      const c = (out[a.area ?? ''] ??= { hechas: 0, total: 0, pct: 0 })
      c.total++
      const e = m.marcas?.[a.id]?.estado
      c.hechas += e === 'si' ? 1 : e === 'media' ? 0.5 : 0
    }
  }
  for (const c of Object.values(out)) c.pct = c.total ? Math.round((c.hechas / c.total) * 100) : 0
  return out
}
