import { useEffect, useState } from 'react'
import { addDays, nowHM, todayStr } from '../../lib/dates'
import { getDaily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { aMin, ayuno, horarios, nivelDia, textoResumen, tomasDe, type NutriCfg, type NutriDia } from './logica'

/** Línea de Nutrición en «Objetivos de hoy» (Inicio): tomas hechas, pendientes y horarios. */
export function ResumenNutricion({ day }: { day: string }) {
  const { value: d, state } = useDaily<NutriDia>('nutricion', day)
  const [cfg] = useSettings<NutriCfg>('nutricion')
  const [ayer, setAyer] = useState<NutriDia | null>(null)
  useEffect(() => {
    let alive = true
    getDaily<NutriDia>('nutricion', addDays(day, -1)).then((v) => alive && setAyer(v), () => {})
    return () => { alive = false }
  }, [day])
  if (state === 'cargando' || !cfg) return <><span className="estado">Cargando…</span><div className="barra" /></>
  if (!tomasDe(cfg).length) return <span className="estado">Sin menús cargados</span>
  const h = horarios(cfg, d, day, todayStr(), aMin(nowHM()) ?? 0)
  const ay = ayuno(cfg, ayer, d)
  const lv = nivelDia(h, ay)
  return (
    <>
      <span className="estado"><span className={'dot ' + lv} />{textoResumen(h)}{ay.ok === false ? ' · ayuno largo' : ''}</span>
      <div className="barra"><i className={lv} style={{ width: Math.round((h.hechas / h.total) * 100) + '%' }} /></div>
    </>
  )
}
