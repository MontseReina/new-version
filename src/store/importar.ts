import { todayStr } from '../lib/dates'
import { gruposDe, slug, type Grupo, type SintCfg } from '../modules/sintomas/logica'
import { getDaily, getSettings, saveDaily } from './repo'
import type { Json } from './types'

type Obj = { [k: string]: Json }
export interface Registro { modulo: string; dia: string; valor: Obj }

/**
 * En los registros de 'sintomas', los episodios y la nota pueden ir por nombre (como se ven en la
 * app), para cargar históricos sin conocer los identificadores de cada cuenta:
 * { episodios: [{ grupo: 'Disautonomía', opcion: 'Disautonomía nocturna', hora, gravedad, urgencias }], nota: 'texto' }.
 * Se traducen a `sel`, `det` y `texto` con los grupos de la usuaria. La nota va al primer grupo de texto libre.
 */
type EpiPorNombre = { grupo?: Json; opcion?: Json; hora?: Json; gravedad?: Json; urgencias?: Json }
const mismo = (a: string, b: string) => slug(a) === slug(b)

function traducir(valor: Obj, grupos: Grupo[], faltan: Set<string>): Obj {
  const { episodios, nota, ...resto } = valor
  const out: Obj = { ...resto }
  if (Array.isArray(episodios)) {
    const sel: { [g: string]: string[] } = {}
    const det: { [g: string]: { [o: string]: Obj } } = {}
    for (const e of episodios as EpiPorNombre[]) {
      const g = grupos.find((x) => x.tipo === 'detalle' && (mismo(x.nombre, String(e.grupo)) || x.id === e.grupo))
      const o = g?.opciones?.find((x) => mismo(x.nombre, String(e.opcion)) || x.id === e.opcion)
      if (!g || !o) { faltan.add(`${String(e.grupo)} → ${String(e.opcion)}`); continue }
      sel[g.id] = [...new Set([...(sel[g.id] ?? []), o.id])]
      det[g.id] = { ...(det[g.id] ?? {}), [o.id]: { hora: e.hora ?? null, gravedad: e.gravedad ?? null, urgencias: e.urgencias ?? null } }
    }
    out.sel = sel
    out.det = det
  }
  if (typeof nota === 'string' && nota.trim()) {
    const t = grupos.find((x) => x.tipo === 'texto')
    if (t) out.texto = { [t.id]: nota.trim() }
    else faltan.add('un grupo de texto libre para las notas')
  }
  return out
}

/** Módulos cuyo documento diario se puede completar desde una importación. */
const MODULOS = ['sintomas', 'ciclo']
const esObj = (x: Json | undefined): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)

/**
 * Suma lo importado a lo que ya hay, sin pisar nada: las listas se unen, los textos libres se
 * añaden debajo y, en el resto, manda lo que ya estaba anotado.
 */
export function fusionar(actual: Json | undefined, nuevo: Json, esTexto = false): Json {
  if (actual === undefined || actual === null) return nuevo
  if (Array.isArray(actual) && Array.isArray(nuevo)) {
    const vistos = new Set(actual.map((x) => JSON.stringify(x)))
    return [...actual, ...nuevo.filter((x) => !vistos.has(JSON.stringify(x)))]
  }
  if (esObj(actual) && esObj(nuevo)) {
    const out: Obj = { ...actual }
    for (const k of Object.keys(nuevo)) out[k] = fusionar(actual[k], nuevo[k], esTexto || k === 'texto')
    return out
  }
  if (esTexto && typeof actual === 'string' && typeof nuevo === 'string') {
    return !actual.trim() ? nuevo : actual.includes(nuevo) ? actual : actual + '\n' + nuevo
  }
  return actual
}

/** Lee un texto de importación. `null` si no vale. */
export function leerRegistros(texto: string): Registro[] | null {
  let x: unknown
  try { x = JSON.parse(texto) } catch { return null }
  const lista = (x as { registros?: unknown } | null)?.registros
  if (!Array.isArray(lista) || !lista.length) return null
  const hoy = todayStr()
  for (const r of lista as Partial<Registro>[]) {
    if (!r || !MODULOS.includes(r.modulo ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(r.dia ?? '') || r.dia! > hoy || !esObj(r.valor)) return null
  }
  return lista as Registro[]
}

/** Guarda los registros uno a uno, sumándolos a lo ya anotado en cada día. Devuelve cuántos. */
export async function importar(registros: Registro[], avance?: (hechos: number) => void): Promise<number> {
  // Primero se traduce todo lo que va por nombre: si falta algún grupo u opción, no se guarda nada.
  if (registros.some((r) => r.modulo === 'sintomas' && ('episodios' in r.valor || 'nota' in r.valor))) {
    const grupos = gruposDe(((await getSettings()).sintomas ?? null) as SintCfg | null)
    const faltan = new Set<string>()
    registros = registros.map((r) => (r.modulo === 'sintomas' ? { ...r, valor: traducir(r.valor, grupos, faltan) } : r))
    if (faltan.size) throw new FaltanOpciones([...faltan])
  }
  let n = 0
  for (const r of registros) {
    const actual = await getDaily<Obj>(r.modulo, r.dia)
    await saveDaily(r.modulo, r.dia, fusionar(actual ?? {}, r.valor) as Obj)
    avance?.(++n)
  }
  return n
}

/** La importación nombra grupos u opciones que no existen en Signos y síntomas. */
export class FaltanOpciones extends Error {
  constructor(public faltan: string[]) { super('Faltan opciones: ' + faltan.join(', ')) }
}
