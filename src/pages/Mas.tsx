import { Link } from 'react-router-dom'
import { pilares } from '../pilares'

export function Mas() {
  return (
    <div>
      <h1>Pilares</h1>
      <div className="card">
        {pilares.map((p) => (
          <Link key={p.id} to={'/' + p.path} className="objetivo"><span className="ico">{p.ico}</span><strong>{p.name}</strong><span className="estado">{p.Page ? '' : 'En preparación'}</span></Link>
        ))}
      </div>
      <h2>La app</h2>
      <div className="card">
        <Link to="/datos" className="objetivo"><span className="ico">💾</span><strong>Mis datos</strong><span className="estado">Copia completa</span></Link>
        <Link to="/ajustes" className="objetivo"><span className="ico">⚙️</span><strong>Ajustes</strong><span className="estado">Cuenta y versión</span></Link>
      </div>
    </div>
  )
}
