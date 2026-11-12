import { useEffect, useState } from 'react'
import { getDaily } from '../../store/repo'
import type { OuraDia } from './tipos'

/** Documento diario de Oura de un día, solo lectura (lo escribe la función de Supabase `oura`). null = sin datos. */
export function useOuraDia(date: string): OuraDia | null {
  const [d, setD] = useState<OuraDia | null>(null)
  useEffect(() => {
    let alive = true
    setD(null)
    getDaily<OuraDia>('oura', date).then((v) => alive && setD(v), () => alive && setD(null))
    return () => { alive = false }
  }, [date])
  return d
}
