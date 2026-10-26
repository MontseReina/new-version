/** Trabajo introspectivo: forma de los datos y cálculos. Los bloques, los ejercicios y los
 *  patrones de cada usuaria viven en sus ajustes (base de datos), nunca en el código. */
import { fmtDate } from '../../lib/dates'
import type { Json } from '../../store/types'

/** Palabras de una página escrita a mano; tres páginas son el diario de la mañana. */
export const PALABRAS_PAGINA = 250
export const PAGINAS = 3

/** Maneras de expresar un agradecimiento a la persona. */
export const EXPRESIONES = [
  ['dicho', 'Se lo he dicho'],
  ['beso', 'Un beso o un abrazo'],
  ['mensaje', 'Un mensaje'],
  ['llamada', 'Una llamada'],
] as const

export type Gracia = { texto?: string; como?: string[] }
/** Ejercicios hechos en el día: por id, con lo que se notó. */
export type Hecho = { nota?: string }
export type IntroDia = {
  diario?: string
  gracias?: Gracia[]
  hechos?: { [ejercicio: string]: Hecho }
}

export type Bloque = { id: string; nombre: string; sobre?: string }
export type Ejercicio = { id: string; bloque?: string; titulo: string; texto?: string }
export type Patron = { id: string; texto: string; tipo?: string; veces?: number; de?: number; ejercicio?: string }
/** Objetivo semanal de cada hábito. 0 = sin objetivo esa semana. */
export type Metas = { diario?: number; gracias?: number; expresadas?: number; ejercicio?: number }
export type IntroCfg = {
  metas?: Metas
  bloques?: Bloque[]
  ejercicios?: Ejercicio[]
  /** Ejercicio que se está trabajando ahora: uno cada vez. */
  activo?: string | null
  patrones?: Patron[]
  /** Periodo que cubren los patrones, tal como llega del informe. */
  periodo?: string
}

export const palabras = (t?: string | null) => (t?.trim() ? t.trim().split(/\s+/).length : 0)
export const paginas = (t?: string | null, porPagina = PALABRAS_PAGINA) => palabras(t) / porPagina
export const graciasDe = (d: IntroDia): Gracia[] => Array.from({ length: 3 }, (_, i) => d.gracias?.[i] ?? {})
export const escritas = (d: IntroDia) => graciasDe(d).filter((g) => g.texto?.trim()).length
export const expresadas = (d: IntroDia) => graciasDe(d).filter((g) => g.texto?.trim() && (g.como ?? []).length > 0).length
export const hechosDe = (d: IntroDia) => Object.keys(d.hechos ?? {}).length

export function ejercicioActivo(cfg: IntroCfg | null): Ejercicio | null {
  const l = cfg?.ejercicios ?? []
  return l.find((e) => e.id === cfg?.activo) ?? null
}

export const nuevoId = (texto: string, usados: string[]) => {
  const base = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'ejercicio'
  let id = base
  for (let n = 2; usados.includes(id); n++) id = base + '_' + n
  return id
}

/** Resumen de un periodo: días con diario, agradecimientos y ejercicios. */
export function resumen(dias: { day: string; value: IntroDia }[]) {
  let conDiario = 0, completos = 0, gracias = 0, dichas = 0, conEjercicio = 0
  for (const { value: d } of dias) {
    const p = paginas(d.diario)
    if (p > 0) conDiario++
    if (p >= PAGINAS) completos++
    gracias += escritas(d)
    dichas += expresadas(d)
    if (hechosDe(d)) conEjercicio++
  }
  return { conDiario, completos, gracias, dichas, conEjercicio }
}

