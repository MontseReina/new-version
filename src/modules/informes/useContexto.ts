import { useEffect, useMemo, useState } from 'react'
import { nowHM, todayStr } from '../../lib/dates'
import { useSettings } from '../../store/useSettings'
import { useCiclo } from '../ciclo/useCiclo'
import type { HidraCfg } from '../hidratacion/logica'
import { aMin, type NutriCfg } from '../nutricion/logica'
import type { ObjCfg } from '../objetivos/logica'
import type { SintCfg } from '../sintomas/logica'
import type { SuplCfg } from '../suplementos/logica'
import type { Contexto } from './calculos'

/** Ajustes y ciclo que necesitan los informes. `listo` cuando han llegado todos. */
export function useContexto(): { c: Contexto; listo: boolean } {
  const [ahoraMin, setAhoraMin] = useState(() => aMin(nowHM()) ?? 0)
  useEffect(() => { const t = window.setInterval(() => setAhoraMin(aMin(nowHM()) ?? 0), 60000); return () => window.clearInterval(t) }, [])
  const [sintCfg] = useSettings<SintCfg>('sintomas')
  const [nutriCfg] = useSettings<NutriCfg>('nutricion')
  const [hidraCfg] = useSettings<HidraCfg>('hidratacion')
  const [suplCfg] = useSettings<SuplCfg>('suplementos')
  const [objCfg] = useSettings<ObjCfg>('objetivos')
  const { modelo, mapa, cargando } = useCiclo()
  const hoy = todayStr()
  const c = useMemo<Contexto>(() => ({ hoy, ahoraMin, modelo, cicloMapa: mapa, sintCfg, nutriCfg, hidraCfg, suplCfg, objCfg }),
    [hoy, ahoraMin, modelo, mapa, sintCfg, nutriCfg, hidraCfg, suplCfg, objCfg])
  return { c, listo: !cargando && !!suplCfg && !!nutriCfg }
}
