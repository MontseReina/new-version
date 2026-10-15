import { Link, useSearchParams } from 'react-router-dom'

const PAGINAS: { [ruta: string]: string } = { nutricion: 'Nutrición', hidratacion: 'Hidratación', avisos: 'Avisos en el móvil' }

/** Un aviso entero: se abre al tocar la notificación, porque en la pantalla bloqueada del iPhone el texto largo sale cortado. */
export default function Aviso() {
  const [q] = useSearchParams()
  const titulo = q.get('t') || 'Aviso'
  const cuerpo = q.get('c') || ''
  const ruta = q.get('r') || ''
  return (
    <div>
      <h1>{titulo}</h1>
      <div className="card aviso-entero">
        {cuerpo ? <p>{cuerpo}</p> : <p className="muted">Este aviso no trae texto.</p>}
      </div>
      <div className="row">
        {ruta && PAGINAS[ruta] && ruta !== 'avisos' && <Link className="btn" to={'/' + ruta}>Ir a {PAGINAS[ruta]}</Link>}
        <Link className="btn ghost" to="/avisos">Ver los últimos avisos</Link>
      </div>
    </div>
  )
}
