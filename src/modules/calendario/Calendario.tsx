import { useState } from 'react'
import { Empty, Field } from '../../components/ui'
import { fmtDate, todayStr } from '../../lib/dates'
import { borrarEvento, cuando, guardarEvento, ordenar, useEventos, type Evento } from './store'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Días del mes (AAAA-MM) con huecos al principio para empezar en lunes. */
function diasDelMes(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const pad = (new Date(y, m - 1, 1, 12).getDay() + 6) % 7
  const n = new Date(y, m, 0, 12).getDate()
  const dias: string[] = Array.from({ length: pad }, () => '')
  for (let d = 1; d <= n; d++) dias.push(`${ym}-${String(d).padStart(2, '0')}`)
  return dias
}
function otroMes(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1, 12)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const nombreDia = (d: string) => { const f = new Date(d + 'T12:00:00'); return `${DIAS_SEMANA[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}` }

function Tarjeta({ ev, conFecha, onClick }: { ev: Evento; conFecha?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="card tight evento" onClick={onClick}>
      <strong>{ev.titulo}</strong>
      <span className="meta">{conFecha && <span style={{ textTransform: 'capitalize' }}>{fmtDate(ev.dia)} · </span>}{cuando(ev)}{ev.lugar ? ' · ' + ev.lugar : ''}</span>
      {ev.notas && <span className="small muted">{ev.notas}</span>}
    </button>
  )
}

/** Pilar Calendario: citas y avisos con fecha, en vista de mes y en lista. */
export default function Calendario() {
  const { lista, error } = useEventos()
  const hoy = todayStr()
  const [editando, setEditando] = useState<Evento | null>(null)
  const [mes, setMes] = useState(hoy.slice(0, 7))
  const [diaSel, setDiaSel] = useState<string | null>(hoy)
  const [verPasados, setVerPasados] = useState(false)

  if (editando) return <Formulario inicial={editando} onClose={() => setEditando(null)} />

  const eventos = ordenar(lista ?? [])
  const del = (d: string) => eventos.filter((e) => e.dia === d)
  const proximos = eventos.filter((e) => e.dia >= hoy)
  const pasados = eventos.filter((e) => e.dia < hoy).reverse()
  const [y, m] = mes.split('-').map(Number)
  const nuevo = (dia: string) => setEditando({ titulo: '', dia, hora: '09:00' })
  const irA = (ym: string) => { setMes(ym); setDiaSel(ym === hoy.slice(0, 7) ? hoy : null) }

  return (
    <div>
      <div className="row between">
        <h1>Calendario</h1>
        <button className="btn sm" onClick={() => nuevo(diaSel ?? hoy)}>+ Evento</button>
      </div>
      {error && <p className="error">No se ha podido cargar: {error}</p>}

      <div className="card cal">
        <div className="cal-head">
          <button type="button" className="btn sm secondary" aria-label="Mes anterior" onClick={() => irA(otroMes(mes, -1))}>‹</button>
          <div className="cal-mes">
            <strong>{MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)} {y}</strong>
            {mes !== hoy.slice(0, 7) && <button type="button" className="linkbtn small" onClick={() => irA(hoy.slice(0, 7))}>volver a hoy</button>}
          </div>
          <button type="button" className="btn sm secondary" aria-label="Mes siguiente" onClick={() => irA(otroMes(mes, 1))}>›</button>
        </div>
        <div className="cal-grid">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {diasDelMes(mes).map((d, i) => {
            if (!d) return <div key={i} />
            const evs = del(d)
            return (
              <button type="button" key={d} className={'cal-dia' + (d === hoy ? ' hoy' : '') + (d === diaSel ? ' sel' : '')} aria-label={nombreDia(d) + (evs.length ? `, ${evs.length} evento${evs.length > 1 ? 's' : ''}` : '')} onClick={() => setDiaSel(d === diaSel ? null : d)}>
                <span className="cal-num">{Number(d.slice(8))}</span>
                {evs.slice(0, 2).map((e) => <span key={e.id} className="cal-ev">{e.titulo}</span>)}
                {evs.length > 2 && <span className="cal-ev muted">+{evs.length - 2}</span>}
              </button>
            )
          })}
        </div>
        {diaSel && (
          <div className="cal-detalle">
            <strong>{nombreDia(diaSel)[0].toUpperCase() + nombreDia(diaSel).slice(1)}</strong>
            {del(diaSel).map((e) => <Tarjeta key={e.id} ev={e} onClick={() => setEditando(e)} />)}
            {lista && !del(diaSel).length && <div className="muted small">Nada apuntado este día.</div>}
            <button type="button" className="btn sm secondary" style={{ marginTop: '.5rem' }} onClick={() => nuevo(diaSel)}>+ Evento este día</button>
          </div>
        )}
      </div>

      <h2>Próximos</h2>
      {!lista && !error && <p className="muted">Cargando…</p>}
      {lista && proximos.length === 0 && <div className="card"><Empty>No hay nada apuntado de hoy en adelante.</Empty></div>}
      {proximos.map((e) => <Tarjeta key={e.id} ev={e} conFecha onClick={() => setEditando(e)} />)}

      {pasados.length > 0 && (
        <p style={{ marginTop: '1rem' }}>
          <button className="btn sm ghost" onClick={() => setVerPasados(!verPasados)}>{verPasados ? 'Ocultar pasados' : `Ver pasados (${pasados.length})`}</button>
        </p>
      )}
      {verPasados && pasados.map((e) => <Tarjeta key={e.id} ev={e} conFecha onClick={() => setEditando(e)} />)}
    </div>
  )
}

