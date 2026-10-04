import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { addDays, todayStr } from '../lib/dates'
import { modules } from '../modules'
import { useEventos } from '../modules/calendario/store'
import { atrasado, porHacer, usePendientes } from '../modules/pendientes/store'
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
  const { lista } = usePendientes()
  const hoy = todayStr()
  const pend = porHacer(lista ?? [])
  const { lista: eventos } = useEventos()
  // Eventos de hoy y de mañana.
  const cerca = (eventos ?? []).filter((e) => e.dia >= hoy && e.dia <= addDays(hoy, 1)).length
  const alerta = pend.some((p) => p.prioridad === 'urgente' || atrasado(p, hoy))
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="title" style={{ color: 'inherit', textDecoration: 'none' }}>New Version</Link>
        {DEMO && <span className="badge">Demostración</span>}
        <Link to="/pendientes" className={'badge ' + (alerta ? 'alert' : pend.length ? 'warn' : '')} title="Pendientes" aria-label={`Pendientes: ${pend.length}`}>☑ {pend.length}</Link>
        <Link to="/calendario" className={'badge ' + (cerca ? 'warn' : '')} title="Calendario: hoy y mañana" aria-label={`Eventos de hoy y de mañana: ${cerca}`}>📅 {cerca}</Link>
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
