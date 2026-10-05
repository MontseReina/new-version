import { useEffect, useMemo, useState } from 'react'
import { addDays, todayStr } from '../../lib/dates'
import { listDaily } from '../../store/repo'
import { useSettings } from '../../store/useSettings'
import { crearModelo, type CicloCfg, type CicloDia, type Mapa } from './logica'

/** Cuánto se mira hacia atrás para calcular la media y pintar el calendario. */
const DIAS_ATRAS = 400

/**
 * Historial del ciclo y su previsión. Lo usan Ciclo, Inicio y, más adelante, las áreas que
 * dependen del día del ciclo. `rev` vuelve a leer; `locales` son los días editados en esta pantalla, aún por releer.
 */
export function useCiclo(rev = 0, locales?: Mapa) {
  const hoy = todayStr()
  const [filas, setFilas] = useState<Mapa | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    listDaily<CicloDia>('ciclo', addDays(hoy, -DIAS_ATRAS), hoy).then(
      (r) => { if (alive) { setFilas(Object.fromEntries(r.map((x) => [x.day, x.value]))); setError(false) } },
      () => { if (alive) setError(true) },
    )
    return () => { alive = false }
  }, [hoy, rev])
  const [cfg, saveCfg] = useSettings<CicloCfg>('ciclo')
  const mapa = useMemo<Mapa>(() => (filas && locales ? { ...filas, ...locales } : filas ?? {}), [filas, locales])
  const modelo = useMemo(() => crearModelo(mapa, cfg ?? {}, hoy), [mapa, cfg, hoy])
  return { hoy, mapa, modelo, cfg, saveCfg, cargando: (filas === null && !error) || !cfg, error }
}
