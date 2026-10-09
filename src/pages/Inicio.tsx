import { Link } from 'react-router-dom'
import { fmtDate, todayStr } from '../lib/dates'
import { TarjetaCiclo } from '../modules/ciclo/TarjetaCiclo'
import { CalendarioHoy } from '../modules/calendario/Hoy'
import { Portada } from '../modules/objetivos/Portada'
import { PendientesHoy } from '../modules/pendientes/Hoy'
import { AvisoSuplementos } from '../modules/suplementos/Resumen'
import { pilares } from '../pilares'

/** Inicio: el ciclo arriba, los objetivos de cumplimiento de la semana y los pilares. */
export function Inicio() {
  const hoy = todayStr()
  return (
    <div>
      <h1>Hoy</h1>
      <p className="muted" style={{ textTransform: 'capitalize' }}>{fmtDate(hoy)}</p>
      <TarjetaCiclo />
      <AvisoSuplementos day={hoy} />
      <Portada />

      <PendientesHoy />
      <CalendarioHoy />

      <h2>Pilares</h2>
      <div className="grid3">
        {pilares.map((p) => <Link key={p.id} className="btn secondary" to={'/' + p.path}>{p.ico} {p.name}</Link>)}
      </div>
    </div>
  )
}
