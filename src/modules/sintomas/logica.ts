/** Signos y síntomas: forma de los datos y cálculos. En el código solo van grupos neutros de
 *  partida; los grupos y opciones propios de cada usuaria viven en sus ajustes. */

export type Opcion = { id: string; nombre: string }
/** 'una': se elige una opción · 'varias': las que hagan falta · 'episodio': sí/no, intensidad e ingreso. */
export type TipoGrupo = 'una' | 'varias' | 'episodio'
export type Grupo = {
  id: string
  nombre: string
  tipo: TipoGrupo
  opciones?: Opcion[]
  /** En grupos 'varias': la primera opción significa «nada» y quita las demás. */
  neutra?: boolean
}
export type SintCfg = { grupos?: Grupo[] }

export type Episodio = { hubo?: boolean | null; intensidad?: number | null; ingreso?: boolean | null }
export type SintDia = {
  /** Opciones marcadas de cada grupo, por id. */
  sel?: { [grupo: string]: string[] }
  epi?: { [grupo: string]: Episodio }
  /** Hambre de 0 a 10. */
  hambre?: number | null
  sin_hambre?: boolean | null
  /** Número de deposiciones (0 = ninguna) y tipo de Bristol de cada una. */
  heces_n?: number | null
  heces?: (number | null)[]
  micciones?: number | null
  /** Color de la orina, de 1 (transparente) a 6 (marrón o rojizo). */
  orina_color?: number | null
  orina_olor?: boolean | null
  /** Temperatura basal en °C. */
  temperatura?: number | null
}

const op = (...nombres: string[]): Opcion[] => nombres.map((n) => ({ id: slug(n), nombre: n }))
export function slug(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x'
}
/** Id nuevo a partir de un nombre, sin repetir ninguno de `usados`. */
export function idLibre(nombre: string, usados: string[]) {
  const base = slug(nombre)
  let id = base
  for (let i = 2; usados.includes(id); i++) id = base + '_' + i
  return id
}

/** Grupos de partida, mientras la usuaria no guarde los suyos. */
export const GRUPOS_BASE: Grupo[] = [
  { id: 'dolor', nombre: 'Dolor', tipo: 'varias', neutra: true, opciones: op('Sin dolor', 'Cólicos', 'Ovulación', 'Sensibilidad en los senos', 'Cabeza', 'Lumbares') },
  { id: 'energia', nombre: 'Energía', tipo: 'una', opciones: op('Agotamiento', 'Cansancio', 'Ni fu ni fa', 'Ok', 'Enérgica', 'Alto rendimiento') },
  { id: 'secrecion', nombre: 'Secreción', tipo: 'una', opciones: op('Ninguna', 'Pegajosa', 'Cremosa', 'Clara de huevo', 'Atípica') },
  { id: 'piel', nombre: 'Piel', tipo: 'varias', neutra: true, opciones: op('Buena', 'Acné', 'Seca', 'Grasa', 'Con comezón') },
  { id: 'cabello', nombre: 'Cabello', tipo: 'varias', neutra: true, opciones: op('Normal', 'Bonito', 'Seco', 'Encrespado', 'Con caída', 'Cuero cabelludo graso', 'Cuero cabelludo seco') },
  { id: 'digestion', nombre: 'Digestión', tipo: 'varias', neutra: true, opciones: op('Ok', 'Dolor de estómago', 'Náuseas', 'Hinchazón', 'Gases') },
]
export const gruposDe = (c: SintCfg | null) => c?.grupos ?? GRUPOS_BASE

/** Marca o desmarca una opción respetando el tipo del grupo y su opción neutra. */
export function alternar(g: Grupo, actuales: string[], id: string): string[] {
  if (actuales.includes(id)) return actuales.filter((x) => x !== id)
  if (g.tipo === 'una') return [id]
  const neutra = g.neutra ? g.opciones?.[0]?.id : undefined
  if (id === neutra) return [id]
  return [...actuales.filter((x) => x !== neutra), id]
}

