import { todayStr } from '../lib/dates'
import { getDaily, saveDaily } from './repo'
import type { Json } from './types'

type Obj = { [k: string]: Json }
export interface Registro { modulo: string; dia: string; valor: Obj }

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
  let n = 0
  for (const r of registros) {
    const actual = await getDaily<Obj>(r.modulo, r.dia)
    await saveDaily(r.modulo, r.dia, fusionar(actual ?? {}, r.valor) as Obj)
    avance?.(++n)
  }
  return n
}
