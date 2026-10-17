import { useNavigate, useParams } from 'react-router-dom'
import Consulta from './Consulta'
import Exportar from './Exportar'

/** Los informes de la app, juntos. Los que todavía no están hechos salen como «Próximamente». */
const INFORMES = [
  { id: 'consulta', ico: '🩺', titulo: 'Informe de consulta', texto: 'Para imprimir o guardar en PDF y entregar al especialista: ciclo, episodios, síntomas, alimentación, peso, hidratación, suplementos, objetivos y preguntas pendientes.' },
  { id: 'exportar', ico: '📝', titulo: 'Mis datos para Claude', texto: 'Todo lo anotado en un periodo, resumido y día a día, para copiar o descargar y llevarlo a una conversación.' },
  { id: 'semana', ico: '🗓️', titulo: 'Resumen de la semana', texto: 'Cada domingo: cómo ha ido la semana en objetivos, síntomas, comidas e hidratación.', luego: true },
  { id: 'ciclo', ico: '🌙', titulo: 'Ciclo y episodios', texto: 'Un ciclo frente a otro: qué pasó en la ventana crítica y los días antes de cada episodio.', luego: true },
]

export default function Informes() {
  const { tipo } = useParams()
  const ir = useNavigate()
  const volver = () => ir('/informes')
  if (tipo === 'consulta') return <Consulta volver={volver} />
  if (tipo === 'exportar') return <Exportar volver={volver} />

  return (
    <div>
      <h1>Informes</h1>
      {INFORMES.map((x) => (
        <button key={x.id} type="button" className={'card inf-opcion' + (x.luego ? ' luego' : '')} disabled={x.luego} onClick={() => ir('/informes/' + x.id)}>
          <span className="inf-ico" aria-hidden="true">{x.ico}</span>
          <span>
            <strong>{x.titulo}</strong>{x.luego && <span className="tag gray">Próximamente</span>}
            <span className="muted small inf-texto">{x.texto}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