/** Hábitos de la semana, en el orden en que se enseñan. El diario cuenta con una línea: lo mínimo cuenta como hecho. */
export const HABITOS = [
  { k: 'diario', nombre: 'Diario', unidad: 'días', max: 7, def: 4, hecho: (d: IntroDia) => (palabras(d.diario) > 0 ? 1 : 0) },
  { k: 'gracias', nombre: 'Agradecimientos', unidad: 'días', max: 7, def: 5, hecho: (d: IntroDia) => (escritas(d) > 0 ? 1 : 0) },
  { k: 'expresadas', nombre: 'Expresados', unidad: 'veces', max: 21, def: 2, hecho: (d: IntroDia) => expresadas(d) },
  { k: 'ejercicio', nombre: 'Ejercicio', unidad: 'días', max: 7, def: 4, hecho: (d: IntroDia) => (hechosDe(d) ? 1 : 0) },
] as const
export type Habito = (typeof HABITOS)[number]['k']
export const metaDe = (cfg: IntroCfg | null, k: Habito) => cfg?.metas?.[k] ?? HABITOS.find((h) => h.k === k)!.def

/** Cómo va cada objetivo en la semana: lo hecho, la meta y si se ha alcanzado. */
export function progresoSemana(cfg: IntroCfg | null, dias: IntroDia[]) {
  return HABITOS.map((h) => {
    const hecho = dias.reduce((s, d) => s + h.hecho(d), 0)
    const meta = metaDe(cfg, h.k)
    return { ...h, hecho, meta, logrado: meta > 0 && hecho >= meta }
  })
}

/**
 * Texto del periodo para llevar al informe mensual: el diario, los agradecimientos y los
 * ejercicios de cada día, con el día del ciclo si se conoce.
 */
export function textoInforme(
  desde: string, hasta: string, dias: { day: string; value: IntroDia }[], cfg: IntroCfg | null,
  ciclo: (day: string) => string | null, total: number,
): string {
  const r = resumen(dias)
  const titulo = (id: string) => (cfg?.ejercicios ?? []).find((e) => e.id === id)?.titulo ?? id
  const out: string[] = [
    `# Trabajo introspectivo · del ${desde} al ${hasta}`,
    '',
    '## Resumen',
    `- Días con diario: ${r.conDiario} de ${total} (${r.completos} con las tres páginas)`,
    `- Agradecimientos escritos: ${r.gracias} · expresados a la persona: ${r.dichas}`,
    `- Días con ejercicio hecho: ${r.conEjercicio}`,
  ]
  const activo = ejercicioActivo(cfg)
  if (activo) out.push(`- Ejercicio de ahora: ${activo.titulo}`)
  // La lista de ahora viaja con el texto, para que el informe no repita ids ni pise ejercicios.
  if ((cfg?.bloques ?? []).length) out.push('', '## Mis bloques', ...(cfg!.bloques!.map((b) => `- ${b.id}: ${b.nombre}`)))
  if ((cfg?.ejercicios ?? []).length) {
    out.push('', '## Mis ejercicios', ...(cfg!.ejercicios!.map((e) => `- ${e.id}${e.bloque ? ' (' + e.bloque + ')' : ''}: ${e.titulo}${e.id === cfg!.activo ? ' · ahora' : ''}`)))
  }
  for (const { day, value: d } of dias) {
    const c = ciclo(day)
    out.push('', `## ${day} · ${fmtDate(day)}${c ? ' · ' + c : ''}`)
    if (d.diario?.trim()) out.push('', `### Diario (${palabras(d.diario)} palabras)`, '', d.diario.trim())
    const g = graciasDe(d).filter((x) => x.texto?.trim())
    if (g.length) {
      out.push('', '### Agradecimientos')
      g.forEach((x, i) => {
        const como = (x.como ?? []).map((k) => EXPRESIONES.find((e) => e[0] === k)?.[1].toLowerCase() ?? k)
        out.push(`${i + 1}. ${x.texto!.trim()} — ${como.length ? 'expresado: ' + como.join(', ') : 'sin expresar'}`)
      })
    }
    const h = Object.entries(d.hechos ?? {})
    if (h.length) {
      out.push('', '### Ejercicio')
      for (const [id, v] of h) out.push(`- ${titulo(id)}${v.nota?.trim() ? ' — qué noté: ' + v.nota.trim() : ''}`)
    }
  }
  return out.join('\n') + '\n'
}

