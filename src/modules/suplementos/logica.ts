/** Suplementos: forma de los datos y cálculos. La lista de cada usuaria vive en sus ajustes
 *  (base de datos), nunca en el código. */

export const MOMENTOS = [
  ['ayunas', 'En ayunas'],
  ['desayuno', 'Desayuno'],
  ['comida', 'Comida'],
  ['tarde', 'Media tarde'],
  ['cena', 'Cena'],
  ['noche', 'Después de cenar'],
  ['periodico', 'Cada cierto tiempo'],
] as const
export type Momento = (typeof MOMENTOS)[number][0]

export type Suplemento = {
  id: string
  nombre: string
  momento: string
  dosis?: string
  nota?: string
  /** Solo para «cada cierto tiempo»: cada cuántos días toca. */
  cada_dias?: number
}
export type SuplCfg = { lista?: Suplemento[] }

export type Toma = 'si' | 'no' | 'np'
export type SuplDia = { tomas?: { [id: string]: Toma } }

export const diarios = (l: Suplemento[]) => l.filter((s) => s.momento !== 'periodico')
export const periodicos = (l: Suplemento[]) => l.filter((s) => s.momento === 'periodico')

/** Hechas sobre pautadas; las «no precisa» no cuentan como pautadas. */
export function cumplimiento(lista: Suplemento[], d: SuplDia) {
  const t = d.tomas ?? {}
  const ds = diarios(lista)
  const pautadas = ds.filter((s) => t[s.id] !== 'np').length
  const hechas = ds.filter((s) => t[s.id] === 'si').length
  const marcadas = ds.filter((s) => t[s.id]).length
  return { pautadas, hechas, marcadas, total: ds.length, pct: pautadas ? hechas / pautadas : 0 }
}
export const nivel = (pct: number) => (pct >= 0.9 ? 'verde' : pct >= 0.6 ? 'amarillo' : 'rojo') as 'verde' | 'amarillo' | 'rojo'
