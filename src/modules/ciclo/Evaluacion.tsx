import { Link } from 'react-router-dom'
import { Empty, Plegable } from '../../components/ui'
import { diffDays, fmtDate } from '../../lib/dates'
import { evaluacion } from './logica'
import { useCiclo } from './useCiclo'

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`
const signo = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

/** Evaluación de mis ciclos (pilar Evaluaciones): duración del ciclo, el más corto y el más largo, variación,
 *  duración promedio de la menstruación y la tabla de ciclos. Tocar una regla abre ese día en Ciclo menstrual. */
export function EvaluacionCiclos() {
  const { modelo, cargando } = useCiclo()
  const reglas = modelo.reglas
  const durs = modelo.duraciones
  const ev = evaluacion(modelo)
  const diasRegla = reglas.map((r) => diffDays(r.fin, r.inicio) + 1)
  return (
    <Plegable id="eval-ciclos" title="Evaluación de mis ciclos" abierto>
      {cargando ? <Empty>Cargando…</Empty> : reglas.length === 0 ? <p className="muted small">Sin reglas registradas.</p> : (
        <>
          <dl className="ciclo-datos" style={{ marginBottom: '.6rem' }}>
            <div><dt>Duración del ciclo</dt><dd>{modelo.nMedia ? dias(modelo.media) : 'Faltan ciclos completos'}</dd></div>
            {ev.validos.length > 1 && <div><dt>Ciclo más corto y más largo</dt><dd>{ev.corto} y {ev.largo} días</dd></div>}
            {ev.validos.length > 1 && ev.adelanto != null && ev.retrasoMax != null && (
              <div>
                <dt>Variación del ciclo</dt>
                <dd>
                  {ev.adelanto === 0 && ev.retrasoMax === 0 ? 'Sin variación' : <>
                    {ev.adelanto > 0 && <>se adelanta hasta <strong>{dias(ev.adelanto)}</strong></>}
                    {ev.adelanto > 0 && ev.retrasoMax > 0 && <br />}
                    {ev.retrasoMax > 0 && <>se retrasa hasta <strong>{dias(ev.retrasoMax)}</strong></>}
                  </>}
                </dd>
              </div>
            )}
            <div><dt>Duración promedio de la menstruación</dt><dd>{dias(modelo.mediaRegla)}</dd></div>
            <div><dt>Ciclos completos registrados</dt><dd>{ev.validos.length}</dd></div>
          </dl>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Regla</th><th>Días de regla</th><th>Duración del ciclo</th><th>Frente a la media</th></tr></thead>
              <tbody>
                {[...reglas].reverse().map((r, i) => {
                  const idx = reglas.length - 1 - i
                  const n = durs[idx]
                  const valido = n && n >= 15 && n <= 45
                  return (
                    <tr key={r.inicio}>
                      <td><Link to={'/sintomas/' + r.inicio} style={{ color: 'var(--primary)' }}>{fmtDate(r.inicio)}</Link></td>
                      <td>{diasRegla[idx] > 1 ? diasRegla[idx] : 'Solo el inicio'}</td>
                      <td>{!n ? 'En curso' : n > 45 ? `${n} días (falta alguna regla)` : `${n} días`}</td>
                      <td>{valido && modelo.nMedia ? `${signo(n - modelo.media)} ${Math.abs(n - modelo.media) === 1 ? 'día' : 'días'}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">La duración del ciclo es la media de tus últimos ciclos completos (hasta 6). La variación compara el más corto y el más largo con esa media. Las fechas previstas salen de ella y son aproximadas.</p>
        </>
      )}
    </Plegable>
  )
}
