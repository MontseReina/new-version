import { Link } from 'react-router-dom'
import { fmtDate, todayStr } from '../lib/dates'
import { TarjetaCiclo } from '../modules/ciclo/TarjetaCiclo'
import { CalendarioHoy } from '../modules/calendario/Hoy'
import { PendientesHoy } from '../modules/pendientes/Hoy'
import { RegistroHoy } from '../modules/registro/Hoy'
import { pilares } from '../pilares'

/** Inicio: el ciclo arriba, avisos, lo que queda por rellenar hoy (como en Huma), pendientes y citas de hoy, y los pilares. Los objetivos de la semana están en Evaluaciones. */
export function Inicio() {
  const hoy = todayStr()
  return (
    <div>
      <h1>Hoy</h1>
      <p className="muted" style={{ textTransform: 'capitalize' }}>{fmtDate(hoy)}</p>
      <TarjetaCiclo />

      <RegistroHoy />
      <PendientesHoy />
      <CalendarioHoy />

      <h2>Pilares</h2>
      <div className="grid3">
        {pilares.map((p) => <Link key={p.id} className="btn secondary" to={'/' + p.path}>{p.ico} {p.name}</Link>)}
      </div>
    </div>
  )
}
