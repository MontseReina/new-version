import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { Login } from './auth/Login'
import { Layout } from './components/Layout'
import { supabase } from './lib/supabase'
import { modules } from './modules'
import { Ajustes } from './pages/Ajustes'
import { Datos } from './pages/Datos'
import { Inicio } from './pages/Inicio'

export function App() {
  const { session } = useAuth()
  if (!supabase) {
    return <main className="login"><h1>New Version</h1><p className="error">Esta copia de la app no está conectada a la base de datos.</p></main>
  }
  if (session === undefined) return <main className="login"><p className="muted">Cargando…</p></main>
  if (!session) return <Login />
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          {modules.map(m => <Route key={m.id} path={m.path} element={<m.Page />} />)}
          <Route path="datos" element={<Datos />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
