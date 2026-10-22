import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, diffDays, fmtDate } from '../../lib/dates'
import { LeyendaEpisodios, ListaEpisodios, MarcaEpisodio, NumDia, SelectorMes, pintaDia, textoMarca } from './Calendario'
import { cuando } from './Ciclo'
import { FASES, cicloDe, infoDia, nombreMes, rango, retraso, semanasDelMes, sumaMeses } from './logica'
import { useCiclo } from './useCiclo'
import { useEpisodios } from './useEpisodios'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Ciclo en Inicio: día y fase, la tira del ciclo entero (un recuadro por día, con el día del mes,
 *  en semanas de lunes a domingo), ovulación (confirmada o aproximada), próxima regla y los
 *  episodios del ciclo con su gravedad y si hubo ingreso. Con el selector de mes y año se ve
 *  cualquier otro mes; «Ciclo actual» vuelve. Tocar un día pasado abre su registro. */
export function TarjetaCiclo() {
  const { hoy, mapa, modelo, cargando } = useCiclo()
  const nav = useNavigate()
  const c = cicloDe(modelo, hoy)
  const info = infoDia(modelo, mapa, hoy)
  // null = el ciclo actual; si no, el mes elegido (AAAA-MM).
  const [mes, setMes] = useState<string | null>(null)
  const desdeEp = mes ? mes + '-01' : c?.inicio ?? hoy
  const hastaEp = mes ? addDays(sumaMeses(mes, 1) + '-01', -1) : hoy
  const epis = useEpisodios(desdeEp, hastaEp)
  if (cargando) return <div className="card"><span className="muted">Cargando el ciclo…</span></div>
  if (!c || !info) {
    return <Link to="/sintomas" className="card ciclo-card"><h2 style={{ marginTop: 0 }}>Ciclo</h2><p className="muted">Aún no hay ninguna regla registrada. Toca para anotar la primera.</p></Link>
  }
  const tarde = retraso(modelo)
  const total = diffDays(c.siguiente, c.inicio)
  const critica = modelo.critica > 0 ? addDays(c.siguiente, -modelo.critica) : null
  // Días que se pintan: el ciclo entero (con huecos hasta su primer día de la semana) o el mes elegido.
  const dias: (string | null)[] = mes
    ? semanasDelMes(mes)
    : [...Array((new Date(c.inicio + 'T12:00:00').getDay() + 6) % 7).fill(null), ...rango(c.inicio, addDays(c.siguiente, -1))]
  const abrir = (d: string) => { if (d <= hoy) nav('/sintomas/' + d) }
  const conIngreso = epis.lista.filter((e) => e.urgencias).length
  return (
    <div className="card ciclo-card">
      <div className="row between">
        <Link to="/sintomas" className="ciclo-dia"><strong>Día {info.dia}</strong> de {c.siguientePrevisto ? '~' : ''}{total}</Link>
        <span className="tag">{FASES[info.fase]}</span>
      </div>
      <div className="row between ciclo-ver">
        <SelectorMes id="inicio-ciclo" mes={mes ?? hoy.slice(0, 7)} onMes={setMes} desde={Number((modelo.reglas[0]?.inicio ?? hoy).slice(0, 4))} />
        {mes
          ? <button type="button" className="btn sm secondary" onClick={() => setMes(null)}>Ciclo actual</button>
          : <span className="muted small">Ciclo actual</span>}
      </div>
      <div className="ciclo-tira" aria-label={mes ? `Calendario de ${nombreMes(mes)}` : `Día ${info.dia} de un ciclo de unos ${total} días`}>
        {DOW.map((l) => <span key={l} className="ciclo-dow" aria-hidden="true">{l}</span>)}
        {dias.map((d, i) => {
          if (!d) return <span key={'h' + i} />
          const p = pintaDia(modelo, mapa, d)
          const m = epis.porDia[d]
          const etiqueta = `${fmtDate(d)}${p.txt ? ': ' + p.txt : ''}${m ? ', ' + textoMarca(m) : ''}`
          return d <= hoy
            ? <button type="button" key={d} className={'ciclo-celda ' + p.cls} title={etiqueta} aria-label={etiqueta} onClick={() => abrir(d)}><NumDia d={d} ovu={p.info?.ovulacion} confirmada={p.info?.ciclo.ovuConfirmada} /><MarcaEpisodio m={m} /></button>
            : <span key={d} className={'ciclo-celda ' + p.cls} title={etiqueta}><NumDia d={d} ovu={p.info?.ovulacion} confirmada={p.info?.ciclo.ovuConfirmada} /><MarcaEpisodio m={m} /></span>
        })}
      </div>
      <div className="ciclo-leyenda" aria-hidden="true">
        <span><i className="ciclo-celda regla" /> Regla</span>
        <span><i className="ciclo-celda fertil" /> Fértil</span>
        <span><i className="num ovu-oura">10</i> {c.ovuConfirmada ? 'Ovulación (Oura)' : 'Ovulación'}</span>
        {!c.ovuConfirmada && <span><i className="num ovu-aprox">12</i> aprox.</span>}
        {critica && <span><i className="ciclo-celda critica" /> Crítica</span>}
      </div>
      <LeyendaEpisodios lista={epis.lista} />
      <dl className="ciclo-datos">
        <div><dt>{c.ovuConfirmada ? 'Ovulación (Oura)' : 'Ovulación aprox.'}</dt><dd>{fmtDate(c.ovulacion)} · {cuando(hoy, c.ovulacion)}</dd></div>
        {critica && <div><dt>Ventana crítica</dt><dd>{critica > hoy ? `desde ${fmtDate(critica)} · ${cuando(hoy, critica)}` : 'estás en ella'}</dd></div>}
        <div><dt>Próxima regla</dt><dd>{tarde > 0 ? `${tarde} ${tarde === 1 ? 'día' : 'días'} de retraso` : `${fmtDate(c.siguiente)} · ${cuando(hoy, c.siguiente)}`}</dd></div>
        <div><dt>{mes ? `Episodios en ${nombreMes(mes)}` : 'Episodios en este ciclo'}</dt><dd>{epis.lista.length ? `${epis.lista.length}${conIngreso ? ` · ${conIngreso} con ingreso` : ''}` : 'ninguno'}</dd></div>
      </dl>
      {epis.lista.length > 0 && <ListaEpisodios lista={epis.lista} />}
    </div>
  )
}
