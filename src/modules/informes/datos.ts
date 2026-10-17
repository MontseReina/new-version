/** Datos de un periodo para los informes: se leen una vez y los usan el informe de consulta y la exportación.
 *  Solo lectura: los informes no cambian nada. */
import { useEffect, useState } from 'react'
import { addDays } from '../../lib/dates'
import { listAllEntries, listDaily } from '../../store/repo'
import type { HidraDia } from '../hidratacion/logica'
import type { Pesada } from '../nutricion/Peso'
import type { NutriDia } from '../nutricion/logica'
import type { DescansoDia } from '../objetivos/logica'
import type { SintDia } from '../sintomas/logica'
import type { SuplDia } from '../suplementos/logica'

export interface Periodo {
  desde: string
  hasta: string
  sint: Map<string, SintDia>
  /** Desde el día anterior al periodo, para el ayuno de la primera noche. */
  nutri: Map<string, NutriDia>
  hidra: Map<string, HidraDia>
  /** Desde 120 días antes, para saber cuándo fue la última terapia endovenosa. */
  supl: Map<string, SuplDia>
  descanso: Map<string, DescansoDia>
  /** Todas las pesadas, de la más antigua a la más reciente. */
  peso: Pesada[]
}

/** Días a mirar hacia atrás para encontrar la última terapia endovenosa antes del periodo. */
const ATRAS_TERAPIA = 120

const mapa = <T,>(r: { day: string; value: T }[]) => new Map(r.map((x) => [x.day, x.value]))

export async function leerPeriodo(desde: string, hasta: string): Promise<Periodo> {
  const [sint, nutri, hidra, supl, descanso, peso] = await Promise.all([
    listDaily<SintDia>('sintomas', desde, hasta),
    listDaily<NutriDia>('nutricion', addDays(desde, -1), hasta),
    listDaily<HidraDia>('hidratacion', desde, hasta),
    listDaily<SuplDia>('suplementos', addDays(desde, -ATRAS_TERAPIA), hasta),
    listDaily<DescansoDia>('descanso', desde, hasta),
    listAllEntries('peso'),
  ])
  return {
    desde, hasta,
    sint: mapa(sint), nutri: mapa(nutri), hidra: mapa(hidra), supl: mapa(supl), descanso: mapa(descanso),
    peso: peso.map((e) => ({ id: e.id, dia: e.day, notas: e.note, ...(e.value as Partial<Pesada>) }))
      .sort((a, b) => (a.dia + (a.hora ?? '')).localeCompare(b.dia + (b.hora ?? ''))),
  }
}

/** Lee el periodo cada vez que cambian las fechas. */
export function usePeriodo(desde: string, hasta: string) {
  const [datos, setDatos] = useState<Periodo | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let vivo = true
    setDatos(null); setError('')
    if (!desde || !hasta || desde > hasta) return
    leerPeriodo(desde, hasta).then((p) => { if (vivo) setDatos(p) }, (e: Error) => { if (vivo) setError(e.message) })
    return () => { vivo = false }
  }, [desde, hasta])
  return { datos, error }
}

/** Días del periodo, del primero al último. */
export function diasDe(desde: string, hasta: string): string[] {
  const out: string[] = []
  for (let d = desde; d <= hasta && out.length < 1000; d = addDays(d, 1)) out.push(d)
  return out
}