function Formulario({ inicial, onClose }: { inicial: Evento; onClose: () => void }) {
  const [ev, setEv] = useState<Evento>(inicial)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [fallo, setFallo] = useState('')
  const set = <K extends keyof Evento>(k: K, v: Evento[K]) => setEv((x) => ({ ...x, [k]: v }))
  const hacer = async (f: () => Promise<void>) => {
    setGuardando(true); setFallo('')
    try { await f(); onClose() } catch (e) { setFallo((e as Error).message); setGuardando(false) }
  }
  const finAntes = !!(ev.hora && ev.hora_fin && ev.hora_fin <= ev.hora)
  return (
    <div>
      <div className="row between">
        <h1>{ev.id ? 'Evento' : 'Nuevo evento'}</h1>
        <button className="btn sm ghost" onClick={onClose}>Cancelar</button>
      </div>
      <div className="card">
        <Field label="Qué es"><input type="text" autoFocus value={ev.titulo} onChange={(e) => set('titulo', e.target.value)} /></Field>
        <Field label="Día"><input type="date" value={ev.dia} onChange={(e) => set('dia', e.target.value || todayStr())} /></Field>
        <label className="check" style={{ borderBottom: 'none' }}>
          <input type="checkbox" checked={!ev.hora} onChange={(e) => setEv((x) => ({ ...x, hora: e.target.checked ? null : '09:00', hora_fin: null }))} />
          <span>Todo el día</span>
        </label>
        {ev.hora && (
          <div className="grid2">
            <Field label="Empieza"><input type="time" value={ev.hora} onChange={(e) => set('hora', e.target.value || '09:00')} /></Field>
            <Field label="Termina" hint={finAntes ? 'Tiene que ser más tarde que la hora de inicio.' : 'Opcional.'}><input type="time" value={ev.hora_fin ?? ''} onChange={(e) => set('hora_fin', e.target.value || null)} /></Field>
          </div>
        )}
        <Field label="Lugar"><input type="text" value={ev.lugar ?? ''} onChange={(e) => set('lugar', e.target.value)} /></Field>
        <Field label="Notas"><textarea value={ev.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></Field>
      </div>
      {fallo && <p className="error">No se ha podido guardar: {fallo}</p>}
      <div className="row">
        <button className="btn" disabled={!ev.titulo.trim() || guardando || finAntes} onClick={() => hacer(() => guardarEvento(ev))}>Guardar</button>
        {ev.id && !confirmar && <button className="btn danger" onClick={() => setConfirmar(true)}>Borrar</button>}
        {ev.id && confirmar && (
          <>
            <span className="muted small">¿Borrar este evento?</span>
            <button className="btn danger sm" disabled={guardando} onClick={() => hacer(() => borrarEvento(ev.id!))}>Sí, borrar</button>
            <button className="btn ghost sm" onClick={() => setConfirmar(false)}>No</button>
          </>
        )}
      </div>
    </div>
  )
}
