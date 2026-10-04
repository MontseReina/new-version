import { useEffect, useState } from 'react'
import { listAllEntries, removeEntry, saveEntry } from '../../store/repo'
import type { Entry } from '../../store/types'

/** Pendientes: lista corta de cosas por hacer. Cada una es un registro suelto del módulo `pendientes`. */
export type Prioridad = 'normal' | 'importante' | 'urgente'
export interface Pendiente {
  id?: string
  titulo: string
  prioridad: Prioridad
  /** Día en que se hace (AAAA-MM-DD). */
  dia: string
  /** Último día para hacerla. */
  limite?: string | null
  /** Área o pilar con el que tiene que ver. */
  area?: string | null
  notas?: string | null
  estado: 'pendiente' | 'hecho'
  hecho_el?: string | null
}

const MODULO = 'pendientes'
const deFila = (e: Entry): Pendiente => {
  const v = e.value as { [k: string]: string | null | undefined }
  return {
    id: e.id, dia: e.day, notas: e.note, titulo: v.titulo ?? '', prioridad: (v.prioridad as Prioridad) ?? 'normal',
    limite: v.limite ?? null, area: v.area ?? null, estado: v.estado === 'hecho' ? 'hecho' : 'pendiente', hecho_el: v.hecho_el ?? null,
  }
}

// Una sola copia en memoria para toda la app: la lista, el contador de arriba e Inicio leen de aquí.
let cache: Pendiente[] | null = null
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

export async function guardarPendiente(p: Pendiente): Promise<void> {
  const fila = await saveEntry({
    ...(p.id ? { id: p.id } : {}), module: MODULO, day: p.dia, note: p.notas?.trim() || null,
    value: { titulo: p.titulo.trim(), prioridad: p.prioridad, limite: p.limite || null, area: p.area || null, estado: p.estado, hecho_el: p.hecho_el ?? null },
  })
  const nuevo = deFila(fila)
  cache = [...(cache ?? []).filter((x) => x.id !== nuevo.id), nuevo]
  avisar()
}
export async function borrarPendiente(id: string): Promise<void> {
  await removeEntry(id)
  cache = (cache ?? []).filter((x) => x.id !== id)
  avisar()
}
export const marcar = (p: Pendiente, hecho: boolean) =>
  guardarPendiente({ ...p, estado: hecho ? 'hecho' : 'pendiente', hecho_el: hecho ? new Date().toISOString() : null })

const PESO = { urgente: 0, importante: 1, normal: 2 }
/** Fecha que manda para ordenar y para saber si va con retraso. */
export const fechaDe = (p: Pendiente) => (p.limite && p.limite < p.dia ? p.limite : p.dia)
export const atrasado = (p: Pendiente, hoy: string) => p.estado === 'pendiente' && (p.limite ?? p.dia) < hoy
export const porHacer = (l: Pendiente[]) =>
  l.filter((p) => p.estado === 'pendiente').sort((a, b) => PESO[a.prioridad] - PESO[b.prioridad] || fechaDe(a).localeCompare(fechaDe(b)))
export const hechos = (l: Pendiente[]) =>
  l.filter((p) => p.estado === 'hecho').sort((a, b) => (b.hecho_el ?? '').localeCompare(a.hecho_el ?? ''))

/** Lista de pendientes. `null` mientras carga. */
export function usePendientes(): { lista: Pendiente[] | null; error: string | null } {
  const [, pintar] = useState(0)
  useEffect(() => {
    const f = () => pintar((n) => n + 1)
    subs.add(f)
    if (!cache) void cargar()
    return () => { subs.delete(f) }
  }, [])
  return { lista: cache, error: fallo }
}
