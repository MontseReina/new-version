import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { modules } from '../modules'
import { DEMO } from '../store/repo'

function Tab({ to, ico, label }: { to: string; ico: ReactNode; label: string }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="ico">{ico}</span>
      {label}
    </NavLink>
  )
}

export function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="title">New Version</span>
        {DEMO && <span className="badge">Demostración · no se guarda en tu cuenta</span>}
      </header>
      <nav className="tabbar" aria-label="Secciones">
        <Tab to="/" ico="🏠" label="Inicio" />
        {modules.map((m) => <Tab key={m.id} to={'/' + m.path} ico={m.ico} label={m.name} />)}
        <Tab to="/mas" ico="🧭" label="Más" />
      </nav>
      <main className="content"><Outlet /></main>
    </div>
  )
}
