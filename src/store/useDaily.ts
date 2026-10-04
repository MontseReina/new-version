import { useCallback, useEffect, useRef, useState } from 'react'
import { getDaily, saveDaily } from './repo'
import type { Json } from './types'

type Obj = { [k: string]: Json }
export type SaveState = 'cargando' | 'guardado' | 'guardando' | 'error'

/**
 * Documento diario de un módulo: se carga al entrar y se guarda solo, poco después de cada cambio.
 * Una sola escritura a la vez; los cambios hechos mientras se guarda salen en la siguiente.
 */
export function useDaily<T extends Obj>(module: string, day: string) {
  const [value, setValue] = useState<T>({} as T)
  const [state, setState] = useState<SaveState>('cargando')
  const [rev, setRev] = useState(0) // sube en cada guardado correcto
  const ref = useRef({ value: {} as T, day, dirty: false, saving: false, timer: 0 as number | undefined })

  const flush = useCallback(async () => {
    const r = ref.current
    if (r.saving || !r.dirty) return
    r.saving = true; r.dirty = false
    const d = r.day
    setState('guardando')
    try {
      await saveDaily(module, d, r.value)
      r.saving = false
      if (r.dirty) { void flush() } else { setState('guardado'); setRev((x) => x + 1) }
    } catch {
      r.saving = false; r.dirty = true
      setState('error')
    }
  }, [module])

  useEffect(() => {
    let alive = true
    const r = ref.current
    r.day = day; r.dirty = false; r.value = {} as T
    setValue({} as T); setState('cargando')
    getDaily<T>(module, day).then(
      (v) => { if (!alive) return; if (!r.dirty) { r.value = v ?? ({} as T); setValue(r.value) } setState(r.dirty ? 'guardando' : 'guardado') },
      () => { if (alive) setState('error') },
    )
    return () => {
      alive = false
      window.clearTimeout(r.timer)
      // Guarda lo pendiente del día que se abandona.
      if (r.dirty && !r.saving) { r.dirty = false; void saveDaily(module, day, r.value).catch(() => {}) }
    }
  }, [module, day])

  const set = useCallback((patch: Partial<T>) => {
    const r = ref.current
    r.value = { ...r.value, ...patch } as T
    r.dirty = true
    setValue(r.value)
    setState('guardando')
    window.clearTimeout(r.timer)
    r.timer = window.setTimeout(() => void flush(), 500)
  }, [flush])

  return { value, set, state, rev, retry: flush }
}