export const BRISTOL = ['', 'Bolas duras separadas (estreñimiento)', 'Salchicha grumosa', 'Salchicha con grietas', 'Salchicha lisa y blanda (ideal)', 'Trozos blandos con bordes definidos', 'Pastosa, bordes irregulares', 'Líquida, sin trozos (diarrea)']
export const ORINA_COLORES = ['#f7f6ee', '#f6efb8', '#f1df6e', '#e6c53a', '#c9962a', '#9c4a24']
export const ORINA_NOMBRES = ['Transparente', 'Muy claro', 'Amarillo', 'Amarillo oscuro', 'Ámbar', 'Marrón / rojizo']

/** Un grupo cuenta para el registro del día si pide respuesta siempre: se elige una opción,
 *  tiene opción «nada» o es un episodio (sí o no). Los demás solo se marcan si pasa algo. */
export const pideRespuesta = (g: Grupo) => g.tipo !== 'varias' || !!g.neutra

/** Apartados respondidos sobre los que piden respuesta cada día. */
export function cumplimiento(grupos: Grupo[], d: SintDia) {
  const partes: [string, boolean][] = grupos.filter(pideRespuesta).map((g) => [
    g.nombre,
    g.tipo === 'episodio' ? d.epi?.[g.id]?.hubo != null : (d.sel?.[g.id]?.length ?? 0) > 0,
  ])
  partes.push(['Hambre', d.hambre != null || !!d.sin_hambre], ['Heces', d.heces_n != null], ['Micciones', d.micciones != null || d.orina_color != null])
  const hechos = partes.filter(([, ok]) => ok).length
  return { hechos, total: partes.length, faltan: partes.filter(([, ok]) => !ok).map(([n]) => n), pct: partes.length ? hechos / partes.length : 0 }
}
export const nivel = (pct: number) => (pct >= 0.9 ? 'verde' : pct >= 0.5 ? 'amarillo' : 'rojo') as 'verde' | 'amarillo' | 'rojo'

/** Comprueba una configuración pegada a mano y la deja limpia. `null` si no vale. */
export function leerGrupos(texto: string): Grupo[] | null {
  let x: unknown
  try { x = JSON.parse(texto) } catch { return null }
  const lista = Array.isArray(x) ? x : (x as { grupos?: unknown } | null)?.grupos
  if (!Array.isArray(lista) || !lista.length) return null
  const out: Grupo[] = []
  for (const g of lista as { id?: unknown; nombre?: unknown; tipo?: unknown; neutra?: unknown; opciones?: unknown }[]) {
    if (!g || typeof g.nombre !== 'string' || !g.nombre.trim()) return null
    const tipo: TipoGrupo = g.tipo === 'una' || g.tipo === 'episodio' ? g.tipo : 'varias'
    const id = typeof g.id === 'string' && g.id ? g.id : idLibre(g.nombre, out.map((o) => o.id))
    if (out.some((o) => o.id === id)) return null
    const opciones: Opcion[] = []
    for (const o of Array.isArray(g.opciones) ? (g.opciones as unknown[]) : []) {
      const nombre = typeof o === 'string' ? o : (o as { nombre?: unknown } | null)?.nombre
      if (typeof nombre !== 'string' || !nombre.trim()) return null
      const oid = typeof o === 'object' && o && typeof (o as { id?: unknown }).id === 'string' ? (o as { id: string }).id : idLibre(nombre, opciones.map((p) => p.id))
      opciones.push({ id: oid, nombre: nombre.trim() })
    }
    if (tipo !== 'episodio' && !opciones.length) return null
    out.push({ id, nombre: g.nombre.trim(), tipo, ...(tipo !== 'episodio' ? { opciones } : {}), ...(tipo === 'varias' && g.neutra ? { neutra: true } : {}) })
  }
  return out
}
