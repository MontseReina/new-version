import { NavLink, Outlet } from 'react-router-dom'
import { modules } from '../modules'

export function Layout() {
  return (
    <div className="shell">
      <header className="top">
        <strong className="brand">New Version</strong>
      </header>
      <main className="content"><Outlet /></main>
      <nav className="tabs" aria-label="Secciones">
        <NavLink to="/" end>Inicio</NavLink>
        {modules.map(m => <NavLink key={m.id} to={'/' + m.path}>{m.name}</NavLink>)}
        <NavLink to="/datos">Datos</NavLink>
        <NavLink to="/ajustes">Ajustes</NavLink>
      </nav>
    </div>
  )
}
