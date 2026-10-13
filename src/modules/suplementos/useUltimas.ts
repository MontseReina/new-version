import { useEffect, useState } from 'react'
import { addDays } from '../../lib/dates'
import { listDaily, type Daily } from '../../store/repo'
import { esAgendado, esPeriodico, ultimasDe, type Producto, type SuplDia, type Ultimas } from './logica'

/** Días anteriores (hasta 90) de lo que no es diario, para saber cuándo se hizo por última vez.
 *  `listo` es falso mientras carga: así no sale un aviso que no toca. */
export function useUltimas(lista: Producto[], d: SuplDia, date: string, rev?: number) {
  const [historia, setHistoria] = useState<Daily<SuplDia>[]>([])
  const [listo, setListo] = useState(false)
  const hay = lista.some((p) => esPeriodico(p) || esAgendado(p))
  useEffect(() => {
    if (!hay) { setListo(true); return }
    let alive = true
    listDaily<SuplDia>('suplementos', addDays(date, -90), date).then(
      (r) => { if (alive) { setHistoria(r); setListo(true) } },
      () => { if (alive) setListo(true) },
    )
    return () => { alive = false }
  }, [date, rev, hay])
  const ultimas: Ultimas = ultimasDe(historia, d, date)
  return { historia, ultimas, listo }
}
