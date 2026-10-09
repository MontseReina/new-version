import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { avisosDe, cumplimiento, enDias, nivel, type SuplCfg, type SuplDia } from './logica'

/** Línea de Suplementos en «Objetivos de hoy» (Inicio). */
export function ResumenSuplementos({ day }: { day: string }) {
  const { value: d, state } = useDaily<SuplDia>('suplementos', day)
  const [cfg] = useSettings<SuplCfg>('suplementos')
  const lista = cfg?.lista ?? []
  if (state === 'cargando' || !cfg) return <><span className="estado">Cargando…</span><div className="barra" /></>
  const c = cumplimiento(lista, d, day)
  const toca = avisosDe(lista, d, day).map(({ p, faltan }) => `${p.nombre} ${enDias(faltan)}`).join(' · ')
  // El aviso va en su propia línea: junto a las tomas no cabe en el móvil.
  const aviso = toca ? <span className="estado" style={{ gridColumn: '2 / -1', whiteSpace: 'normal' }}>{toca}</span> : null
  if (!c.total) return <><span className="estado">Sin tomas hoy</span>{aviso}</>
  const lv = nivel(c.pct)
  return (
    <>
      <span className="estado"><span className={'dot ' + lv} />{c.hechas} de {c.pautadas} tomas</span>
      <div className="barra"><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
      {aviso}
    </>
  )
}
