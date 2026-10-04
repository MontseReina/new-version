import { useEffect, useState } from 'react'
import { listAllEntries, removeEntry, saveEntry } from '../../store/repo'
import type { Entry, Json } from '../../store/types'

/** Calendario: citas y avisos con fecha. Cada evento es un registro suelto del módulo `calendario`. */
export interface Evento {
  id?: string
  titulo: string
  /** Día del evento (AAAA-MM-DD). */
  dia: string
  /** Hora de inicio (HH:MM). Sin hora = todo el día. */
  hora?: string | null
  hora_fin?: string | null
  lugar?: string | null
  notas?: string | null
  /** Identificador del evento en Google Calendar, cuando está unido. Se conserva tal cual. */
  google?: { [k: string]: Json } | null
}

const MODULO = 'calendario'
const deFila = (e: Entry): Evento => {
  const v = e.value
  const txt = (k: string) => (typeof v[k] === 'string' && v[k] ? (v[k] as string) : null)
  return {
    id: e.id, dia: e.day, notas: e.note, titulo: txt('titulo') ?? '', hora: txt('hora'), hora_fin: txt('hora_fin'), lugar: txt('lugar'),
    google: v.google && typeof v.google === 'object' && !Array.isArray(v.google) ? (v.google as { [k: string]: Json }) : null,
  }
}

// Una sola copia en memoria para toda la app: el calendario, el contador de arriba e Inicio leen de aquí.
let cache: Evento[] | null = null
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

export async function guardarEvento(ev: Evento): Promise<void> {
  const hora = ev.hora || null
  const fila = await saveEntry({
    ...(ev.id ? { id: ev.id } : {}), module: MODULO, day: ev.dia, note: ev.notas?.trim() || null,
    value: { titulo: ev.titulo.trim(), hora, hora_fin: hora ? ev.hora_fin || null : null, lugar: ev.lugar?.trim() || null, google: ev.google ?? null },
  })
  const nuevo = deFila(fila)
  cache = [...(cache ?? []).filter((x) => x.id !== nuevo.id), nuevo]
  avisar()
}
export async function borrarEvento(id: string): Promise<void> {
  await removeEntry(id)
  cache = (cache ?? []).filter((x) => x.id !== id)
  avisar()
}

/** Orden por día y hora; los de todo el día van primero. */
export const ordenar = (l: Evento[]) => [...l].sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '').localeCompare(b.hora ?? ''))
export const cuando = (ev: Evento) => (ev.hora ? ev.hora + (ev.hora_fin ? '–' + ev.hora_fin : '') : 'Todo el día')

/** Lista de eventos. `null` mientras carga. */
export function useEventos(): { lista: Evento[] | null; error: string | null } {
  const [, pintar] = useState(0)
  useEffect(() => {
    const f = () => pintar((n) => n + 1)
    subs.add(f)
    if (!cache) void cargar()
    return () => { subs.delete(f) }
  }, [])
  return { lista: cache, error: fallo }
}
