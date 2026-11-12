import { useEffect, useState } from 'react'
import { getDaily } from '../../store/repo'
import { Curva } from './graficos'
import type { OuraDia } from './tipos'

/**
 * Frecuencia cardíaca del día del anillo Oura, en pequeño, para Disautonomía (encima de Constantes).
 * Solo lee el documento diario `oura`; si ese día no hay datos, no muestra nada.
 */
export function FcDelDia({ date }: { date: string }) {
  const [fc, setFc] = useState<(number | null)[] | null>(null)
  useEffect(() => {
    let alive = true
    setFc(null)
    getDaily<OuraDia>('oura', date).then((d) => alive && setFc(d?.fc_dia ?? null), () => alive && setFc(null))
    return () => { alive = false }
  }, [date])
  if (!fc || !fc.some((v) => v != null)) return null
  return (
    <div className="oura fc-del-dia">
      <Curva titulo="Frecuencia cardíaca del día (Oura)" valores={fc} inicio="00:00" paso={30} unidad="lpm" color="var(--red)" alto={72} />
    </div>
  )
}
