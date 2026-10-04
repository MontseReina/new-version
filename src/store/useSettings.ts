import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from './repo'
import type { Json } from './types'

type Obj = { [k: string]: Json }

/** Ajustes de la usuaria, compartidos por toda la app. Se cargan una vez. */
let cache: Obj | null = null
let loading: Promise<Obj> | null = null
const subs = new Set<(s: Obj) => void>()

function load(): Promise<Obj> {
  loading ??= getSettings().then((s) => { cache = s; subs.forEach((f) => f(s)); return s }, (e) => { loading = null; throw e })
  return loading
}

/** Devuelve la sección `key` de los ajustes y una función para cambiarla. `null` mientras carga. */
export function useSettings<T extends Obj>(key: string): [T | null, (patch: Partial<T>) => Promise<void>] {
  const [all, setAll] = useState<Obj | null>(cache)
  useEffect(() => {
    subs.add(setAll)
    if (!cache) load().catch(() => setAll({}))
    return () => { subs.delete(setAll) }
  }, [])
  const patch = async (p: Partial<T>) => {
    const base = cache ?? {}
    const next = { ...base, [key]: { ...((base[key] as Obj | undefined) ?? {}), ...p } as Json }
    cache = next
    subs.forEach((f) => f(next))
    await saveSettings(next)
  }
  return [all ? (((all[key] as Obj | undefined) ?? {}) as T) : null, patch]
}
