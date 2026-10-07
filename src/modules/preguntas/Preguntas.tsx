import { useState } from 'react'
import { Empty, Field, Section } from '../../components/ui'
import { fmtDate, todayStr } from '../../lib/dates'
import { useSettings } from '../../store/useSettings'
import { modules } from '..'
import { pilares } from '../../pilares'
import Informe from './Informe'
import {
  borrarPregunta, guardarPregunta, pendientesDe, reabrir, renombrarEspecialista, responder, respondidasDe, usePreguntas,
  type PregCfg, type Pregunta,
} from './store'

/** Áreas y pilares de la app, para clasificar cada pregunta (el «Pilar…» de Huma). */
export const temas = () => [...modules.map((m) => m.name), ...pilares.filter((x) => x.id !== 'preguntas').map((x) => x.name), 'Otro']

/** Pilar Preguntas: lo que se quiere preguntar a cada especialista y lo que ha respondido. */
export default function Preguntas() {
  const { lista, error } = usePreguntas()
  const [cfg, saveCfg] = useSettings<PregCfg>('preguntas')
  const [elegido, setElegido] = useState('')
  const [texto, setTexto] = useState('')
  const [pilar, setPilar] = useState('')
  const [informe, setInforme] = useState(false)
  const [fallo, setFallo] = useState('')

  const especialistas = cfg?.especialistas ?? []
  const esp = especialistas.includes(elegido) ? elegido : especialistas[0] ?? ''
  const todas = lista ?? []

  if (informe) return <Informe especialistas={especialistas} preguntas={todas} onClose={() => setInforme(false)} />

  const pendientes = pendientesDe(todas, esp)
  const respondidas = respondidasDe(todas, esp)
  const anadir = async () => {
    setFallo('')
    try {
      await guardarPregunta({ dia: todayStr(), especialista: esp, texto, pilar: pilar || null, estado: 'pendiente' })
      setTexto(''); setPilar('')
    } catch (e) { setFallo((e as Error).message) }
  }

  return (
    <div>
      <div className="row between">
        <h1>Preguntas al equipo</h1>
        <button className="btn sm secondary" onClick={() => setInforme(true)}>Informe de consulta</button>
      </div>
      {(error || fallo) && <p className="error">No se ha podido {error ? 'cargar' : 'guardar'}: {error || fallo}</p>}
      {(!cfg || (!lista && !error)) && <p className="muted">Cargando…</p>}

      {cfg && especialistas.length === 0 && (
        <div className="card"><Empty>Añade abajo los especialistas a los que quieres preguntar.</Empty></div>
      )}

      {esp && (
        <>
          <div className="chips" style={{ marginBottom: '.6rem' }}>
            {especialistas.map((e) => {
              const n = pendientesDe(todas, e).length
              return <button key={e} type="button" className={'chip ' + (esp === e ? 'on' : '')} aria-pressed={esp === e} onClick={() => setElegido(e)}>{e}{n ? ` (${n})` : ''}</button>
            })}
          </div>
          <div className="card">
            <Field label={`Nueva pregunta para ${esp}`}><textarea value={texto} onChange={(e) => setTexto(e.target.value)} /></Field>
            <div className="row">
              <select style={{ width: 'auto' }} aria-label="Pilar" value={pilar} onChange={(e) => setPilar(e.target.value)}>
                <option value="">Pilar…</option>
                {temas().map((t) => <option key={t}>{t}</option>)}
              </select>
              <button className="btn sm" disabled={!texto.trim()} onClick={anadir}>Añadir</button>
            </div>
          </div>
          <h2>Pendientes ({pendientes.length})</h2>
          {pendientes.length === 0 && <div className="muted">Ninguna.</div>}
          {pendientes.map((p) => <Ficha key={p.id} p={p} especialistas={especialistas} />)}
          {respondidas.length > 0 && (
            <div style={{ marginTop: '.8rem' }}>
              <Section title={`Respondidas (${respondidas.length})`}>
                {respondidas.map((p) => <Ficha key={p.id} p={p} especialistas={especialistas} />)}
              </Section>
            </div>
          )}
        </>
      )}

      {cfg && (
        <div style={{ marginTop: '1.2rem' }}>
          <Section title="Editar especialistas" open={especialistas.length === 0}>
            <Especialistas lista={especialistas} preguntas={todas} guardar={(l) => saveCfg({ especialistas: l })} />
          </Section>
        </div>
      )}
    </div>
  )
}

