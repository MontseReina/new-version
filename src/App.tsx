import { HashRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { Login } from './auth/Login'
import { Layout } from './components/Layout'
import { supabase } from './lib/supabase'
import { modules } from './modules'
import { Ajustes } from './pages/Ajustes'
import { Datos } from './pages/Datos'
import { EnPreparacion } from './pages/EnPreparacion'
import { Inicio } from './pages/Inicio'
import { Mas } from './pages/Mas'
import { DEMO } from './store/repo'

function Rutas() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        {modules.flatMap((m) => {
          const el = m.Page ? <m.Page /> : <EnPreparacion name={m.name} />
          return [<Route key={m.id} path={m.path} element={el} />, <Route key={m.id + 'd'} path={m.path + '/:date'} element={el} />]
        })}
        <Route path="mas" element={<Mas />} />
        <Route path="datos" element={<Datos />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  const { session } = useAuth()
  // Demostración: sin cuenta ni base de datos; los datos se quedan en este navegador.
  if (DEMO) return <MemoryRouter initialEntries={['/hidratacion']}><Rutas /></MemoryRouter>
  if (!supabase) {
    return <main className="login"><h1>New Version</h1><p className="error">Esta copia de la app no está conectada a la base de datos.</p></main>
  }
  if (session === undefined) return <main className="login"><p className="muted">Cargando…</p></main>
  if (!session) return <Login />
  return <HashRouter><Rutas /></HashRouter>
}
