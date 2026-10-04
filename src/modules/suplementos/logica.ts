/** Suplementos: forma de los datos y cálculos. La lista de cada usuaria vive en sus ajustes
 *  (base de datos), nunca en el código. */
import { diffDays } from '../../lib/dates'

export const MOMENTOS = [
  ['ayunas', 'Ayunas'],
  ['desayuno', 'Desayuno'],
  ['media_manana', 'Media mañana'],
  ['comida', 'Comida'],
  ['media_tarde', 'Media tarde'],
  ['cena', 'Cena'],
  ['noche', 'Después de cenar'],
] as const

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
export const VIAS = ['Oral', 'Sublingual', 'Tópica', 'Endovenosa', 'Intramuscular', 'Otra'] as const

export type Producto = {
  id: string
  nombre: string
  marca?: string
  composicion?: string
  dosis?: string
  pautado_por?: string
  nota?: string
  /** Momentos del día en que se toma. Vacío junto con `cada_dias` = toma periódica. */
  momentos?: string[]
  /** Días de la semana (0 = lunes … 6 = domingo). Vacío = todos. */
  dias?: number[]
  via?: string
  inicio?: string
  /** Si no es diario: cada cuántos días toca. */
  cada_dias?: number
  /** Fecha desde la que deja de aparecer. No se borra: el historial se conserva. */
  retirado?: string
}
export type SuplCfg = { lista?: Producto[] }

export type Toma = 'si' | 'no' | 'np'
/** Claves: `<id>:<momento>` para las tomas del día, `<id>` para las periódicas. */
export type SuplDia = { tomas?: { [clave: string]: Toma } }

const diaSemana = (date: string) => (new Date(date + 'T12:00:00').getDay() + 6) % 7

export const vigente = (p: Producto, date: string) => (!p.retirado || date < p.retirado) && (!p.inicio || date >= p.inicio)
export const esPeriodico = (p: Producto) => !!p.cada_dias
/** Productos con tomas pautadas ese día. */
export const delDia = (l: Producto[], date: string) =>
  l.filter((p) => vigente(p, date) && !esPeriodico(p) && (!p.dias?.length || p.dias.includes(diaSemana(date))))
export const periodicos = (l: Producto[], date: string) => l.filter((p) => vigente(p, date) && esPeriodico(p))

export const clave = (p: Producto, momento: string) => p.id + ':' + momento
/** Sin momentos marcados se trata como una sola toma «a demanda». */
export const momentosDe = (p: Producto) => (p.momentos?.length ? p.momentos : ['demanda'])

/** Hechas sobre pautadas; las «no precisa» no cuentan como pautadas. */
export function cumplimiento(lista: Producto[], d: SuplDia, date: string) {
  const t = d.tomas ?? {}
  const claves = delDia(lista, date).flatMap((p) => momentosDe(p).map((m) => clave(p, m)))
  const pautadas = claves.filter((k) => t[k] !== 'np').length
  const hechas = claves.filter((k) => t[k] === 'si').length
  const marcadas = claves.filter((k) => t[k]).length
  return { pautadas, hechas, marcadas, total: claves.length, pct: pautadas ? hechas / pautadas : 0 }
}
export const nivel = (pct: number) => (pct >= 0.9 ? 'verde' : pct >= 0.6 ? 'amarillo' : 'rojo') as 'verde' | 'amarillo' | 'rojo'
export const diasDesde = (date: string, ultima: string | null) => (ultima ? diffDays(date, ultima) : null)