/** Una pregunta: al tocarla se abre para anotar la respuesta, modificarla, reabrirla o borrarla. */
function Ficha({ p, especialistas }: { p: Pregunta; especialistas: string[] }) {
  const [abierta, setAbierta] = useState(false)
  const [respuesta, setRespuesta] = useState(p.respuesta ?? '')
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(p.texto)
  const [pilar, setPilar] = useState(p.pilar ?? '')
  const [esp, setEsp] = useState(p.especialista)
  const [confirmar, setConfirmar] = useState(false)
  const [fallo, setFallo] = useState('')
  const hacer = (f: () => Promise<void>, despues?: () => void) => {
    setFallo('')
    f().then(() => despues?.(), (e: Error) => setFallo(e.message))
  }
  const empezar = () => { setTexto(p.texto); setPilar(p.pilar ?? ''); setEsp(p.especialista); setEditando(true) }
  return (
    <div className="card tight pregunta">
      <button type="button" className="cuerpo" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
        <span>{p.pilar && <span className="tag gray">{p.pilar}</span>}{p.texto}</span>
        {p.estado === 'respondida' && <span className="small"><strong>Respuesta:</strong> {p.respuesta} <span className="muted">({fmtDate(p.respondida_el)})</span></span>}
      </button>
      {abierta && editando && (
        <div style={{ marginTop: '.5rem' }}>
          <Field label="Pregunta"><textarea value={texto} onChange={(e) => setTexto(e.target.value)} /></Field>
          <div className="row">
            <select style={{ width: 'auto' }} aria-label="Pilar" value={pilar} onChange={(e) => setPilar(e.target.value)}>
              <option value="">Pilar…</option>
              {temas().map((t) => <option key={t}>{t}</option>)}
            </select>
            <select style={{ width: 'auto' }} aria-label="Especialista" value={esp} onChange={(e) => setEsp(e.target.value)}>
              {especialistas.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginTop: '.4rem' }}>
            <button className="btn sm" disabled={!texto.trim()} onClick={() => hacer(() => guardarPregunta({ ...p, texto, pilar: pilar || null, especialista: esp }), () => setEditando(false))}>Guardar cambios</button>
            <button className="btn sm ghost" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {abierta && !editando && (
        <div style={{ marginTop: '.5rem' }}>
          <textarea aria-label="Respuesta recibida" placeholder="Respuesta recibida" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
          <div className="row" style={{ marginTop: '.3rem' }}>
            <button className="btn sm" disabled={!respuesta.trim()} onClick={() => hacer(() => responder(p, respuesta))}>Guardar respuesta</button>
            <button className="btn sm secondary" onClick={empezar}>✏️ Modificar pregunta</button>
            {p.estado === 'respondida' && <button className="btn sm ghost" onClick={() => hacer(() => reabrir(p))}>Reabrir</button>}
            {!confirmar && <button className="btn sm danger" onClick={() => setConfirmar(true)}>Borrar</button>}
            {confirmar && (
              <>
                <span className="muted small">¿Borrar la pregunta?</span>
                <button className="btn sm danger" onClick={() => hacer(() => borrarPregunta(p.id!))}>Sí, borrar</button>
                <button className="btn sm ghost" onClick={() => setConfirmar(false)}>No</button>
              </>
            )}
          </div>
        </div>
      )}
      {fallo && <p className="error small">No se ha podido guardar: {fallo}</p>}
    </div>
  )
}

/** Lista de especialistas de la usuaria: añadir, renombrar, ordenar y quitar. */
function Especialistas({ lista, preguntas, guardar }: { lista: string[]; preguntas: Pregunta[]; guardar: (l: string[]) => Promise<void> }) {
  const [nuevo, setNuevo] = useState('')
  const [aviso, setAviso] = useState('')
  const hacer = (f: () => Promise<void>) => { f().catch((e: Error) => setAviso('No se ha podido guardar: ' + e.message)) }
  const existe = (n: string, salvo?: string) => lista.some((x) => x !== salvo && x.toLowerCase() === n.toLowerCase())
  const anadir = () => {
    const n = nuevo.trim()
    if (!n) return
    if (existe(n)) { setAviso('Ya hay un especialista con ese nombre.'); return }
    setAviso(''); setNuevo('')
    hacer(() => guardar([...lista, n]))
  }
  const renombrar = (antes: string, valor: string) => {
    const n = valor.trim()
    if (!n || n === antes) return
    if (existe(n, antes)) { setAviso('Ya hay un especialista con ese nombre.'); return }
    setAviso('')
    hacer(async () => { await guardar(lista.map((x) => (x === antes ? n : x))); await renombrarEspecialista(antes, n) })
  }
  const mover = (i: number, d: number) => {
    const l = [...lista]
    ;[l[i], l[i + d]] = [l[i + d], l[i]]
    hacer(() => guardar(l))
  }
  const quitar = (e: string) => {
    const n = preguntas.filter((p) => p.especialista === e).length
    if (n) { setAviso(`${e} tiene ${n} ${n === 1 ? 'pregunta' : 'preguntas'}. Bórralas o pásalas a otro especialista antes de quitarlo.`); return }
    setAviso('')
    hacer(() => guardar(lista.filter((x) => x !== e)))
  }
  return (
    <div>
      {lista.map((e, i) => (
        <div className="row esp-fila" key={e}>
          <input type="text" aria-label={'Nombre de ' + e} defaultValue={e} onBlur={(ev) => renombrar(e, ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur() }} />
          <button type="button" className="btn sm ghost" aria-label={'Subir ' + e} disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
          <button type="button" className="btn sm ghost" aria-label={'Bajar ' + e} disabled={i === lista.length - 1} onClick={() => mover(i, 1)}>↓</button>
          <button type="button" className="btn sm danger" aria-label={'Quitar ' + e} onClick={() => quitar(e)}>Quitar</button>
        </div>
      ))}
      <div className="row esp-fila">
        <input type="text" aria-label="Nuevo especialista" placeholder="Nuevo especialista" value={nuevo} onChange={(ev) => setNuevo(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') anadir() }} />
        <button type="button" className="btn sm" disabled={!nuevo.trim()} onClick={anadir}>Añadir</button>
      </div>
      {aviso && <p className="error small">{aviso}</p>}
    </div>
  )
}
