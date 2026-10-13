import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plegable } from '../../components/ui'
import { fmtDate, todayStr } from '../../lib/dates'
import { DEMO, getDaily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { Pestanas } from '../introspeccion/Pestanas'
import { guardarPlan } from './guardar'
import {
  ESTADOS, diaDelMes, leerPlan, logrosDelMes, nombreArea, nombreMes, porArea, semanaDe, siguiente, textoMes,
  type Estado, type Marca, type VidaCfg, type VidaMes,
} from './logica'

const SIMBOLO: { [k in Estado]: string } = { si: '✓', media: '½', no: '✗' }

/** La vida que sueño: el plan del mes en semanas, para marcar cada acción, y los logros. */
export default function Vida() {
  const hoy = todayStr()
  const [cfg, saveCfg] = useSettings<VidaCfg>('vida')
  const mes = cfg?.mes ?? hoy.slice(0, 7)
  const { value: d, set, state, retry } = useDaily<VidaMes>('vida', diaDelMes(mes))
  const plan = d.plan
  const marcas = d.marcas ?? {}
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  const [sem, setSem] = useState<number | null>(null)
  useEffect(() => setSem(null), [mes])
  const actual = plan ? semanaDe(plan, hoy) : -1
  const i = sem ?? actual
  const semana = plan?.semanas[i]

  const marcar = (id: string) => {
    const e = siguiente(marcas[id]?.estado)
    const resto = { ...marcas }
    if (e) resto[id] = { ...(marcas[id] ?? {}), estado: e, dia: hoy } as Marca; else delete resto[id]
    set({ marcas: resto })
  }
  const anotar = (id: string, nota: string) => set({ marcas: { ...marcas, [id]: { ...marcas[id], nota } } })

  const [logro, setLogro] = useState('')
  const [areaLogro, setAreaLogro] = useState('')
  const anadirLogro = () => {
    if (!logro.trim()) return
    set({ logros: [...(d.logros ?? []), { texto: logro.trim(), dia: hoy, ...(areaLogro ? { area: areaLogro } : {}) }] })
    setLogro('')
  }
  const quitarLogro = (k: number) => set({ logros: (d.logros ?? []).filter((_, j) => j !== k) })

  const logros = logrosDelMes(d)

  return (
    <div>
      <h1>Trabajo introspectivo</h1>
      <Pestanas />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      {!plan ? (
        <div className="card">
          <h2 className="intro-h">La vida que sueño</h2>
          <p>{state === 'cargando' ? 'Cargando…' : 'Todavía no hay plan para este mes.'}</p>
          {state !== 'cargando' && <p className="muted small">El plan llega con el prompt mensual del proyecto «La vida que sueño»: al final te da un enlace «Cargar en la app». También puedes pegar el texto en «Informe mensual», más abajo.</p>}
        </div>
      ) : (
        <>
          <div className="card vida-cab">
            <span className="muted small vida-mes">{nombreMes(plan.mes)} · {estado}</span>
            {plan.frase && <p className="vida-frase">{plan.frase}</p>}
            {plan.salud && <p className="small"><strong>Prioridad salud:</strong> {plan.salud}</p>}
          </div>

          {semana && (
            <div className="card">
              <div className="row between">
                <button type="button" className="btn sm ghost" disabled={i <= 0} aria-label="Semana anterior" onClick={() => setSem(i - 1)}>‹</button>
                <div className="vida-sem-tit">
                  <strong>{semana.desde <= hoy && hoy <= semana.hasta ? 'Esta semana' : `Semana ${i + 1} de ${plan.semanas.length}`}</strong>
                  <div className="muted small">Del {fmtDate(semana.desde)} al {fmtDate(semana.hasta)}</div>
                </div>
                <button type="button" className="btn sm ghost" disabled={i >= plan.semanas.length - 1} aria-label="Semana siguiente" onClick={() => setSem(i + 1)}>›</button>
              </div>
              {semana.acciones.length === 0 && <p className="muted">Semana sin acciones: es tu semana de colchón.</p>}
              {semana.acciones.length > 0 && porArea(plan, semana.acciones).map((g) => (
                <section key={g.id || 'sin'} className="vida-grupo" aria-label={g.nombre}>
                  <h3 className="vida-grupo-tit">{g.nombre}{!g.activa && g.id ? <span className="muted small"> · mantenimiento</span> : null}</h3>
                  {g.acciones.length === 0 && <p className="muted small vida-vacio">Sin acciones esta semana.</p>}
                  {g.acciones.map((a) => {
                    const k = marcas[a.id]
                    return (
                      <div key={a.id} className={'vida-accion' + (k ? ' ' + k.estado : '')}>
                        <button type="button" className={'tri ' + (k?.estado === 'si' ? 'si' : k?.estado === 'no' ? 'np' : k?.estado === 'media' ? 'media' : 'vacio')}
                          disabled={state === 'cargando'} aria-label={`${a.texto}: ${k ? ESTADOS[k.estado] : 'sin marcar'}. Toca para cambiar`}
                          onClick={() => marcar(a.id)}>{k ? SIMBOLO[k.estado] : '○'}</button>
                        <div className="vida-accion-txt">
                          <span className="lbl">{a.texto}</span>
                          {a.dia && <div className="meta"><span>{fmtDate(a.dia)}</span></div>}
                          {k && (
                            <input type="text" className="vida-nota" aria-label="Nota" placeholder="Nota (opcional)" value={k.nota ?? ''} onChange={(e) => anotar(a.id, e.target.value)} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </section>
              ))}
              <p className="muted small vida-ayuda">Un toque: hecha · dos: a medias · tres: no hecha · cuatro: sin marcar.</p>
            </div>
          )}

          <div className="card">
            <h2 className="intro-h">Mis logros de {nombreMes(plan.mes).split(' ')[0]}</h2>
            {logros.length === 0 && <p className="muted small">Aquí aparecerá cada acción que taches como hecha.</p>}
            {logros.map((l, k) => (
              <div className={'vida-logro-item' + (l.previsto ? '' : ' extra')} key={k}>
                <span className="vida-logro-marca" aria-hidden="true">{l.previsto ? '✓' : '★'}</span>
                <div className="main">
                  <div>{l.texto}</div>
                  <div className="meta">
                    {fmtDate(l.dia)}{l.area ? ' · ' + nombreArea(plan, l.area) : ''}
                    {!l.previsto && <> · no previsto · <button type="button" className="linkbtn" onClick={() => quitarLogro(l.indice!)}>Quitar</button></>}
                  </div>
                </div>
              </div>
            ))}
            <h3>Añadir algo que no estaba previsto</h3>
            <div className="vida-logro">
              <input type="text" aria-label="Logro no previsto" placeholder="Por ejemplo: dije que no a una guardia extra" value={logro} onChange={(e) => setLogro(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') anadirLogro() }} />
              {(plan.areas ?? []).length > 0 && (
                <select aria-label="Área del logro" value={areaLogro} onChange={(e) => setAreaLogro(e.target.value)}>
                  <option value="">Sin área</option>
                  {plan.areas!.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  {(plan.mantenimiento ?? []).filter((m) => m.id).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              )}
              <button type="button" className="btn secondary" disabled={!logro.trim()} onClick={anadirLogro}>Añadir</button>
            </div>
          </div>

          <Plegable id="vida-objetivos" title="Objetivos del mes">
            {(plan.areas ?? []).map((a) => (
              <div key={a.id} className="vida-area">
                <h3>{a.nombre}</h3>
                <dl className="ciclo-datos">
                  {a.objetivo && <div><dt>Objetivo</dt><dd>{a.objetivo}</dd></div>}
                  {a.minimo && <div><dt>Mínimo viable</dt><dd>{a.minimo}</dd></div>}
                  {a.resultado && <div><dt>Resultado esperado</dt><dd>{a.resultado}</dd></div>}
                  {a.anual && <div><dt>Objetivo del año</dt><dd>{a.anual}</dd></div>}
                </dl>
              </div>
            ))}
            {(plan.mantenimiento ?? []).length > 0 && (
              <>
                <h3>En mantenimiento</h3>
                {plan.mantenimiento!.map((m) => <p key={m.nombre} className="small">• <strong>{m.nombre}</strong>{m.minimo ? ': ' + m.minimo : ''}</p>)}
              </>
            )}
          </Plegable>

        </>
      )}

      <Plegable id="vida-informe" title="Informe mensual">
        <InformeVida mesActual={mes} onCargado={(m) => void saveCfg({ mes: m })} />
      </Plegable>
    </div>
  )
}

/** Sacar el texto de un mes para el prompt mensual, y cargar el plan del mes siguiente. */
function InformeVida({ mesActual, onCargado }: { mesActual: string; onCargado: (mes: string) => void }) {
  const [mes, setMes] = useState(mesActual)
  useEffect(() => setMes(mesActual), [mesActual])
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { setTexto(''); setMsg('') }, [mes])

  const preparar = async () => {
    setMsg('')
    try {
      const m = await getDaily<VidaMes>('vida', diaDelMes(mes))
      if (!m?.plan) { setMsg('Ese mes no tiene plan cargado.'); return }
      setTexto(textoMes(m))
    } catch { setMsg('No se ha podido leer el mes. Revisa la conexión y vuelve a pulsar.') }
  }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setMsg('Texto copiado.') } catch {
      (document.getElementById('vida-informe-texto') as HTMLTextAreaElement | null)?.select()
      setMsg('Texto seleccionado: cópialo con el menú de tu dispositivo.')
    }
  }
  const descargar = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/markdown' }))
    a.download = `vida-que-sueno-${mes}.md`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Fichero descargado.')
  }

  const [pegado, setPegado] = useState('')
  const [aviso, setAviso] = useState('')
  const cargar = async () => {
    const plan = leerPlan(pegado)
    if (!plan) { setAviso('El texto no es un plan válido. No se ha cambiado nada.'); return }
    try {
      await guardarPlan(plan)
      onCargado(plan.mes)
      setAviso(`Cargado el plan de ${nombreMes(plan.mes)}.`)
      setPegado('')
    } catch { setAviso('No se ha podido guardar. Revisa la conexión y vuelve a pulsar.') }
  }

  return (
    <div>
      <h3>1. Sacar el texto del mes</h3>
      <p className="muted small">Junta el plan, lo que has marcado y tus logros del mes en un texto, para adjuntarlo en el proyecto «La vida que sueño» con el prompt mensual.</p>
      <label className="field"><span>Mes</span><input id="vida-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label>
      <button type="button" className="btn secondary" onClick={() => void preparar()}>Preparar el texto</button>
      {texto && (
        <>
          <textarea id="vida-informe-texto" className="intro-salida" aria-label="Texto del mes" readOnly value={texto} />
          <div className="row">
            <button type="button" className="btn" onClick={() => void copiar()}>Copiar</button>
            {!DEMO && <button type="button" className="btn secondary" onClick={descargar}>Descargar fichero</button>}
            <button type="button" className="btn ghost" onClick={() => { setTexto(''); setMsg('') }}>Deshacer</button>
          </div>
        </>
      )}
      {msg && <p role="status" className="small">{msg}</p>}

      <h3>2. Cargar el plan del mes siguiente</h3>
      <p className="muted small">Lo normal es tocar el enlace «Cargar en la app» que viene al final del prompt mensual. Si no funciona, pega aquí el texto que lo acompaña. Lo que ya marcaste en otros meses se conserva.</p>
      <textarea aria-label="Texto del plan" placeholder="Pega aquí el texto del plan" value={pegado} onChange={(e) => { setPegado(e.target.value); setAviso('') }} />
      <button type="button" className="btn secondary" disabled={!pegado.trim()} onClick={() => void cargar()}>Cargar</button>
      {aviso && <p role="status" className="small">{aviso}</p>}
      <p className="muted small"><Link to="/introspeccion">Ir al diario</Link></p>
    </div>
  )
}
