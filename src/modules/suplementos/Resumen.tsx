import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { agendados, cumplimiento, nivel, type SuplCfg, type SuplDia } from './logica'

/** Línea de Suplementos en «Objetivos de hoy» (Inicio). */
export function ResumenSuplementos({ day }: { day: string }) {
  const { value: d, state } = useDaily<SuplDia>('suplementos', day)
  const [cfg] = useSettings<SuplCfg>('suplementos')
  const lista = cfg?.lista ?? []
  if (state === 'cargando' || !cfg) return <><span className="estado">Cargando…</span><div className="barra" /></>
  const c = cumplimiento(lista, d, day)
  const toca = agendados(lista, day).filter((p) => p.fechas!.includes(day) && !d.tomas?.[p.id]).map((p) => p.nombre)
  const aviso = toca.length ? ` · hoy toca ${toca.join(' y ')}` : ''
  if (!c.total) return <span className="estado">{toca.length ? `Hoy toca ${toca.join(' y ')}` : 'Sin tomas hoy'}</span>
  const lv = nivel(c.pct)
  return (
    <>
      <span className="estado"><span className={'dot ' + lv} />{c.hechas} de {c.pautadas} tomas{aviso}</span>
      <div className="barra"><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
    </>
  )
}
