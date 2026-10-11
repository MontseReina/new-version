import { useState } from 'react'
import { nuevoId, type Ejercicio, type IntroCfg } from './logica'

/** Lista de ejercicios por bloque: se elige cuál se trabaja ahora (uno cada vez) y se añaden propios. */
export function Ejercicios({ cfg, saveCfg }: { cfg: IntroCfg; saveCfg: (p: Partial<IntroCfg>) => Promise<void> }) {
  const bloques = cfg.bloques ?? []
  const lista = cfg.ejercicios ?? []
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [bloque, setBloque] = useState('')
  const [quitar, setQuitar] = useState<string | null>(null)

  const anadir = () => {
    if (!titulo.trim()) return
    const e: Ejercicio = { id: nuevoId(titulo, lista.map((x) => x.id)), titulo: titulo.trim(), ...(bloque ? { bloque } : {}), ...(texto.trim() ? { texto: texto.trim() } : {}) }
    void saveCfg({ ejercicios: [...lista, e], ...(cfg.activo ? {} : { activo: e.id }) })
    setTitulo(''); setTexto('')
  }
  const borrar = (id: string) => {
    void saveCfg({ ejercicios: lista.filter((x) => x.id !== id), ...(cfg.activo === id ? { activo: null } : {}) })
    setQuitar(null)
  }

  const grupos = [
    ...bloques.map((b) => ({ id: b.id, nombre: b.nombre, sobre: b.sobre, items: lista.filter((e) => e.bloque === b.id) })),
    { id: '', nombre: bloques.length ? 'Otros' : '', sobre: undefined, items: lista.filter((e) => !bloques.some((b) => b.id === e.bloque)) },
  ].filter((g) => g.items.length || g.id)

  return (
    <div>
      {lista.length === 0 && <p className="muted">Todavía no hay ejercicios. Llegan con el informe mensual, o puedes añadir los tuyos aquí abajo.</p>}
      {grupos.map((g) => (
        <div key={g.id || 'otros'} className="intro-bloque">
          {g.nombre && <h3>{g.nombre}</h3>}
          {g.sobre && <p className="muted small">{g.sobre}</p>}
          {g.items.length === 0 && <p className="muted small">Sin ejercicios todavía.</p>}
          {g.items.map((e) => (
            <div className="item" key={e.id}>
              <div className="main">
                <strong>{e.titulo}</strong>
                {e.texto && <div className="intro-texto small">{e.texto}</div>}
                {quitar === e.id ? (
                  <div className="row intro-quitar">
                    <span className="small">¿Quitar este ejercicio? Lo que ya anotaste se conserva.</span>
                    <button type="button" className="btn sm danger" onClick={() => borrar(e.id)}>Quitar</button>
                    <button type="button" className="btn sm ghost" onClick={() => setQuitar(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button type="button" className="linkbtn" onClick={() => setQuitar(e.id)}>Quitar</button>
                )}
              </div>
              {cfg.activo === e.id
                ? <span className="tag">Ahora</span>
                : <button type="button" className="btn sm secondary" onClick={() => void saveCfg({ activo: e.id })}>Trabajar ahora</button>}
            </div>
          ))}
        </div>
      ))}

      <h3>Añadir un ejercicio</h3>
      <label className="field"><span>Nombre</span><input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
      {bloques.length > 0 && (
        <label className="field">
          <span>Bloque</span>
          <select value={bloque} onChange={(e) => setBloque(e.target.value)}>
            <option value="">Sin bloque</option>
            {bloques.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </label>
      )}
      <label className="field"><span>En qué consiste</span><textarea value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
      <button type="button" className="btn secondary" disabled={!titulo.trim()} onClick={anadir}>Añadir</button>
    </div>
  )
}
