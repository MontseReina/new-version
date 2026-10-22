import { useEffect, useMemo, useState } from 'react'
import { listDaily } from '../../store/repo'
import { useSettings } from '../../store/useSettings'
import { episodiosDe, gruposDe, marcaDia, type Episodio, type SintCfg, type SintDia } from '../sintomas/logica'

/** Episodios (disautonomía y demás grupos con hora, gravedad e ingreso) entre dos fechas,
 *  para pintarlos en el calendario del ciclo. `local` = el día abierto en Signos y síntomas. `porDia` = gravedad más alta e ingreso de cada día. */
export function useEpisodios(desde: string, hasta: string, rev = 0, local?: { day: string; value: SintDia }) {
  const [dias, setDias] = useState<{ day: string; value: SintDia }[]>([])
  const [cfg] = useSettings<SintCfg>('sintomas')
  useEffect(() => {
    let alive = true
    listDaily<SintDia>('sintomas', desde, hasta).then((r) => { if (alive) setDias(r) }, () => { /* sin episodios si falla */ })
    return () => { alive = false }
  }, [desde, hasta, rev])
  return useMemo(() => {
    // El día que se está editando en pantalla manda sobre lo leído, para pintarlo al momento.
    const todos = local ? [...dias.filter((x) => x.day !== local.day), ...(local.day >= desde && local.day <= hasta ? [local] : [])] : dias
    const lista: Episodio[] = cfg ? episodiosDe(gruposDe(cfg), todos) : []
    const porDia: { [d: string]: ReturnType<typeof marcaDia> } = {}
    for (const d of new Set(lista.map((e) => e.dia))) porDia[d] = marcaDia(lista.filter((e) => e.dia === d))
    return { lista, porDia }
  }, [cfg, dias, local, desde, hasta])
}
