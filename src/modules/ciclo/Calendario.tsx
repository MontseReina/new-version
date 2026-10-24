import { fmtDate } from '../../lib/dates'
import { sigla, type Episodio, type marcaDia } from '../sintomas/logica'
import { infoDia, semanasDelMes, sumaMeses, type Mapa, type Modelo } from './logica'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Elegir el mes que se ve: flechas para el anterior y el siguiente, y mes y año a elegir.
 *  Los años van desde `desde` (AAAA) hasta el año que viene. */
export function SelectorMes({ mes, onMes, desde, id }: { mes: string; onMes: (m: string) => void; desde: number; id: string }) {
  const [a, m] = [Number(mes.slice(0, 4)), Number(mes.slice(5, 7))]
  const hasta = new Date().getFullYear() + 1
  const anios: number[] = []
  for (let x = Math.min(desde, a); x <= Math.max(hasta, a); x++) anios.push(x)
  const poner = (an: number, me: number) => onMes(`${an}-${String(me).padStart(2, '0')}`)
  return (
    <div className="selector-mes">
      <button type="button" className="btn sm ghost" aria-label="Mes anterior" onClick={() => onMes(sumaMeses(mes, -1))}>‹</button>
      <select id={id + '-mes'} aria-label="Mes" value={m} onChange={(e) => poner(a, Number(e.target.value))}>
        {MESES.map((n, i) => <option key={n} value={i + 1}>{mayus(n)}</option>)}
      </select>
      <select id={id + '-anio'} aria-label="Año" value={a} onChange={(e) => poner(Number(e.target.value), m)}>
        {anios.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <button type="button" className="btn sm ghost" aria-label="Mes siguiente" onClick={() => onMes(sumaMeses(mes, 1))}>›</button>
    </div>
  )
}

export type MarcasDia = { [d: string]: ReturnType<typeof marcaDia> }

/** Episodios del día dentro del recuadro: la sigla de cada tipo (DN, DP, A…); en rojo relleno si hubo ingreso. */
export function MarcaEpisodio({ m }: { m?: ReturnType<typeof marcaDia> }) {
  if (!m) return null
  return <i className={'m-epi' + (m.ingreso ? ' ingreso' : '')} aria-hidden="true">{m.siglas.join(' ')}</i>
}
/** Número del día; en la ovulación, un punto negro al lado (relleno si la marca Oura; solo el borde si es aproximada). */
export function NumDia({ d, ovu, confirmada }: { d: string; ovu?: boolean; confirmada?: boolean }) {
  return (
    <span className="num">
      {Number(d.slice(8))}
      {ovu && <i className={'m-ovu' + (confirmada ? ' oura' : '')} aria-hidden="true" />}
    </span>
  )
}
/** Texto para lectores de pantalla. */
export const textoMarca = (m?: ReturnType<typeof marcaDia>) =>
  m ? `${m.nombres.join(', ')}${m.gravedad != null ? ', gravedad ' + m.gravedad : ''}${m.ingreso ? ', con ingreso' : ''}` : ''

/** Leyenda de las siglas que aparecen («DN nocturna»…), del ingreso y de la ovulación. */
export function LeyendaEpisodios({ lista }: { lista: Episodio[] }) {
  const tipos = [...new Map(lista.map((e) => [sigla(e.nombre), e.nombre])).entries()]
  if (!tipos.length) return null
  return (
    <div className="ciclo-leyenda epi-leyenda" aria-hidden="true">
      {tipos.map(([s, n]) => <span key={s}><i className="m-epi">{s}</i> {n}</span>)}
      {lista.some((e) => e.urgencias) && <span><i className="m-epi ingreso">DN</i> con ingreso</span>}
    </div>
  )
}

/** Una línea por episodio: «sáb, 18 oct · 21:30 · Ansiedad · gravedad 8 · ingreso». */
export function ListaEpisodios({ lista, conFecha = true }: { lista: Episodio[]; conFecha?: boolean }) {
  return (
    <ul className="epi-lista">
      {lista.map((e, i) => (
        <li key={i}>
          <span>
            {conFecha && <>{fmtDate(e.dia)} · </>}{e.hora && <>{e.hora} · </>}<strong>{e.nombre}</strong>
            {e.gravedad != null && <> · gravedad {e.gravedad}/10</>}
            {e.urgencias && <> · <span className="epi-ingreso">ingreso</span></>}
          </span>
        </li>
      ))}
    </ul>
  )
}

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Clases y descripción de un día, compartidas por el calendario y la tira de Inicio. */
export function pintaDia(mo: Modelo, m: Mapa, d: string) {
  const info = infoDia(mo, m, d)
  const reg = m[d]
  const cls = [
    reg?.regla ? 'regla ' + reg.regla : '',
    info?.reglaPrevista ? 'prevista' : '',
    info?.fertil ? 'fertil' : '',
    info?.ovulacion ? 'ovu' + (info.ciclo.ovuConfirmada ? ' oura' : '') : '',
    info?.critica ? 'critica' : '',
    d === mo.hoy ? 'hoy' : '',
  ].filter(Boolean).join(' ')
  const txt = [
    reg?.regla ? 'regla' : '',
    reg?.manchado ? 'manchado' : '',
    info?.reglaPrevista ? 'regla prevista' : '',
    info?.ovulacion ? (info.ciclo.ovuConfirmada ? 'ovulación confirmada' : 'ovulación aproximada') : info?.fertil ? 'ventana fértil' : '',
    info?.critica ? 'ventana crítica' : '',
  ].filter(Boolean).join(', ')
  return { info, reg, cls, txt }
}

/** Mes del ciclo: regla registrada y prevista, ventana fértil, ovulación, ventana crítica y episodios. */
export function Calendario({ mes, modelo, mapa, sel, onSel, epis }: { mes: string; modelo: Modelo; mapa: Mapa; sel: string; onSel: (d: string) => void; epis?: MarcasDia }) {
  return (
    <div className="ciclo-cal" role="grid" aria-label="Calendario del ciclo">
      {DOW.map((l) => <div key={l} className="ciclo-dow" aria-hidden="true">{l}</div>)}
      {semanasDelMes(mes).map((d, i) => {
        if (!d) return <div key={i} />
        const { reg, cls, txt: t0, info } = pintaDia(modelo, mapa, d)
        const txt = [t0, textoMarca(epis?.[d])].filter(Boolean).join(', ')
        const n = Number(d.slice(8))
        return (
          <button type="button" key={d} className={'ciclo-celda ' + cls + (d === sel ? ' sel' : '')} aria-pressed={d === sel} aria-label={`Día ${n}${txt ? ': ' + txt : ''}`} onClick={() => onSel(d)}>
            <NumDia d={d} ovu={info?.ovulacion} confirmada={info?.ciclo.ovuConfirmada} />
            <MarcaEpisodio m={epis?.[d]} />
            <span className="marcas" aria-hidden="true">
              {reg?.manchado && <i className={'m-man ' + reg.manchado} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Leyenda({ critica, confirmada }: { critica: boolean; confirmada?: boolean }) {
  return (
    <div className="ciclo-ley">
      <span><i className="ciclo-celda regla moderado" /> Regla</span>
      <span><i className="ciclo-celda prevista" /> Regla prevista</span>
      <span><i className="ciclo-celda fertil" /> Ventana fértil</span>
      <span><i className="m-ovu oura" /> Ovulación (Oura)</span>
      {!confirmada && <span><i className="m-ovu" /> Ovulación aprox.</span>}
      {critica && <span><i className="ciclo-celda critica" /> Ventana crítica</span>}
      <span><i className="m-man rojo" /> Manchado</span>
    </div>
  )
}
