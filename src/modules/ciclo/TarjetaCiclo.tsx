import { Link } from 'react-router-dom'
import { addDays, diffDays, fmtDate } from '../../lib/dates'
import { pintaDia } from './Calendario'
import { cuando } from './Ciclo'
import { FASES, cicloDe, infoDia, rango, retraso } from './logica'
import { useCiclo } from './useCiclo'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Ciclo en Inicio: día y fase, la tira del ciclo entero (un recuadro por día, con el día del mes,
 *  en semanas de lunes a domingo), ovulación aproximada y próxima regla. */
export function TarjetaCiclo() {
  const { hoy, mapa, modelo, cargando } = useCiclo()
  const c = cicloDe(modelo, hoy)
  const info = infoDia(modelo, mapa, hoy)
  if (cargando) return <div className="card"><span className="muted">Cargando el ciclo…</span></div>
  if (!c || !info) {
    return <Link to="/sintomas" className="card ciclo-card"><h2 style={{ marginTop: 0 }}>Ciclo</h2><p className="muted">Aún no hay ninguna regla registrada. Toca para anotar la primera.</p></Link>
  }
  const tarde = retraso(modelo)
  const total = diffDays(c.siguiente, c.inicio)
  const critica = modelo.critica > 0 ? addDays(c.siguiente, -modelo.critica) : null
  // Huecos hasta el día de la semana en que empieza el ciclo (lunes = 0).
  const huecos = (new Date(c.inicio + 'T12:00:00').getDay() + 6) % 7
  return (
    <Link to="/sintomas" className="card ciclo-card">
      <div className="row between">
        <div className="ciclo-dia"><strong>Día {info.dia}</strong> de {c.siguientePrevisto ? '~' : ''}{total}</div>
        <span className="tag">{FASES[info.fase]}</span>
      </div>
      <div className="ciclo-tira" aria-label={`Día ${info.dia} de un ciclo de unos ${total} días`}>
        {DOW.map((l) => <span key={l} className="ciclo-dow" aria-hidden="true">{l}</span>)}
        {Array.from({ length: huecos }, (_, i) => <span key={'h' + i} />)}
        {rango(c.inicio, addDays(c.siguiente, -1)).map((d) => {
          const p = pintaDia(modelo, mapa, d)
          return <span key={d} className={'ciclo-celda ' + p.cls}>{Number(d.slice(8))}</span>
        })}
      </div>
      <div className="ciclo-leyenda" aria-hidden="true">
        <span><i className="ciclo-celda regla" /> Regla</span>
        <span><i className="ciclo-celda fertil" /> Fértil</span>
        <span><i className="ciclo-celda ovu" /> Ovulación</span>
        {critica && <span><i className="ciclo-celda critica" /> Crítica</span>}
      </div>
      <dl className="ciclo-datos">
        <div><dt>Ovulación aprox.</dt><dd>{fmtDate(c.ovulacion)} · {cuando(hoy, c.ovulacion)}</dd></div>
        {critica && <div><dt>Ventana crítica</dt><dd>{critica > hoy ? `desde ${fmtDate(critica)} · ${cuando(hoy, critica)}` : 'estás en ella'}</dd></div>}
        <div><dt>Próxima regla</dt><dd>{tarde > 0 ? `${tarde} ${tarde === 1 ? 'día' : 'días'} de retraso` : `${fmtDate(c.siguiente)} · ${cuando(hoy, c.siguiente)}`}</dd></div>
      </dl>
    </Link>
  )
}
