import { Link } from 'react-router-dom'

export function Mas() {
  return (
    <div>
      <h1>Más</h1>
      <div className="card">
        <Link to="/datos" className="objetivo"><span className="ico">💾</span><strong>Mis datos</strong><span className="estado">Copia completa</span></Link>
        <Link to="/ajustes" className="objetivo"><span className="ico">⚙️</span><strong>Ajustes</strong><span className="estado">Cuenta y versión</span></Link>
      </div>
    </div>
  )
}
