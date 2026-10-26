import { useEffect, useState } from 'react'
import { listAllEntries, removeEntry, saveEntry } from '../../store/repo'
import type { Entry } from '../../store/types'

/**
 * Lo que pruebo: cambios que se aplican para intentar prevenir los episodios (un suero nuevo, mover un
 * suplemento de la comida a la cena…), con su fecha, y después cómo fueron. Cada uno es un registro suelto del
 * módulo `cambios`; el día del registro es el día en que empezó. Sin datos en el código.
 */
export type Accion = 'empiezo' | 'cambio' | 'dejo'
export type Valoracion = 'ayuda' | 'dudoso' | 'no'
export interface Cambio {
  id?: string
  /** Día en que empezó (AAAA-MM-DD). */
  dia: string
  accion: Accion
  /** Qué: «Suero de ácido lipoico», «PEA». */
  que: string
  /** Cómo o cuándo: «de la comida a la cena», «en la semana crítica». */
  detalle?: string | null
  area: string
  /** Para qué se prueba. */
  para?: string | null
  valoracion?: Valoracion | null
  nota?: string | null
}

export const ACCIONES: [Accion, string][] = [['empiezo', 'Empiezo'], ['cambio', 'Cambio'], ['dejo', 'Dejo']]
export const AREAS = ['Suplementos', 'Terapia endovenosa', 'Nutrición', 'Hidratación', 'Ejercicio', 'Sueño', 'Biohacking', 'Medicación', 'Otro']
export const VALORACIONES: [Valoracion, string][] = [['ayuda', 'Me ayuda'], ['dudoso', 'No lo tengo claro'], ['no', 'No noto nada']]
export const PARA_POR_DEFECTO = 'Prevenir disautonomías'

const MODULO = 'cambios'
const deFila = (e: Entry): Cambio => {
  const v = e.value as { [k: string]: string | null | undefined }
  const acc = v.accion === 'cambio' || v.accion === 'dejo' ? v.accion : 'empiezo'
  const val = v.valoracion === 'ayuda' || v.valoracion === 'dudoso' || v.valoracion === 'no' ? v.valoracion : null
  return { id: e.id, dia: e.day, accion: acc, que: v.que ?? '', detalle: v.detalle ?? null, area: v.area ?? 'Otro', para: v.para ?? null, valoracion: val, nota: v.nota ?? null }
}

let cache: Cambio[] | null = null
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

export async function guardarCambio(c: Cambio): Promise<void> {
  const fila = await saveEntry({
    ...(c.id ? { id: c.id } : {}), module: MODULO, day: c.dia,
    value: {
      accion: c.accion, que: c.que.trim(), detalle: c.detalle?.trim() || null, area: c.area,
      para: c.para?.trim() || null, valoracion: c.valoracion ?? null, nota: c.nota?.trim() || null,
    },
  })
  const nuevo = deFila(fila)
  cache = [...(cache ?? []).filter((x) => x.id !== nuevo.id), nuevo]
  avisar()
}

export async function borrarCambio(id: string): Promise<void> {
  await removeEntry(id)
  cache = (cache ?? []).filter((x) => x.id !== id)
  avisar()
}

export function useCambios(): { lista: Cambio[] | null; error: string | null } {
  const [, pintar] = useState(0)
  useEffect(() => {
    const f = () => pintar((n) => n + 1)
    subs.add(f)
    if (!cache) void cargar()
    return () => { subs.delete(f) }
  }, [])
  return { lista: cache, error: fallo }
}
