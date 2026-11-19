import { useEffect, useState } from 'react'
import { getDaily } from '../../store/repo'
import type { RelojDia } from './tipos'

/** Documento diario del reloj de un día, solo lectura (lo escribe la función de Supabase `reloj`). null = sin datos. */
export function useRelojDia(date: string): RelojDia | null {
  const [d, setD] = useState<RelojDia | null>(null)
  useEffect(() => {
    let alive = true
    setD(null)
    getDaily<RelojDia>('reloj', date).then((v) => alive && setD(v), () => alive && setD(null))
    return () => { alive = false }
  }, [date])
  return d
}
