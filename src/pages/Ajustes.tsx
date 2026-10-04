import { useAuth } from '../auth/AuthProvider'
import { APP_VERSION, SCHEMA_VERSION } from '../lib/version'

export function Ajustes() {
  const { session, signOut } = useAuth()
  return (
    <div className="stack">
      <h1>Ajustes</h1>
      <dl className="facts">
        <div><dt>Cuenta</dt><dd>{session?.user.email ?? 'Demostración'}</dd></div>
        <div><dt>Versión de la app</dt><dd>{APP_VERSION}</dd></div>
        <div><dt>Versión de los datos</dt><dd>{SCHEMA_VERSION}</dd></div>
      </dl>
      <button className="btn ghost" onClick={signOut}>Cerrar sesión</button>
    </div>
  )
}
