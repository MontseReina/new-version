import { useState } from 'react'
import { Empty, Field } from '../../components/ui'
import { fmtDate, fmtDateTime, todayStr } from '../../lib/dates'
import { modules } from '..'
import { pilares } from '../../pilares'
import { atrasado, borrarPendiente, guardarPendiente, hechos, marcar, porHacer, usePendientes, type Pendiente, type Prioridad } from './store'

const PRIORIDADES: [Prioridad, string][] = [['normal', 'Normal'], ['importante', 'Importante'], ['urgente', 'Urgente']]

export function Etiquetas({ p, hoy }: { p: Pendiente; hoy: string }) {
  return (
    <>
      {p.prioridad === 'urgente' && <span className="tag rojo">urgente</span>}
      {p.prioridad === 'importante' && <span className="tag ambar">importante</span>}
      {atrasado(p, hoy) && <span className="tag rojo">atrasado</span>}
    </>
  )
}

/** Pilar Pendientes: lo que hay que hacer, con prioridad y fecha. */
export default function Pendientes() {
  const { lista, error } = usePendientes()
  const [editando, setEditando] = useState<Pendiente | null>(null)
  const [verHechos, setVerHechos] = useState(false)
  const [fallo, setFallo] = useState('')
  const hoy = todayStr()

  if (editando) return <Formulario inicial={editando} onClose={() => setEditando(null)} />

  const pendientes = porHacer(lista ?? [])
  const realizados = hechos(lista ?? [])
  const cambiar = (p: Pendiente, v: boolean) => { setFallo(''); marcar(p, v).catch((e: Error) => setFallo(e.message)) }

  return (
    <div>
      <div className="row between">
        <h1>Pendientes</h1>
        <button className="btn sm" onClick={() => setEditando({ titulo: '', prioridad: 'normal', dia: hoy, estado: 'pendiente' })}>+ Pendiente</button>
      </div>
      {(error || fallo) && <p className="error">No se ha podido {error ? 'cargar' : 'guardar'}: {error || fallo}</p>}
      {!lista && !error && <p className="muted">Cargando…</p>}
      {lista && pendientes.length === 0 && <div className="card"><Empty>Nada pendiente.</Empty></div>}
      {pendientes.map((p) => (
        <div className="card tight pendiente" key={p.id}>
          <input type="checkbox" checked={false} aria-label={'Marcar como hecho: ' + p.titulo} onChange={() => cambiar(p, true)} />
          <button type="button" className="cuerpo" onClick={() => setEditando(p)}>
            <span><Etiquetas p={p} hoy={hoy} />{p.titulo}</span>
            <span className="meta">
              {p.dia === hoy ? 'Para hoy' : 'Para el ' + fmtDate(p.dia)}
              {p.limite && ' · límite ' + fmtDate(p.limite)}
              {p.area && ' · ' + p.area}
            </span>
            {p.notas && <span className="small muted">{p.notas}</span>}
          </button>
        </div>
      ))}
      {realizados.length > 0 && (
        <p style={{ marginTop: '1rem' }}>
          <button className="btn sm ghost" onClick={() => setVerHechos(!verHechos)}>{verHechos ? 'Ocultar realizados' : `Ver realizados (${realizados.length})`}</button>
        </p>
      )}
      {verHechos && realizados.map((p) => (
        <div className="card tight pendiente hecho" key={p.id}>
          <input type="checkbox" checked aria-label={'Volver a pendiente: ' + p.titulo} onChange={() => cambiar(p, false)} />
          <button type="button" className="cuerpo" onClick={() => setEditando(p)}>
            <span>{p.titulo}</span>
            <span className="meta">Hecho el {fmtDateTime(p.hecho_el)}</span>
          </button>
        </div>
      ))}
    </div>
  )
}

function Formulario({ inicial, onClose }: { inicial: Pendiente; onClose: () => void }) {
  const [p, setP] = useState<Pendiente>(inicial)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [fallo, setFallo] = useState('')
  const set = <K extends keyof Pendiente>(k: K, v: Pendiente[K]) => setP((x) => ({ ...x, [k]: v }))
  const areas = [...modules.map((m) => m.name), ...pilares.filter((x) => x.id !== 'pendientes').map((x) => x.name)]
  const hacer = async (f: () => Promise<void>) => {
    setGuardando(true); setFallo('')
    try { await f(); onClose() } catch (e) { setFallo((e as Error).message); setGuardando(false) }
  }
  return (
    <div>
      <div className="row between">
        <h1>{p.id ? 'Pendiente' : 'Nuevo pendiente'}</h1>
        <button className="btn sm ghost" onClick={onClose}>Cancelar</button>
      </div>
      <div className="card">
        <Field label="Qué hay que hacer"><input type="text" autoFocus value={p.titulo} onChange={(e) => set('titulo', e.target.value)} /></Field>
        <div className="field">
          <span>Prioridad</span>
          <div className="seg">
            {PRIORIDADES.map(([v, l]) => <button key={v} type="button" className={p.prioridad === v ? 'on' : ''} aria-pressed={p.prioridad === v} onClick={() => set('prioridad', v)}>{l}</button>)}
          </div>
        </div>
        <div className="grid2">
          <Field label="Día en que se hace" hint="Es el día en el que aparece en Inicio.">
            <input type="date" value={p.dia} onChange={(e) => set('dia', e.target.value || todayStr())} />
          </Field>
          <Field label="Fecha límite" hint="Último día para hacerla (opcional).">
            <input type="date" value={p.limite ?? ''} onChange={(e) => set('limite', e.target.value || null)} />
          </Field>
        </div>
        <div className="grid2">
          <Field label="Área">
            <select value={p.area ?? ''} onChange={(e) => set('area', e.target.value || null)}>
              <option value="">—</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notas"><textarea value={p.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></Field>
      </div>
      {fallo && <p className="error">No se ha podido guardar: {fallo}</p>}
      <div className="row">
        <button className="btn" disabled={!p.titulo.trim() || guardando} onClick={() => hacer(() => guardarPendiente(p))}>Guardar</button>
        {p.id && !confirmar && <button className="btn danger" onClick={() => setConfirmar(true)}>Borrar</button>}
        {p.id && confirmar && (
          <>
            <span className="muted small">¿Borrar este pendiente?</span>
            <button className="btn danger sm" disabled={guardando} onClick={() => hacer(() => borrarPendiente(p.id!))}>Sí, borrar</button>
            <button className="btn ghost sm" onClick={() => setConfirmar(false)}>No</button>
          </>
        )}
      </div>
    </div>
  )
}
