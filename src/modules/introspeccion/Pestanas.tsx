import { NavLink } from 'react-router-dom'

/** Pestañas del área Trabajo introspectivo: el diario y La vida que sueño. */
export function Pestanas() {
  return (
    <nav className="intro-tabs" aria-label="Apartados de Trabajo introspectivo">
      <NavLink to="/introspeccion" className={({ isActive }) => (isActive ? 'on' : '')}>Diario</NavLink>
      <NavLink to="/vida" className={({ isActive }) => (isActive ? 'on' : '')}>La vida que sueño</NavLink>
    </nav>
  )
}
