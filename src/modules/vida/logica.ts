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
export type VidaMes = { plan?: Plan; marcas?: { [accion: string]: Marca }; logros?: Logro[] }
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
    `- Logros apuntados: ${(m.logros ?? []).length}`,
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
      out.push(`- [${estado}] ${a.texto}${a.area ? ' · ' + nombreArea(p, a.area) : ''}${a.dia ? ' · previsto ' + fmtDate(a.dia) : ''}${k?.nota?.trim() ? ' — ' + k.nota.trim() : ''}`)
    }
  }
  out.push('', '## Logros')
  if ((m.logros ?? []).length) {
    for (const l of m.logros!) out.push(`- ${fmtDate(l.dia)}${l.area ? ' · ' + nombreArea(p, l.area) : ''}: ${l.texto}`)
  } else out.push('- Sin logros apuntados.')
  return out.join('\n') + '\n'
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