const esObj = (x: unknown): x is { [k: string]: Json } => typeof x === 'object' && x !== null && !Array.isArray(x)
const txt = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : undefined)

/**
 * Lee lo que devuelve el informe mensual: `{"introspeccion":{bloques?, ejercicios?, activo?, patrones?, periodo?}}`.
 * Solo trae las partes que vengan bien formadas. `null` si el texto no vale.
 */
export function leerInforme(texto: string): IntroCfg | null {
  let x: unknown
  try { x = JSON.parse(texto) } catch { return null }
  const raiz = esObj(x) ? x.introspeccion : null
  if (!esObj(raiz)) return null
  const out: IntroCfg = {}
  if (Array.isArray(raiz.bloques)) {
    out.bloques = raiz.bloques.filter(esObj).map((b) => ({ id: txt(b.id) ?? '', nombre: txt(b.nombre) ?? '', ...(txt(b.sobre) ? { sobre: txt(b.sobre) } : {}) })).filter((b) => b.id && b.nombre)
  }
  if (Array.isArray(raiz.ejercicios)) {
    out.ejercicios = raiz.ejercicios.filter(esObj)
      .map((e) => ({ id: txt(e.id) ?? '', titulo: txt(e.titulo) ?? '', ...(txt(e.bloque) ? { bloque: txt(e.bloque) } : {}), ...(txt(e.texto) ? { texto: txt(e.texto) } : {}) }))
      .filter((e) => e.id && e.titulo)
  }
  if (Array.isArray(raiz.patrones)) {
    out.patrones = raiz.patrones.filter(esObj).map((p, i) => ({
      id: txt(p.id) ?? 'p' + (i + 1), texto: txt(p.texto) ?? '',
      ...(txt(p.tipo) ? { tipo: txt(p.tipo) } : {}),
      ...(typeof p.veces === 'number' ? { veces: p.veces } : {}),
      ...(typeof p.de === 'number' ? { de: p.de } : {}),
      ...(txt(p.ejercicio) ? { ejercicio: txt(p.ejercicio) } : {}),
    })).filter((p) => p.texto)
  }
  if (txt(raiz.activo)) out.activo = txt(raiz.activo)
  if (txt(raiz.periodo)) out.periodo = txt(raiz.periodo)
  return Object.keys(out).length ? out : null
}

const porId = <T extends { id: string }>(actual: T[] | undefined, nuevo: T[]) => {
  const ids = new Set(nuevo.map((x) => x.id))
  return [...(actual ?? []).filter((x) => !ids.has(x.id)), ...nuevo]
}
/**
 * Lo que hay que guardar al cargar un informe: los patrones y el periodo se sustituyen; los
 * bloques y los ejercicios se suman a los que ya hay (el mismo id actualiza el que estaba).
 */
export function aplicarInforme(actual: IntroCfg | null, nuevo: IntroCfg): Partial<IntroCfg> {
  return {
    ...nuevo,
    ...(nuevo.bloques ? { bloques: porId(actual?.bloques, nuevo.bloques) } : {}),
    ...(nuevo.ejercicios ? { ejercicios: porId(actual?.ejercicios, nuevo.ejercicios) } : {}),
  }
}
/** Qué trae un informe, en una frase. */
export function resumenInforme(nuevo: IntroCfg): string {
  return [
    nuevo.patrones ? `lo que se repite (${nuevo.patrones.length})` : '',
    nuevo.ejercicios ? `ejercicios (${nuevo.ejercicios.length})` : '',
    nuevo.bloques ? `bloques (${nuevo.bloques.length})` : '',
    nuevo.activo ? 'el ejercicio de ahora' : '',
  ].filter(Boolean).join(', ') || 'el periodo'
}
