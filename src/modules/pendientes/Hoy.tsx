import { Link } from 'react-router-dom'
import { todayStr } from '../../lib/dates'
import { Etiquetas } from './Pendientes'
import { marcar, porHacer, usePendientes } from './store'

/** Tarjeta de Inicio: lo urgente y lo que toca hoy o va con retraso. */
export function PendientesHoy() {
  const { lista } = usePendientes()
  const hoy = todayStr()
  const todos = porHacer(lista ?? [])
  const deHoy = todos.filter((p) => p.prioridad === 'urgente' || p.dia <= hoy || (p.limite && p.limite <= hoy))
  const resto = todos.length - deHoy.length
  return (
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Pendientes</h2>
        <Link to="/pendientes" className="linkbtn">Ver todos{todos.length ? ` (${todos.length})` : ''}</Link>
      </div>
      {!lista && <p className="muted small">Cargando…</p>}
      {lista && deHoy.length === 0 && <p className="muted small" style={{ marginBottom: 0 }}>Nada urgente ni para hoy.{resto ? ` Hay ${resto} para más adelante.` : ''}</p>}
      {deHoy.map((p) => (
        <label className="check" key={p.id}>
          <input type="checkbox" checked={false} onChange={() => { void marcar(p, true).catch(() => {}) }} />
          <span><Etiquetas p={p} hoy={hoy} />{p.titulo}</span>
        </label>
      ))}
    </div>
  )
}
