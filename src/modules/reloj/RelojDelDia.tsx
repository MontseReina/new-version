import { Curva } from '../oura/graficos'
import type { RelojDia } from './tipos'

const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

/**
 * Resumen del reloj del día para Disautonomía (encima de Constantes): curva del pulso, mínimo, media y máximo,
 * pulso en reposo, variabilidad y saturación. Las tomas de tensión salen dentro de Constantes. Sin datos, nada.
 */
export function RelojDelDia({ r }: { r: RelojDia | null }) {
  if (!r) return null
  const vfc = (r.vfc ?? []).map((p) => p[1])
  const sat = (r.spo2 ?? []).map((p) => p[1])
  const hayCurva = !!r.fc_dia?.some((v) => v != null)
  const datos = [
    r.fc?.reposo != null && ['Pulso en reposo', `${r.fc.reposo} lpm`],
    r.fc?.min != null && ['Pulso mín · media · máx', `${r.fc.min} · ${r.fc.media} · ${r.fc.max} lpm`],
    vfc.length > 0 && ['Variabilidad (VFC)', vfc.length === 1 ? `${vfc[0]} ms` : `media ${media(vfc)} ms · ${Math.min(...vfc)}–${Math.max(...vfc)} (${vfc.length} lecturas)`],
    sat.length > 0 && ['Saturación', sat.length === 1 ? `${sat[0]} %` : `media ${media(sat)} % · mínima ${Math.min(...sat)} %`],
    (r.ta?.length ?? 0) > 0 && ['Tensiones', `${r.ta!.length} ${r.ta!.length === 1 ? 'toma' : 'tomas'} (en Constantes)`],
  ].filter(Boolean) as [string, string][]
  if (!hayCurva && !datos.length) return null
  return (
    <div className="card reloj-dia">
      <div className="row between">
        <h3 style={{ margin: 0 }}>⌚ Reloj</h3>
        <span className="tag">automático</span>
      </div>
      {hayCurva && <div className="oura fc-del-dia"><Curva titulo="Frecuencia cardíaca del día (reloj)" valores={r.fc_dia!} inicio="00:00" paso={30} unidad="lpm" color="var(--red)" alto={72} /></div>}
      {datos.length > 0 && (
        <dl className="reloj-datos small">
          {datos.map(([k, v]) => <div key={k}><dt className="muted">{k}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
      {vfc.length > 0 && <p className="muted small" style={{ margin: '.3rem 0 0' }}>La variabilidad del reloj y la de Oura se calculan de forma distinta: compáralas por si suben o bajan a la vez, no por la cifra.</p>}
    </div>
  )
}
