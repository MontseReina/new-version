import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Empty, Field, Section } from '../../components/ui'
import { addDays, diffDays, fmtDate, todayStr } from '../../lib/dates'
import { saveDaily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { Calendario, Leyenda } from './Calendario'
import { CICLO_POR_DEFECTO, FASES, FLUJOS, LUTEA_POR_DEFECTO, MANCHADOS, cicloDe, infoDia, nombreMes, rango, retraso, sumaMeses, type CicloDia, type Mapa } from './logica'
import { useCiclo } from './useCiclo'

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Texto «en 3 días», «hoy», «hace 2 días». */
export function cuando(hoy: string, d: string) {
  const n = diffDays(d, hoy)
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : n === -1 ? 'ayer' : `hace ${-n} días`
}

/** Ciclo, dentro de Signos y síntomas: calendario del mes y registro de regla y manchado.
 *  De aquí leen Inicio y las demás áreas. */
export default function Ciclo() {
  const param = useParams().date
  const [recarga, setRecarga] = useState(0)
  const [s, setSel] = useState(param ?? todayStr())
  const [m, setMes] = useState(s.slice(0, 7))
  const dia = useDaily<CicloDia>('ciclo', s)
  // Lo editado aquí se pinta al momento, sin esperar a que se guarde y se vuelva a leer.
  const [locales, setLocales] = useState<Mapa>({})
  const { hoy, mapa, modelo, cfg, saveCfg, cargando, error } = useCiclo(dia.rev + recarga, locales)
  const poner = (patch: CicloDia) => { dia.set(patch); setLocales((l) => ({ ...l, [s]: { ...dia.value, ...patch } })) }

  const d = dia.value
  const info = infoDia(modelo, mapa, s)
  const actual = cicloDe(modelo, hoy)
  const tarde = retraso(modelo)
  const futuro = s > hoy
  const elegir = (x: string) => { setSel(x); setMes(x.slice(0, 7)) }
  const estado = dia.state === 'cargando' ? 'Cargando…' : dia.state === 'guardando' ? 'Guardando…' : dia.state === 'error' ? 'Sin guardar' : 'Guardado'

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

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Ciclo</h2>
      {error && <div className="notice small">No se ha podido leer el historial. Revisa la conexión.</div>}

      {cargando ? (
        <div className="card"><Empty>Cargando…</Empty></div>
      ) : !actual ? (
        <div className="card"><Empty>Aún no hay ninguna regla registrada. Toca un día del calendario y marca la cantidad, o añade una regla pasada por fechas más abajo.</Empty></div>
      ) : (
        <div className="card accent">
          <div className="ciclo-dia"><strong>Día {diffDays(hoy, actual.inicio) + 1}</strong> del ciclo · {FASES[infoDia(modelo, mapa, hoy)!.fase]}</div>
          {tarde > 0
            ? <p><strong>Regla con {tarde} {tarde === 1 ? 'día' : 'días'} de retraso</strong> sobre la previsión.</p>
            : <p>Próxima regla: <strong>{fmtDate(actual.siguiente)}</strong> ({cuando(hoy, actual.siguiente)}).</p>}
          <p>Ovulación aproximada: <strong>{fmtDate(actual.ovulacion)}</strong> ({cuando(hoy, actual.ovulacion)}), día {diffDays(actual.ovulacion, actual.inicio) + 1}.</p>
          {modelo.critica > 0 && <p>Ventana crítica: desde el <strong>{fmtDate(addDays(actual.siguiente, -modelo.critica))}</strong> ({cuando(hoy, addDays(actual.siguiente, -modelo.critica))}).</p>}
          <p className="muted small">{modelo.nMedia ? `Fechas aproximadas, con la media de tus últimos ${modelo.nMedia === 1 ? 'ciclo' : modelo.nMedia + ' ciclos'}: ${modelo.media} días.` : `Con una sola regla registrada se usa un ciclo de ${modelo.media} días.`}</p>
        </div>
      )}

      <div className="card">
        <div className="row between" style={{ marginBottom: '.4rem' }}>
          <button type="button" className="btn sm ghost" aria-label="Mes anterior" onClick={() => setMes(sumaMeses(m, -1))}>‹</button>
          <strong>{mayus(nombreMes(m))}</strong>
          <button type="button" className="btn sm ghost" aria-label="Mes siguiente" onClick={() => setMes(sumaMeses(m, 1))}>›</button>
        </div>
        <Calendario mes={m} modelo={modelo} mapa={mapa} sel={s} onSel={elegir} />
        <Leyenda critica={modelo.critica > 0} />
        {m !== hoy.slice(0, 7) && <button type="button" className="linkbtn" onClick={() => elegir(hoy)}>Volver a hoy</button>}
      </div>

      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>{s === hoy ? 'Hoy' : mayus(fmtDate(s))}</h2>
          {!futuro && <span className="muted small">{estado}</span>}
        </div>
        {info && (
          <p>
            Día {info.dia} · {FASES[info.fase]}
            {info.ovulacion ? <span className="tag verde" style={{ marginLeft: '.4rem' }}>Ovulación aprox.</span> : info.fertil ? <span className="tag" style={{ marginLeft: '.4rem' }}>Ventana fértil</span> : null}
            {info.critica && <span className="tag ambar" style={{ marginLeft: '.4rem' }}>Ventana crítica</span>}
            {info.reglaPrevista && <span className="tag rojo" style={{ marginLeft: '.4rem' }}>Regla prevista</span>}
          </p>
        )}
        {dia.state === 'error' && <div className="notice small">No se ha podido guardar. <button type="button" className="btn sm secondary" onClick={() => void dia.retry()}>Reintentar</button></div>}
        {futuro ? (
          <p className="muted small">Es un día futuro: se muestra la previsión y no se puede registrar.</p>
        ) : (
          <>
            <div className="field">
              <span>Regla</span>
              <div className="seg">
                {FLUJOS.map(([k, l]) => <button type="button" key={k} className={d.regla === k ? 'on' : ''} aria-pressed={d.regla === k} onClick={() => poner({ regla: d.regla === k ? null : k })}>{l}</button>)}
              </div>
              {d.regla === 'si' && <div className="muted small">Regla anotada por fechas, sin detallar. Elige la cantidad si la recuerdas. <button type="button" className="linkbtn" onClick={() => poner({ regla: null })}>Quitar la regla de este día</button></div>}
            </div>
            <div className="field">
              <span>Manchado</span>
              <div className="seg">
                {MANCHADOS.map(([k, l]) => <button type="button" key={k} className={d.manchado === k ? 'on' : ''} aria-pressed={d.manchado === k} onClick={() => poner({ manchado: d.manchado === k ? null : k })}>{l}</button>)}
              </div>
            </div>
            <p className="muted small">Toca otra vez una opción para quitarla. El manchado no cuenta como inicio de ciclo.</p>
          </>
        )}
      </div>

      <Section title="Tus ciclos" open={reglas.length > 0}>
        {reglas.length === 0 ? <Empty>Sin reglas registradas.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Regla</th><th>Días de regla</th><th>Duración del ciclo</th></tr></thead>
              <tbody>
                {[...reglas].reverse().map((r, i) => {
                  const idx = reglas.length - 1 - i
                  const dur = modelo.duraciones[idx]
                  return (
                    <tr key={r.inicio}>
                      <td><button type="button" className="linkbtn" style={{ fontSize: 'inherit', color: 'var(--primary)' }} onClick={() => elegir(r.inicio)}>{fmtDate(r.inicio)}</button></td>
                      <td>{diffDays(r.fin, r.inicio) + 1}</td>
                      <td>{dur ? `${dur} días` : 'En curso'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Añadir una regla pasada">
        <p className="muted small">Para cargar reglas anteriores sin ir día por día. Se anotan como regla sin detallar la cantidad.</p>
        <div className="grid2">
          <Field label="Primer día"><input type="date" max={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
          <Field label="Último día"><input type="date" max={hoy} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={!valido} onClick={() => void anadir()}>Añadir</button>
          {aviso && <span className="muted small">{aviso}</span>}
        </div>
      </Section>

      <Section title="Ajustes del ciclo">
        <Field label="Días entre la ovulación y la regla (fase lútea)" hint={`Si se deja vacío, ${LUTEA_POR_DEFECTO}. Mueve el día aproximado de ovulación.`}>
          <input type="number" inputMode="numeric" min={8} max={18} value={cfg?.lutea_dias ?? ''} placeholder={String(LUTEA_POR_DEFECTO)} onChange={(e) => void saveCfg({ lutea_dias: Number(e.target.value) || undefined })} />
        </Field>
        <Field label="Ventana crítica: cuántos días antes de la regla empieza" hint="Si se deja vacío, no se marca en el calendario.">
          <input type="number" inputMode="numeric" min={0} max={20} value={cfg?.critica_dias ?? ''} onChange={(e) => void saveCfg({ critica_dias: Number(e.target.value) || undefined })} />
        </Field>
        <Field label="Duración del ciclo mientras no haya dos reglas registradas" hint={`Si se deja vacío, ${CICLO_POR_DEFECTO}. Después se usa la media de tus ciclos.`}>
          <input type="number" inputMode="numeric" min={15} max={60} value={cfg?.duracion_defecto ?? ''} placeholder={String(CICLO_POR_DEFECTO)} onChange={(e) => void saveCfg({ duracion_defecto: Number(e.target.value) || undefined })} />
        </Field>
      </Section>
    </div>
  )
}
