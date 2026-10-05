import { useEffect, useState } from 'react'
import { Empty, Field, Plegable } from '../../components/ui'
import { addDays, diffDays, fmtDate } from '../../lib/dates'
import { saveDaily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { Calendario, Leyenda } from './Calendario'
import { FASES, FLUJOS, MANCHADOS, cicloDe, infoDia, nombreMes, rango, retraso, sumaMeses, type CicloDia, type Mapa } from './logica'
import { useCiclo } from './useCiclo'

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Texto «en 3 días», «hoy», «hace 2 días». */
export function cuando(hoy: string, d: string) {
  const n = diffDays(d, hoy)
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : n === -1 ? 'ayer' : `hace ${-n} días`
}

/**
 * Ciclo, dentro de Signos y síntomas: resumen del día `date`, registro de la menstruación,
 * calendario del mes y evaluación de los ciclos. De aquí leen Inicio y las demás áreas.
 */
export default function Ciclo({ date, onDate }: { date: string; onDate: (d: string) => void }) {
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

  const reglas = modelo.reglas
  const durs = modelo.duraciones
  const diasRegla = reglas.map((r) => diffDays(r.fin, r.inicio) + 1)
  const etiquetas = (i: NonNullable<typeof info>) => (
    <>
      {i.ovulacion ? <span className="tag verde">Ovulación aprox.</span> : i.fertil ? <span className="tag">Ventana fértil</span> : null}
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
        <div className="card"><Empty>Aún no hay ninguna regla registrada. Marca la cantidad en «Registro de la menstruación» o añade una regla pasada por fechas en «Calendario del ciclo».</Empty></div>
      ) : (
        <div className="card accent">
          {info
            ? <div className="ciclo-dia"><strong>Día {info.dia}</strong> del ciclo · {FASES[info.fase]} <span style={{ fontSize: '.9rem' }}>{etiquetas(info)}</span></div>
            : <div className="ciclo-dia">Día anterior a la primera regla registrada</div>}
          {date === hoy && (
            <p className="small">
              {tarde > 0 ? <>Regla con <strong>{tarde} {tarde === 1 ? 'día' : 'días'} de retraso</strong>. </> : <>Próxima regla <strong>{fmtDate(actual.siguiente)}</strong> ({cuando(hoy, actual.siguiente)}). </>}
              Ovulación aprox. <strong>{fmtDate(actual.ovulacion)}</strong> ({cuando(hoy, actual.ovulacion)}).
              {modelo.critica > 0 && <> Ventana crítica desde <strong>{fmtDate(addDays(actual.siguiente, -modelo.critica))}</strong>.</>}
            </p>
          )}
        </div>
      )}

      <Plegable id="menstruacion" title="Registro de la menstruación" abierto>
        {dia.state === 'error' && <div className="notice small">No se ha podido guardar. <button type="button" className="btn sm secondary" onClick={() => void dia.retry()}>Reintentar</button></div>}
        <div className="field" style={{ marginTop: 0 }}>
          <span>Regla</span>
          <div className="seg">
            {FLUJOS.map(([k, l]) => <button type="button" key={k} disabled={cargandoDia} className={d.regla === k ? 'on' : ''} aria-pressed={d.regla === k} onClick={() => poner({ regla: d.regla === k ? null : k })}>{l}</button>)}
          </div>
          <div className="chips" style={{ marginTop: '.4rem' }}>
            <button type="button" disabled={cargandoDia} className={'chip ' + (d.coagulos ? 'on' : '')} aria-pressed={!!d.coagulos} onClick={() => poner({ coagulos: !d.coagulos })}>Con coágulos</button>
          </div>
          {d.regla === 'si' && <div className="muted small">Regla anotada por fechas, sin detallar. Elige la cantidad si la recuerdas. <button type="button" className="linkbtn" onClick={() => poner({ regla: null })}>Quitar la regla de este día</button></div>}
        </div>
        <div className="field">
          <span>Manchado</span>
          <div className="seg">
            {MANCHADOS.map(([k, l]) => <button type="button" key={k} disabled={cargandoDia} className={d.manchado === k ? 'on' : ''} aria-pressed={d.manchado === k} onClick={() => poner({ manchado: d.manchado === k ? null : k })}>{l}</button>)}
          </div>
        </div>
        <p className="muted small">Toca otra vez una opción para quitarla. El manchado no cuenta como inicio de ciclo.</p>
      </Plegable>

      <Plegable id="calendario-ciclo" title="Calendario del ciclo">
        <div className="row between" style={{ marginBottom: '.4rem' }}>
          <button type="button" className="btn sm ghost" aria-label="Mes anterior" onClick={() => setMes(sumaMeses(m, -1))}>‹</button>
          <strong>{mayus(nombreMes(m))}</strong>
          <button type="button" className="btn sm ghost" aria-label="Mes siguiente" onClick={() => setMes(sumaMeses(m, 1))}>›</button>
        </div>
        <Calendario mes={m} modelo={modelo} mapa={mapa} sel={vista} onSel={elegir} />
        <Leyenda critica={modelo.critica > 0} />
        <p className="small" style={{ marginTop: '.6rem' }}>
          <strong>{vista === hoy ? 'Hoy' : mayus(fmtDate(vista))}</strong>
          {infoVista ? <> · Día {infoVista.dia} · {FASES[infoVista.fase]} {etiquetas(infoVista)}</> : null}
          {vista > hoy && <span className="muted"> · previsión</span>}
        </p>
        <p className="muted small">Toca un día pasado para abrir su registro; uno futuro, para ver la previsión.</p>

        <h3>Añadir una regla pasada</h3>
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

      <Plegable id="evaluacion-ciclos" title="Evaluación de mis ciclos">
        {reglas.length === 0 ? <p className="muted small">Sin reglas registradas.</p> : (
          <>
            <dl className="ciclo-datos" style={{ marginBottom: '.6rem' }}>
              <div><dt>Duración media del ciclo</dt><dd>{modelo.nMedia ? `${modelo.media} días` : 'Faltan ciclos completos'}</dd></div>
              {durs.length > 1 && <div><dt>Ciclo más corto y más largo</dt><dd>{Math.min(...durs)} y {Math.max(...durs)} días</dd></div>}
              <div><dt>Días de regla, de media</dt><dd>{modelo.mediaRegla}</dd></div>
              <div><dt>Ciclos completos registrados</dt><dd>{durs.length}</dd></div>
            </dl>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Regla</th><th>Días de regla</th><th>Duración del ciclo</th></tr></thead>
                <tbody>
                  {[...reglas].reverse().map((r, i) => {
                    const idx = reglas.length - 1 - i
                    return (
                      <tr key={r.inicio}>
                        <td><button type="button" className="linkbtn" style={{ fontSize: 'inherit', color: 'var(--primary)' }} onClick={() => elegir(r.inicio)}>{fmtDate(r.inicio)}</button></td>
                        <td>{diasRegla[idx]}</td>
                        <td>{durs[idx] ? `${durs[idx]} días` : 'En curso'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small">Las fechas previstas salen de la media de tus últimos ciclos; son aproximadas.</p>
          </>
        )}
      </Plegable>
    </div>
  )
}
