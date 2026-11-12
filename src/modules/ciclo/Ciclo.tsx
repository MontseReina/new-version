import { useEffect, useMemo, useState } from 'react'
import { Empty, Field, Plegable } from '../../components/ui'
import { addDays, diffDays, fmtDate, fmtLarga } from '../../lib/dates'
import { saveDaily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { Calendario, Leyenda, LeyendaEpisodios, ListaEpisodios, SelectorMes } from './Calendario'
import { Gotas, PuntoManchado } from './Iconos'
import { FASES, FLUJOS, MANCHADOS, cicloDe, infoDia, rango, retraso, sumaMeses, type CicloDia, type Mapa } from './logica'
import { useCiclo } from './useCiclo'
import { useEpisodios } from './useEpisodios'
import type { SintDia } from '../sintomas/logica'

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Texto «en 3 días», «hoy», «hace 2 días». */
export function cuando(hoy: string, d: string) {
  const n = diffDays(d, hoy)
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : n === -1 ? 'ayer' : `hace ${-n} días`
}

/**
 * Ciclo menstrual: resumen del día `date`, registro de la menstruación, regla pasada y calendario del mes.
 * La evaluación de los ciclos y el registro de episodios del mes viven en el pilar Evaluaciones.
 */
export default function Ciclo({ date, onDate, sintDia }: { date: string; onDate: (d: string) => void; sintDia?: SintDia }) {
  const [recarga, setRecarga] = useState(0)
  const dia = useDaily<CicloDia>('ciclo', date)
  // Lo editado aquí se pinta al momento, sin esperar a que se guarde y se vuelva a leer.
  const [locales, setLocales] = useState<Mapa>({})
  const { hoy, mapa, modelo, cargando, error } = useCiclo(dia.rev + recarga, locales)
  const poner = (patch: CicloDia) => { dia.set(patch); setLocales((l) => ({ ...l, [date]: { ...dia.value, ...patch } })) }

  // Día marcado en el calendario: el del registro o, para ver la previsión, uno futuro.
  const [vista, setVista] = useState(date)
  const [m, setMes] = useState(date.slice(0, 7))
  useEffect(() => { setVista(date); setMes(date.slice(0, 7)) }, [date])
  // Episodios del mes que se ve; los del día abierto, tal como están en pantalla.
  const local = useMemo(() => (sintDia ? { day: date, value: sintDia } : undefined), [date, sintDia])
  const epis = useEpisodios(m + '-01', addDays(sumaMeses(m, 1) + '-01', -1), recarga, local)
  const elegir = (x: string) => { setVista(x); setMes(x.slice(0, 7)); if (x <= hoy && x !== date) onDate(x) }

  const d = dia.value
  const info = infoDia(modelo, mapa, date)
  const infoVista = infoDia(modelo, mapa, vista)
  const actual = cicloDe(modelo, hoy)
  const tarde = retraso(modelo)
  const cargandoDia = dia.state === 'cargando'

  // Regla pasada por fechas, sin detallar la cantidad de cada día.
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [aviso, setAviso] = useState('')
  const valido = !!desde && !!hasta && desde <= hasta && hasta <= hoy && diffDays(hasta, desde) < 15
  const anadir = async () => {
    setAviso('Guardando…')
    try {
      for (const x of rango(desde, hasta)) if (!mapa[x]?.regla) await saveDaily<CicloDia>('ciclo', x, { ...(mapa[x] ?? {}), regla: 'si' })
      setAviso(`Regla del ${fmtDate(desde)} al ${fmtDate(hasta)} añadida.`)
      setMes(desde.slice(0, 7)); setDesde(''); setHasta(''); setRecarga((n) => n + 1)
    } catch { setAviso('No se ha podido guardar. Revisa la conexión.') }
  }

  // Lo anotado del día, para verlo con el registro plegado.
  const anotado = [
    d.regla ? (FLUJOS.find(([k]) => k === d.regla)?.[1] ?? 'Regla') : '',
    d.coagulos ? 'coágulos' : '',
    d.manchado ? 'manchado ' + (MANCHADOS.find(([k]) => k === d.manchado)?.[1] ?? '').toLowerCase() : '',
  ].filter(Boolean).join(', ')

  const reglas = modelo.reglas
  const etiquetas = (i: NonNullable<typeof info>) => (
    <>
      {i.ovuReal && <span className="tag verde">Ovulación real (Oura)</span>}
      {i.ovuAprox && !i.ovuReal && <span className="tag verde">Ovulación aprox.</span>}
      {!i.ovuReal && !i.ovuAprox && i.fertil && <span className="tag">Ventana fértil</span>}
      {i.critica && <span className="tag ambar">Ventana crítica</span>}
      {i.reglaPrevista && <span className="tag rojo">Regla prevista</span>}
    </>
  )

  return (
    <div>
      {error && <div className="notice small">No se ha podido leer el historial del ciclo. Revisa la conexión.</div>}

      {cargando ? (
        <div className="card"><Empty>Cargando…</Empty></div>
      ) : !actual ? (
        <div className="card"><Empty>Aún no hay ninguna regla registrada. Marca la cantidad en «Registro de la menstruación» o añade una regla pasada por fechas en «Añadir una regla pasada».</Empty></div>
      ) : (
        <div className="card accent">
          {info
            ? <div className="ciclo-dia"><strong>Día {info.dia}</strong> del ciclo · {FASES[info.fase]} <span style={{ fontSize: '.9rem' }}>{etiquetas(info)}</span></div>
            : <div className="ciclo-dia">Día anterior a la primera regla registrada</div>}
          {date === hoy && (
            <ul className="ciclo-resumen">
              <li>{tarde > 0
                ? <>Regla con <strong>{tarde} {tarde === 1 ? 'día' : 'días'} de retraso</strong></>
                : <>Próxima regla: <strong>{fmtLarga(actual.siguiente)}</strong>, {cuando(hoy, actual.siguiente)}</>}</li>
              {actual.ovuReal ? (
                <li>
                  Ovulación
                  <ul className="ciclo-guion">
                    <li>aprox.: <strong>{fmtLarga(actual.ovuAprox)}</strong>, {cuando(hoy, actual.ovuAprox)}</li>
                    <li>real: <strong>{fmtLarga(actual.ovuReal)}</strong>, {cuando(hoy, actual.ovuReal)} <span className="muted">(subida de temperatura de Oura)</span></li>
                  </ul>
                </li>
              ) : <li>Ovulación aprox.: <strong>{fmtLarga(actual.ovuAprox)}</strong>, {cuando(hoy, actual.ovuAprox)}</li>}
              {modelo.critica > 0 && tarde === 0 && (
                <li className="critica-txt">
                  {hoy >= addDays(actual.siguiente, -modelo.critica)
                    ? <>Estás en la ventana crítica (desde el <strong>{fmtLarga(addDays(actual.siguiente, -modelo.critica))}</strong>)</>
                    : <>Ventana crítica desde el <strong>{fmtLarga(addDays(actual.siguiente, -modelo.critica))}</strong></>}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <Plegable id="registro-menstruacion" title={'Registro de la menstruación' + (anotado ? ' · ' + anotado : '')}>
        {dia.state === 'error' && <div className="notice small">No se ha podido guardar. <button type="button" className="btn sm secondary" onClick={() => void dia.retry()}>Reintentar</button></div>}
        <div className="field" style={{ marginTop: 0 }}>
          <span>Regla</span>
          <div className="seg">
            {FLUJOS.map(([k, l]) => <button type="button" key={k} disabled={cargandoDia} className={'con-icono ' + (d.regla === k ? 'on' : '')} aria-pressed={d.regla === k} onClick={() => poner({ regla: d.regla === k ? null : k })}><Gotas flujo={k} />{l}</button>)}
          </div>
          <div className="chips" style={{ marginTop: '.4rem' }}>
            <button type="button" disabled={cargandoDia} className={'chip ' + (d.coagulos ? 'on' : '')} aria-pressed={!!d.coagulos} onClick={() => poner({ coagulos: !d.coagulos })}>Con coágulos</button>
          </div>
          {d.regla === 'si' && <div className="muted small">Regla anotada por fechas, sin detallar. Elige la cantidad si la recuerdas. <button type="button" className="linkbtn" onClick={() => poner({ regla: null })}>Quitar la regla de este día</button></div>}
        </div>
        <div className="field">
          <span>Manchado</span>
          <div className="seg">
            {MANCHADOS.map(([k, l]) => <button type="button" key={k} disabled={cargandoDia} className={'con-icono ' + (d.manchado === k ? 'on' : '')} aria-pressed={d.manchado === k} onClick={() => poner({ manchado: d.manchado === k ? null : k })}><PuntoManchado color={k} />{l}</button>)}
          </div>
        </div>
        <p className="muted small">Toca otra vez una opción para quitarla. El manchado no cuenta como inicio de ciclo. La ovulación real la da sola la subida de temperatura de Oura.</p>
      </Plegable>

      <Plegable id="regla-pasada" title="Añadir una regla pasada">
        <p className="muted small">Para cargar reglas anteriores sin ir día por día. Se anotan como regla sin detallar la cantidad.</p>
        <div className="grid2">
          <Field label="Primer día"><input type="date" max={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
          <Field label="Último día"><input type="date" max={hoy} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={!valido} onClick={() => void anadir()}>Añadir</button>
          {aviso && <span className="muted small">{aviso}</span>}
        </div>
      </Plegable>

      <Plegable id="calendario-del-ciclo" title="Calendario del ciclo" abierto>
        <SelectorMes id="ciclo-cal" mes={m} onMes={setMes} desde={Number((reglas[0]?.inicio ?? hoy).slice(0, 4))} />
        <Calendario mes={m} modelo={modelo} mapa={mapa} sel={vista} onSel={elegir} epis={epis.porDia} />
        <Leyenda critica={modelo.critica > 0} />
        <LeyendaEpisodios lista={epis.lista} />
        <p className="small" style={{ marginTop: '.6rem' }}>
          <strong>{vista === hoy ? 'Hoy' : mayus(fmtDate(vista))}</strong>
          {infoVista ? <> · Día {infoVista.dia} · {FASES[infoVista.fase]} {etiquetas(infoVista)}</> : null}
          {vista > hoy && <span className="muted"> · previsión</span>}
        </p>
        {epis.lista.some((e) => e.dia === vista) && <ListaEpisodios lista={epis.lista.filter((e) => e.dia === vista)} conFecha={false} />}
        <p className="muted small">Toca un día pasado para abrir su registro; uno futuro, para ver la previsión.</p>
        <p className="muted small">El registro de episodios de cada mes y la evaluación de tus ciclos están en Pilares → Evaluaciones.</p>
      </Plegable>
    </div>
  )
}
