import { Link } from 'react-router-dom'
import { addDays, todayStr } from '../../lib/dates'
import { cuando, ordenar, useEventos } from './store'

/** Tarjeta de Inicio: lo que hay hoy en el calendario y cuánto viene en la próxima semana. */
export function CalendarioHoy() {
  const { lista } = useEventos()
  const hoy = todayStr()
  const eventos = ordenar(lista ?? [])
  const deHoy = eventos.filter((e) => e.dia === hoy)
  const semana = eventos.filter((e) => e.dia > hoy && e.dia <= addDays(hoy, 7)).length
  return (
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Calendario</h2>
        <Link to="/calendario" className="linkbtn">Abrir</Link>
      </div>
      {!lista && <p className="muted small">Cargando…</p>}
      {lista && deHoy.length === 0 && <p className="muted small" style={{ marginBottom: 0 }}>Nada en el calendario para hoy.</p>}
      {deHoy.map((e) => (
        <div className="item" key={e.id}>
          <div className="main"><div>{e.titulo}</div><div className="meta">{cuando(e)}{e.lugar ? ' · ' + e.lugar : ''}</div></div>
        </div>
      ))}
      {semana > 0 && <p className="muted small" style={{ marginBottom: 0 }}>{semana} evento{semana > 1 ? 's' : ''} en los próximos 7 días.</p>}
    </div>
  )
}
