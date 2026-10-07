import { useEffect, useState } from 'react'
import { todayStr } from '../../lib/dates'
import { listAllEntries, removeEntry, saveEntry } from '../../store/repo'
import type { Entry } from '../../store/types'

/**
 * Preguntas a los especialistas. Cada una es un registro suelto del módulo `preguntas`.
 * La lista de especialistas de cada usuaria vive en sus ajustes (sección `preguntas`), no en el código.
 */
export interface Pregunta {
  id?: string
  /** Día en que se apuntó (AAAA-MM-DD). */
  dia: string
  especialista: string
  texto: string
  /** Área o pilar con el que tiene que ver. */
  pilar?: string | null
  estado: 'pendiente' | 'respondida'
  respuesta?: string | null
  /** Día en que se anotó la respuesta. */
  respondida_el?: string | null
}
export type PregCfg = { especialistas?: string[] }

const MODULO = 'preguntas'
const deFila = (e: Entry): Pregunta => {
  const v = e.value as { [k: string]: string | null | undefined }
  return {
    id: e.id, dia: e.day, especialista: v.especialista ?? '', texto: v.texto ?? '', pilar: v.pilar ?? null,
    estado: v.estado === 'respondida' ? 'respondida' : 'pendiente', respuesta: v.respuesta ?? null, respondida_el: v.respondida_el ?? null,
  }
}

// Una sola copia en memoria para toda la app.
let cache: Pregunta[] | null = null
let cargando: Promise<void> | null = null
let fallo: string | null = null
const subs = new Set<() => void>()
const avisar = () => subs.forEach((f) => f())

function cargar() {
  cargando ??= listAllEntries(MODULO).then(
    (rows) => { cache = rows.map(deFila); fallo = null; avisar() },
    (e: Error) => { cargando = null; fallo = e.message; avisar() },
  )
  return cargando
}

export async function guardarPregunta(p: Pregunta): Promise<void> {
  const fila = await saveEntry({
    ...(p.id ? { id: p.id } : {}), module: MODULO, day: p.dia,
    value: {
      especialista: p.especialista, texto: p.texto.trim(), pilar: p.pilar || null, estado: p.estado,
      respuesta: p.respuesta?.trim() || null, respondida_el: p.respondida_el ?? null,
    },
  })
  const nueva = deFila(fila)
  cache = [...(cache ?? []).filter((x) => x.id !== nueva.id), nueva]
  avisar()
}
export async function borrarPregunta(id: string): Promise<void> {
  await removeEntry(id)
  cache = (cache ?? []).filter((x) => x.id !== id)
  avisar()
}
export const responder = (p: Pregunta, respuesta: string) =>
  guardarPregunta({ ...p, respuesta, estado: 'respondida', respondida_el: todayStr() })
export const reabrir = (p: Pregunta) => guardarPregunta({ ...p, estado: 'pendiente' })

/** Pasa todas las preguntas de un especialista a otro nombre (al renombrarlo). */
export async function renombrarEspecialista(antes: string, ahora: string): Promise<void> {
  for (const p of (cache ?? []).filter((x) => x.especialista === antes)) await guardarPregunta({ ...p, especialista: ahora })
}

/** Por orden de alta: la más antigua, arriba. */
const porAlta = (a: Pregunta, b: Pregunta) => a.dia.localeCompare(b.dia) || (a.id ?? '').localeCompare(b.id ?? '')
export const pendientesDe = (l: Pregunta[], esp?: string) =>
  l.filter((p) => p.estado === 'pendiente' && (!esp || p.especialista === esp)).sort(porAlta)
export const respondidasDe = (l: Pregunta[], esp?: string) =>
  l.filter((p) => p.estado === 'respondida' && (!esp || p.especialista === esp))
    .sort((a, b) => (b.respondida_el ?? '').localeCompare(a.respondida_el ?? '') || porAlta(a, b))

/** Lista de preguntas. `null` mientras carga. */
export function usePreguntas(): { lista: Pregunta[] | null; error: string | null } {
  const [, pintar] = useState(0)
  useEffect(() => {
    const f = () => pintar((n) => n + 1)
    subs.add(f)
    if (!cache) void cargar()
    return () => { subs.delete(f) }
  }, [])
  return { lista: cache, error: fallo }
}
