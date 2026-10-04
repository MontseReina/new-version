import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
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
        <Link to="/" className="title" style={{ color: 'inherit', textDecoration: 'none' }}>New Version</Link>
        {DEMO && <span className="badge">Demostración</span>}
        {/* El número de pendientes se conectará cuando exista el pilar Pendientes. */}
        <Link to="/pendientes" className="badge" title="Pendientes">☑ 0</Link>
      </header>
      <nav className="tabbar" aria-label="Secciones">
        <Tab to="/" ico="🏠" label="Inicio" />
        {modules.map((m) => <Tab key={m.id} to={'/' + m.path} ico={m.ico} label={m.name} />)}
        <Tab to="/mas" ico="🧭" label="Pilares" />
      </nav>
      <main className="content"><Outlet /></main>
    </div>
  )
}
