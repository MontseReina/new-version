import { useState } from 'react'
import { Ficha, emojiBloque, tonoBloque } from './Ficha'
import { fmtDate } from '../../lib/dates'
import { entradaDe, nuevoId, preguntasDe, type Ejercicio, type Hecho, type IntroCfg, type IntroDia } from './logica'

/** Mis ejercicios: una sección por bloque, cada ejercicio como ficha que se abre con un toque.
 *  El de ahora va abierto de entrada. Cada ficha abierta lleva su diario: unas preguntas propias que,
 *  al contestar cualquiera, marcan el ejercicio como hecho ese día; debajo, lo escrito el resto de la semana. */
export function Ejercicios({ cfg, saveCfg, hechos, date, esHoy, bloqueado, semana, tocarHecho, responder }: {
  cfg: IntroCfg; saveCfg: (p: Partial<IntroCfg>) => Promise<void>
  hechos: { [id: string]: Hecho }; date: string; esHoy: boolean; bloqueado: boolean
  semana: { day: string; value: IntroDia }[]
  tocarHecho: (id: string) => void; responder: (id: string, i: number, texto: string) => void
}) {
  const bloques = cfg.bloques ?? []
  const lista = cfg.ejercicios ?? []
  const [elegida, setAbierta] = useState<string | null | undefined>(undefined)
  const abierta = elegida === undefined ? cfg.activo ?? null : elegida
  const [quitar, setQuitar] = useState<string | null>(null)

  const borrar = (id: string) => {
    void saveCfg({ ejercicios: lista.filter((x) => x.id !== id), ...(cfg.activo === id ? { activo: null } : {}) })
    setQuitar(null)
  }

  const grupos = [
    ...bloques.map((b, i) => ({ id: b.id, nombre: b.nombre, sobre: b.sobre, emoji: emojiBloque(b, i), tono: tonoBloque(i), items: lista.filter((e) => e.bloque === b.id) })),
    { id: '', nombre: 'Otros', sobre: undefined, emoji: '✨', tono: 'tono0', items: lista.filter((e) => !bloques.some((b) => b.id === e.bloque)) },
  ].filter((g) => g.items.length || g.id)

  if (lista.length === 0) return <p className="muted">Todavía no hay ejercicios. Llegan con el informe mensual, o puedes añadir los tuyos al final de la página.</p>

  return (
    <div className="mis-ej">
      {grupos.map((g) => (
        <section key={g.id || 'otros'} className={'mis-ej-bloque ' + g.tono}>
          <header className="mis-ej-cab">
            <span className="mis-ej-emoji" aria-hidden="true">{g.emoji}</span>
            <div>
              <h3>{g.nombre}</h3>
              {g.sobre && <p>{g.sobre}</p>}
            </div>
            <span className="mis-ej-n">{g.items.length}</span>
          </header>
          {g.items.length === 0 && <p className="muted small mis-ej-vacio">Sin ejercicios todavía.</p>}
          {g.items.map((e) => {
            const open = abierta === e.id
            const ahora = cfg.activo === e.id
            return (
              <article key={e.id} className={'ficha' + (open ? ' abierta' : '') + (ahora ? ' ahora' : '')}>
                <button type="button" className="ficha-cab" aria-expanded={open} onClick={() => setAbierta(open ? null : e.id)}>
                  <span className="ficha-emoji" aria-hidden="true">{e.emoji ?? g.emoji}</span>
                  <span className="ficha-tit">
                    <strong>{e.titulo}</strong>
                    {!open && (e.frase ?? e.para) && <span className="ficha-resumen">{e.frase ?? e.para}</span>}
                  </span>
                  {hechos[e.id] && <span className="ficha-hecho" aria-label="hecho este día">✓</span>}
                  {ahora && <span className="ficha-ahora">Ahora</span>}
                  <span className="ficha-flecha" aria-hidden="true">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="ficha-dentro">
                    <Ficha e={e} />
                    <div className="ficha-diario">
                      <span className="ficha-sub">📝 Mi diario de este ejercicio · {esHoy ? 'hoy' : fmtDate(date)}</span>
                      {preguntasDe(e).map((q, i) => (
                        <label key={i} className="field">
                          <span>{q}</span>
                          <textarea rows={2} disabled={bloqueado} value={hechos[e.id]?.resp?.[i] ?? ''} onChange={(ev) => responder(e.id, i, ev.target.value)} />
                        </label>
                      ))}
                      {hechos[e.id]?.nota && <p className="muted small">Nota anterior: {hechos[e.id].nota}</p>}
                      <button type="button" className={'midia-check sm' + (hechos[e.id] ? ' on' : '')} aria-pressed={!!hechos[e.id]} disabled={bloqueado} onClick={() => tocarHecho(e.id)}>
                        <span className="midia-caja" aria-hidden="true">{hechos[e.id] ? '✓' : ''}</span>
                        {hechos[e.id] ? (esHoy ? 'Hecho hoy' : 'Hecho este día') : 'Lo hice, sin escribir'}
                      </button>
                    </div>
                    {(() => {
                      const otros = semana.filter((x) => x.day !== date && x.value.hechos?.[e.id]).sort((x, y) => (x.day < y.day ? 1 : -1))
                      if (!otros.length) return null
                      return (
                        <div className="ficha-semana">
                          <span className="ficha-sub">🗓️ Esta semana en este ejercicio</span>
                          {otros.map((x) => {
                            const ent = entradaDe(e, x.value.hechos![e.id])
                            return (
                              <div key={x.day} className="ficha-entrada">
                                <b>{fmtDate(x.day)}</b>
                                {ent.length ? ent.map(([q, r], k) => <p key={k}><span className="muted">{q}</span> {r}</p>) : <p className="muted">Hecho, sin escribir.</p>}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                    <div className="row ficha-acciones">
                      {ahora
                        ? <span className="muted small">Es tu ejercicio de ahora.</span>
                        : <button type="button" className="btn sm" onClick={() => void saveCfg({ activo: e.id })}>Trabajar ahora</button>}
                      {quitar === e.id ? (
                        <>
                          <span className="small">¿Quitarlo? Lo anotado se conserva.</span>
                          <button type="button" className="btn sm danger" onClick={() => borrar(e.id)}>Quitar</button>
                          <button type="button" className="btn sm ghost" onClick={() => setQuitar(null)}>Cancelar</button>
                        </>
                      ) : <button type="button" className="linkbtn" onClick={() => setQuitar(e.id)}>Quitar</button>}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}

/** Añadir un ejercicio propio: ficha sencilla con nombre, bloque, para qué y pasos (uno por línea). */
export function AnadirEjercicio({ cfg, saveCfg }: { cfg: IntroCfg; saveCfg: (p: Partial<IntroCfg>) => Promise<void> }) {
  const bloques = cfg.bloques ?? []
  const lista = cfg.ejercicios ?? []
  const [titulo, setTitulo] = useState('')
  const [bloque, setBloque] = useState('')
  const [para, setPara] = useState('')
  const [pasos, setPasos] = useState('')
  const [hecho, setHecho] = useState(false)

  const anadir = () => {
    if (!titulo.trim()) return
    const ps = pasos.split('\n').map((x) => x.trim()).filter(Boolean)
    const e: Ejercicio = {
      id: nuevoId(titulo, lista.map((x) => x.id)), titulo: titulo.trim(),
      ...(bloque ? { bloque } : {}), ...(para.trim() ? { para: para.trim() } : {}), ...(ps.length ? { pasos: ps } : {}),
    }
    void saveCfg({ ejercicios: [...lista, e], ...(cfg.activo ? {} : { activo: e.id }) })
    setTitulo(''); setPara(''); setPasos(''); setHecho(true)
  }

  return (
    <div>
      {hecho && <p className="small">Añadido. Lo tienes en «Mis ejercicios».</p>}
      <label className="field"><span>Nombre</span><input type="text" value={titulo} onChange={(e) => { setTitulo(e.target.value); setHecho(false) }} /></label>
      {bloques.length > 0 && (
        <label className="field">
          <span>Bloque</span>
          <select value={bloque} onChange={(e) => setBloque(e.target.value)}>
            <option value="">Sin bloque</option>
            {bloques.map((b, i) => <option key={b.id} value={b.id}>{emojiBloque(b, i)} {b.nombre}</option>)}
          </select>
        </label>
      )}
      <label className="field"><span>Para qué me sirve</span><textarea value={para} onChange={(e) => setPara(e.target.value)} /></label>
      <label className="field"><span>Paso a paso (un paso por línea)</span><textarea value={pasos} onChange={(e) => setPasos(e.target.value)} /></label>
      <button type="button" className="btn secondary" disabled={!titulo.trim()} onClick={anadir}>Añadir</button>
    </div>
  )
}
