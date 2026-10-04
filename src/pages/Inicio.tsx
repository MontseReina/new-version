import { Link } from 'react-router-dom'
import { fmtDate, todayStr } from '../lib/dates'
import { modules } from '../modules'
import { CalendarioHoy } from '../modules/calendario/Hoy'
import { PendientesHoy } from '../modules/pendientes/Hoy'
import { pilares } from '../pilares'

/** Inicio: los objetivos de hoy, un renglón por área, con su estado. */
export function Inicio() {
  const hoy = todayStr()
  return (
    <div>
      <h1>Hoy</h1>
      <p className="muted" style={{ textTransform: 'capitalize' }}>{fmtDate(hoy)}</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Objetivos de hoy</h2>
        {modules.map((m) => (
          <Link key={m.id} to={'/' + m.path} className="objetivo">
            <span className="ico">{m.ico}</span>
            <strong>{m.name}</strong>
            {m.Resumen ? <m.Resumen day={hoy} /> : <span className="estado">En preparación</span>}
          </Link>
        ))}
      </div>

      <PendientesHoy />
      <CalendarioHoy />

      <h2>Pilares</h2>
      <div className="grid3">
        {pilares.map((p) => <Link key={p.id} className="btn secondary" to={'/' + p.path}>{p.ico} {p.name}</Link>)}
      </div>
    </div>
  )
}
