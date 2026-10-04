import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { nivel, objetivo, total, type HidraCfg, type HidraDia } from './logica'

/** Línea de Hidratación en «Objetivos de hoy» (Inicio). */
export function ResumenHidratacion({ day }: { day: string }) {
  const { value: d, state } = useDaily<HidraDia>('hidratacion', day)
  const [cfg] = useSettings<HidraCfg>('hidratacion')
  const obj = objetivo(cfg)
  const t = total(d)
  const lv = nivel(t, obj)
  const marMin = cfg?.mar_min_ml ?? 0
  const mar = d.mar_ml ?? 0
  if (state === 'cargando') return <><span className="estado">Cargando…</span><div className="barra" /></>
  return (
    <>
      <span className="estado">
        <span className={'dot ' + lv} />{t} de {obj} ml{marMin ? ` · mar ${mar}/${marMin} ml` : ''}
      </span>
      <div className="barra"><i className={lv} style={{ width: Math.min(100, Math.round((t / obj) * 100)) + '%' }} /></div>
    </>
  )
}
