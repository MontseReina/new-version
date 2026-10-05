import { useNavigate, useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Section, Stepper } from '../../components/ui'
import { todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import Ciclo from '../ciclo/Ciclo'
import { Bristol } from './Bristol'
import { Editor } from './Editor'
import { COMIDAS, HECES_COLORES, HECES_MARCAS, ORINA_COLORES, ORINA_NOMBRES, alternar, cumplimiento, gruposDe, nivel, type Deposicion, type Detalle, type Grupo, type SintCfg, type SintDia } from './logica'

const DIEZ = Array.from({ length: 10 }, (_, i) => i + 1)
const ahora = () => new Date().toTimeString().slice(0, 5)

/** Signos y síntomas: el ciclo arriba y, debajo, los grupos del día para marcar con un toque. */
export default function Sintomas() {
  const date = useParams().date ?? todayStr()
  const nav = useNavigate()
  const { value: d, set, state, retry } = useDaily<SintDia>('sintomas', date)
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  const grupos = gruposDe(cfg)
  const c = cumplimiento(grupos, d)
  const lv = nivel(c.pct)
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  const marcar = (g: Grupo, id: string) => {
    const sel = { ...(d.sel ?? {}), [g.id]: alternar(g, d.sel?.[g.id] ?? [], id) }
    if (g.tipo !== 'detalle') { set({ sel }); return }
    // Al marcar se propone la hora actual (si es el registro de hoy); al desmarcar se borra su detalle.
    const dg = { ...(d.det?.[g.id] ?? {}) }
    if (sel[g.id].includes(id)) dg[id] = date === todayStr() ? { hora: ahora() } : {}
    else delete dg[id]
    set({ sel, det: { ...(d.det ?? {}), [g.id]: dg } })
  }
  const detalle = (g: Grupo, id: string, patch: Detalle) =>
    set({ det: { ...(d.det ?? {}), [g.id]: { ...(d.det?.[g.id] ?? {}), [id]: { ...(d.det?.[g.id]?.[id] ?? {}), ...patch } } } })

  const heces = d.heces ?? []
  const ponerDepo = (i: number, patch: Deposicion) => set({ heces: heces.map((x, k) => (k === i ? { ...x, ...patch } : x)) })

  const bloque = (g: Grupo) => {
    switch (g.tipo) {
      case 'hambre':
        return (
          <>
            {COMIDAS.map(([k, l]) => (
              <div className="escala-fila" key={k}>
                <span>{l}</span>
                <div className="seg escala fina" role="group" aria-label={`Hambre antes de ${l.toLowerCase()}`}>
                  {[0, ...DIEZ].map((n) => <button type="button" key={n} className={d.hambre?.[k] === n ? 'on' : ''} aria-pressed={d.hambre?.[k] === n} onClick={() => set({ hambre: { ...(d.hambre ?? {}), [k]: d.hambre?.[k] === n ? null : n } })}>{n}</button>)}
                </div>
              </div>
            ))}
            <div className="muted small">0 nada de hambre · 10 muchísima</div>
            <div className="chips" style={{ marginTop: '.4rem' }}>
              <button type="button" className={'chip ' + (d.sin_hambre ? 'on' : '')} aria-pressed={!!d.sin_hambre} onClick={() => set({ sin_hambre: !d.sin_hambre })}>Como sin hambre</button>
            </div>
          </>
        )
      case 'heces':
        return (
          <>
            {heces.map((x, i) => (
              <div className="depo" key={i}>
                <div className="row between">
                  <strong className="small">Deposición {i + 1}</strong>
                  <button type="button" className="linkbtn" onClick={() => set({ heces: heces.filter((_, k) => k !== i) })}>Quitar</button>
                </div>
                <Bristol value={x.bristol ?? null} onChange={(v) => ponerDepo(i, { bristol: v })} />
                <div className="field">
                  <span>Color</span>
                  <div className="chips">
                    {HECES_COLORES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.color === k ? 'on' : '')} aria-pressed={x.color === k} onClick={() => ponerDepo(i, { color: x.color === k ? null : k })}>{l}</button>)}
                  </div>
                </div>
                <div className="chips">
                  {HECES_MARCAS.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x[k] ? 'on' : '') + (k === 'sangre' ? ' alerta' : '')} aria-pressed={!!x[k]} onClick={() => ponerDepo(i, { [k]: !x[k] })}>{l}</button>)}
                </div>
              </div>
            ))}
            <div className="row">
              <button type="button" className="btn sm secondary" onClick={() => set({ heces: [...heces, {}], sin_heces: null })}>+ Añadir deposición</button>
              {heces.length === 0 && <button type="button" className={'chip ' + (d.sin_heces ? 'on' : '')} aria-pressed={!!d.sin_heces} onClick={() => set({ sin_heces: !d.sin_heces })}>Hoy no ha habido</button>}
            </div>
          </>
        )
      case 'micciones':
        return (
          <>
            <div className="row">
              <Stepper value={d.micciones} onChange={(v) => set({ micciones: v })} max={40} />
              <span className="muted small">veces, aproximadamente</span>
            </div>
            <div className="field">
              <span>Color</span>
              <div className="urine">
                {ORINA_COLORES.map((col, i) => <button type="button" key={col} title={ORINA_NOMBRES[i]} aria-label={ORINA_NOMBRES[i]} aria-pressed={d.orina_color === i + 1} style={{ background: col }} className={d.orina_color === i + 1 ? 'on' : ''} onClick={() => set({ orina_color: d.orina_color === i + 1 ? null : i + 1 })} />)}
              </div>
              {d.orina_color ? <div className="muted small">{ORINA_NOMBRES[d.orina_color - 1]}</div> : null}
            </div>
            <div className="chips">
              <button type="button" className={'chip ' + (d.orina_olor ? 'on' : '')} aria-pressed={!!d.orina_olor} onClick={() => set({ orina_olor: !d.orina_olor })}>Con olor</button>
            </div>
          </>
        )
      case 'texto':
        return <textarea aria-label={g.nombre} placeholder="Escribe lo que quieras anotar de hoy" value={d.texto?.[g.id] ?? ''} onChange={(e) => set({ texto: { ...(d.texto ?? {}), [g.id]: e.target.value } })} />
      default: {
        const marcadas = d.sel?.[g.id] ?? []
        return (
          <>
            <div className="chips">
              {(g.opciones ?? []).map((o) => {
                const on = marcadas.includes(o.id)
                return <button type="button" key={o.id} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => marcar(g, o.id)}>{o.nombre}</button>
              })}
              {!g.opciones?.length && <span className="muted small">Sin opciones todavía. Añádelas en «Editar grupos».</span>}
            </div>
            {g.tipo === 'detalle' && (g.opciones ?? []).filter((o) => marcadas.includes(o.id)).map((o) => {
              const x = d.det?.[g.id]?.[o.id] ?? {}
              return (
                <div className="depo" key={o.id}>
                  <strong className="small">{o.nombre}</strong>
                  <div className="row" style={{ marginTop: '.3rem' }}>
                    <label className="row small" style={{ gap: '.4rem' }}>
                      <span className="muted">Hora</span>
                      <input type="time" aria-label={`Hora de ${o.nombre}`} style={{ width: '7.5rem' }} value={x.hora ?? ''} onChange={(e) => detalle(g, o.id, { hora: e.target.value || null })} />
                    </label>
                    <button type="button" className={'chip alerta ' + (x.urgencias ? 'on' : '')} aria-pressed={!!x.urgencias} onClick={() => detalle(g, o.id, { urgencias: !x.urgencias })}>🚑 Ingreso en urgencias</button>
                  </div>
                  <div className="escala-fila">
                    <span>Gravedad</span>
                    <div className="seg escala fina diez" role="group" aria-label={`Gravedad de ${o.nombre}, de 1 a 10`}>
                      {DIEZ.map((n) => <button type="button" key={n} className={x.gravedad === n ? 'on' : ''} aria-pressed={x.gravedad === n} onClick={() => detalle(g, o.id, { gravedad: x.gravedad === n ? null : n })}>{n}</button>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )
      }
    }
  }

  return (
    <div>
      <h1>Signos y síntomas</h1>
      <DateNav date={date} base="/sintomas" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <Ciclo date={date} onDate={(x) => nav('/sintomas/' + x)} />

      <div className={'card vaso-card ' + lv} style={{ gridTemplateColumns: '1fr' }}>
        <div>
          <div className="vaso-total"><strong>{c.hechos}</strong> de {c.total} apartados registrados</div>
          <div className="barra" style={{ marginTop: '.4rem' }}><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
          {c.faltan.length > 0 && <div className="muted small" style={{ marginTop: '.3rem' }}>Faltan: {c.faltan.join(', ')}.</div>}
        </div>
      </div>

      <fieldset className="sint" disabled={state === 'cargando'}>
        {grupos.map((g) => (
          <div className="card sint-grupo" key={g.id}>
            <h3>{g.nombre}</h3>
            {bloque(g)}
          </div>
        ))}
      </fieldset>
      <p className="muted small">La temperatura basal llegará sola desde Oura cuando se conecte el anillo.</p>

      <Section title="Editar grupos">
        <Editor grupos={grupos} guardar={(g) => void saveCfg({ grupos: g })} />
      </Section>
    </div>
  )
}
