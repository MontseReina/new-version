import { addDays } from '../../lib/dates'
import type { OuraDia } from '../oura/tipos'
import type { RelojDia } from '../reloj/tipos'
import { useRelojDia } from '../reloj/useRelojDia'

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

/**
 * Hoja «FC en reposo · TSI» (desde la 0.26.0): pulso en reposo del reloj y de Oura, media de 24 h del reloj y la de los últimos
 * 7 días con la línea de 90 lpm. Solo lectura. El criterio de taquicardia sinusal inapropiada se confirma con Holter: esto sirve para pedirlo.
 */
export function ReposoTSI({ date, reloj, oura }: { date: string; reloj: RelojDia | null; oura: OuraDia | null }) {
  // Siete días, del más antiguo a este (siempre siete llamadas, en el mismo orden).
  const d6 = useRelojDia(addDays(date, -6)), d5 = useRelojDia(addDays(date, -5)), d4 = useRelojDia(addDays(date, -4))
  const d3 = useRelojDia(addDays(date, -3)), d2 = useRelojDia(addDays(date, -2)), d1 = useRelojDia(addDays(date, -1))
  const semana = [d6, d5, d4, d3, d2, d1, reloj].map((r, k) => ({ dia: addDays(date, k - 6), media: r?.fc?.media ?? null, ratos: r?.fc_altas?.length ?? null }))
  const conMedia = semana.filter((s) => s.media != null)
  const altos = conMedia.filter((s) => s.media! > 90).length
  const ratosSemana = semana.reduce((a, s) => a + (s.ratos ?? 0), 0)
  const W = 320, H = 150, L = 8, R = 30, T = 12, B = 22
  const vals = conMedia.map((s) => s.media!)
  const lo = Math.min(60, ...vals) - 4, hi = Math.max(100, ...vals) + 4
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const anchoBarra = (W - L - R) / 7
  const tiles: [string, string][] = [
    [reloj?.fc?.reposo != null ? String(reloj.fc.reposo) : '—', 'En reposo hoy (reloj)'],
    [oura?.noche?.fc_min != null ? String(oura.noche.fc_min) : '—', 'Más bajo de la noche (Oura)'],
    [reloj?.fc?.media != null ? String(reloj.fc.media) : '—', 'Media de 24 h hoy (reloj)'],
    [reloj?.fc_altas ? String(reloj.fc_altas.length) : '—', 'Ratos a 100 lpm o más hoy'],
  ]
  return (
    <div className="card sint-grupo">
      <h3 style={{ margin: 0 }}>💓 FC en reposo · taquicardia sinusal inapropiada</h3>
      <p className="muted small" style={{ margin: '.2rem 0 .5rem' }}>Se rellena sola con el reloj y Oura.</p>
      <div className="tsi-tiles">
        {tiles.map(([v, t]) => <div key={t} className="tsi-tile"><b>{v}</b><span className="small muted">{t}</span></div>)}
      </div>
      {conMedia.length > 0 && (
        <figure className="test-graf">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Media de FC de 24 horas de los últimos 7 días: ${semana.map((s) => s.media ?? 'sin datos').join(', ')}`}>
            <line x1={L} x2={W - R} y1={Y(90)} y2={Y(90)} className="test-graf-umbral" />
            <text x={W - 2} y={Y(90) + 4} textAnchor="end" className="test-graf-txt umbral">90</text>
            {semana.map((s, k) => {
              const x = L + k * anchoBarra + anchoBarra * 0.18
              return (
                <g key={s.dia}>
                  {s.media != null && <rect x={x} y={Y(s.media)} width={anchoBarra * 0.64} height={H - B - Y(s.media)} rx="4" className={s.media > 90 ? 'tsi-barra alta' : 'tsi-barra'} />}
                  {s.media != null && <text x={x + anchoBarra * 0.32} y={Y(s.media) - 3} textAnchor="middle" className="test-graf-txt">{s.media}</text>}
                  <text x={x + anchoBarra * 0.32} y={H - 6} textAnchor="middle" className="test-graf-txt">{DIAS[new Date(s.dia + 'T12:00:00').getDay()]}</text>
                </g>
              )
            })}
          </svg>
          <figcaption className="small muted">Media de 24 h del reloj, últimos 7 días.</figcaption>
        </figure>
      )}
      <div className="test-resultado">
        <h4 style={{ margin: '0 0 .4rem' }}>Últimos 7 días</h4>
        {conMedia.length === 0 ? <div className="test-res test-res-nada"><span className="test-res-marca" aria-hidden="true">·</span><span>Aún no hay datos del reloj en estos días.</span></div> : <>
          <div className={'test-res test-res-' + (altos ? 'aviso' : 'ok')}><span className="test-res-marca" aria-hidden="true">{altos ? '!' : '✓'}</span><span><b>{altos} de {conMedia.length} días</b> con media de 24 h por encima de 90 lpm.</span></div>
          <div className={'test-res test-res-' + (ratosSemana ? 'aviso' : 'ok')}><span className="test-res-marca" aria-hidden="true">{ratosSemana ? '!' : '✓'}</span><span><b>{ratosSemana} ratos</b> a 100 lpm o más en la semana (en reposo o no: el detalle está en «FC del día»).</span></div>
        </>}
        <p className="small muted" style={{ margin: '.4rem 0 0' }}>Criterio de taquicardia sinusal inapropiada (consenso HRS 2015): FC por encima de 100 en reposo y media de 24 h por encima de 90, sin otra causa. El reloj no la diagnostica: sirve para justificar un Holter de 24 h, un ECG y la TSH.</p>
      </div>
    </div>
  )
}
