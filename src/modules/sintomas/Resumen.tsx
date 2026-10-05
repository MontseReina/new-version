import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { cumplimiento, gruposDe, nivel, type SintCfg, type SintDia } from './logica'

/** Línea de Signos y síntomas en «Objetivos de hoy» (Inicio). */
export function ResumenSintomas({ day }: { day: string }) {
  const { value: d, state } = useDaily<SintDia>('sintomas', day)
  const [cfg] = useSettings<SintCfg>('sintomas')
  if (state === 'cargando' || !cfg) return <><span className="estado">Cargando…</span><div className="barra" /></>
  const c = cumplimiento(gruposDe(cfg), d)
  const lv = nivel(c.pct)
  return (
    <>
      <span className="estado"><span className={'dot ' + lv} />{c.hechos} de {c.total} apartados</span>
      <div className="barra"><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
    </>
  )
}
