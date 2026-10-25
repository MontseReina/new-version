import { addDays, weekStart } from '../../lib/dates'

/**
 * Biohacking: la rutina de autocuidado por bloques (activación del nervio vago, estiramientos,
 * meditación, autocuidado…) y las prácticas de días concretos (sales, cataplasma…).
 * La rutina vive en los ajustes de la usuaria (`biohacking.bloques`), nunca en el código.
 * Cada práctica se marca con los tres toques de Huma: ✓ hecho · ✗ no hecho · NP no precisa.
 */

export type Momento = 'manana' | 'mediodia' | 'tarde' | 'noche'
export type Marca = 'si' | 'no' | 'np'

export type Practica = {
  id: string
  nombre: string
  /** Indicación corta debajo del nombre (respiración, apoyo, cuándo hacerlo…). */
  nota?: string
  /** Es un subtítulo dentro del bloque, no una práctica que se marque. */
  sep?: boolean
}

export type Bloque = {
  id: string
  nombre: string
  /** Duración aproximada del bloque, para el temporizador. */
  minutos?: number
  momento?: Momento
  /** Días de la semana en que toca (0 = lunes … 6 = domingo). Vacío o sin poner = todos los días. */
  dias?: number[]
  ico?: string
  nota?: string
  practicas: Practica[]
}

export type BioCfg = { bloques?: Bloque[] }
export type BioDia = { marcas?: { [practica: string]: Marca } }

export const MOMENTOS: [Momento, string][] = [
  ['manana', 'Mañana'],
  ['mediodia', 'Mediodía'],
  ['tarde', 'Tarde'],
  ['noche', 'Noche'],
]
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
/** Iconos que se pueden elegir para un bloque (se dibujan en Biohacking.tsx). */
export const ICONOS = ['vago', 'estira', 'luz', 'sol', 'piel', 'boca', 'sales', 'ricino', 'otro'] as const

/** Día de la semana con el lunes como 0. */
export const diaSemana = (fecha: string) => (new Date(fecha + 'T12:00:00').getDay() + 6) % 7
export const semanaDe = (fecha: string) => { const l = weekStart(fecha); return Array.from({ length: 7 }, (_, i) => addDays(l, i)) }

export const tocaHoy = (b: Bloque, fecha: string) => !b.dias?.length || b.dias.includes(diaSemana(fecha))
export const bloquesDel = (cfg: BioCfg | null, fecha: string) => (cfg?.bloques ?? []).filter((b) => tocaHoy(b, fecha))
export const otrosDias = (cfg: BioCfg | null, fecha: string) => (cfg?.bloques ?? []).filter((b) => !tocaHoy(b, fecha))
export const marcables = (b: Bloque) => b.practicas.filter((p) => !p.sep && p.nombre.trim())

/** «martes y jueves», «sábados», «todos los días». */
export function diasTxt(dias?: number[]): string {
  if (!dias?.length || dias.length === 7) return 'todos los días'
  const n = [...dias].sort((a, b) => a - b).map((d) => DIAS_LARGOS[d])
  if (n.length === 1) return n[0] === 'sábado' || n[0] === 'domingo' ? n[0] + 's' : 'los ' + n[0]
  return n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1]
}

export interface EstadoBloque { total: number; si: number; no: number; np: number; marcadas: number }
export function estadoBloque(b: Bloque, marcas: BioDia['marcas'] = {}): EstadoBloque {
  const ps = marcables(b)
  const si = ps.filter((p) => marcas[p.id] === 'si').length
  const no = ps.filter((p) => marcas[p.id] === 'no').length
  const np = ps.filter((p) => marcas[p.id] === 'np').length
  return { total: ps.length, si, no, np, marcadas: si + no + np }
}

/** Distintivo de la tarjeta: ✓ si todo está hecho (o no precisa), NP si todo es «no precisa». */
export function distintivo(e: EstadoBloque): { txt: string; ok: boolean } {
  if (!e.total) return { txt: '—', ok: false }
  if (e.np === e.total) return { txt: 'NP', ok: true }
  if (e.si + e.np === e.total) return { txt: '✓', ok: true }
  if (!e.marcadas) return { txt: 'Falta', ok: false }
  return { txt: `${e.si}/${e.total - e.np}`, ok: false }
}

export type Nivel = 'completo' | 'parcial' | 'nada' | 'sin'
/** Cumplimiento del día: lo hecho más lo que no precisaba, sobre todo lo que tocaba. */
export function nivelDia(cfg: BioCfg | null, fecha: string, dia: BioDia | undefined): { nivel: Nivel; pct: number } {
  const bs = bloquesDel(cfg, fecha)
  let total = 0, hechas = 0
  for (const b of bs) {
    const e = estadoBloque(b, dia?.marcas)
    total += e.total
    hechas += e.si + e.np
  }
  if (!total) return { nivel: 'sin', pct: 0 }
  const pct = Math.round((hechas / total) * 100)
  return { nivel: pct >= 100 ? 'completo' : pct > 0 ? 'parcial' : 'nada', pct }
}

export const minutosTotales = (bs: Bloque[]) => bs.reduce((a, b) => a + (b.minutos ?? 0), 0)

/** Agrupa los bloques del día por momento, en orden; los que no tienen momento van al final. */
export function porMomento(bs: Bloque[]): { titulo: string; bloques: Bloque[] }[] {
  const grupos = MOMENTOS.map(([k, t]) => ({ titulo: t, bloques: bs.filter((b) => b.momento === k) }))
  grupos.push({ titulo: 'En cualquier momento', bloques: bs.filter((b) => !b.momento) })
  return grupos.filter((g) => g.bloques.length)
}

/** Lee una rutina (texto JSON) y la deja con la forma correcta; null si no sirve. */
export function leerRutina(texto: string): Bloque[] | null {
  try {
    const j = JSON.parse(texto) as { bloques?: unknown } | unknown[]
    const lista = Array.isArray(j) ? j : (j as { bloques?: unknown }).bloques
    if (!Array.isArray(lista)) return null
    const ok = lista.filter((b): b is Bloque => !!b && typeof (b as Bloque).id === 'string' && typeof (b as Bloque).nombre === 'string' && Array.isArray((b as Bloque).practicas))
    return ok.length ? ok : null
  } catch { return null }
}
