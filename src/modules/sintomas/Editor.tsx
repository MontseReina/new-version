import { useState } from 'react'
import { Field } from '../../components/ui'
import { GRUPOS_BASE, idLibre, leerGrupos, type Grupo, type TipoGrupo } from './logica'

const TIPOS: [TipoGrupo, string][] = [['varias', 'Varias opciones'], ['una', 'Una sola opción'], ['episodio', 'Episodio (sí/no, intensidad, ingreso)']]

/** Edición de los grupos y sus opciones. La lista se guarda en los ajustes de la usuaria. */
export function Editor({ grupos, guardar }: { grupos: Grupo[]; guardar: (g: Grupo[]) => void }) {
  const [nuevas, setNuevas] = useState<{ [g: string]: string }>({})
  const [nuevo, setNuevo] = useState('')
  const [borrar, setBorrar] = useState<string | null>(null)
  const [pegado, setPegado] = useState('')
  const [aviso, setAviso] = useState('')

  const cambia = (id: string, patch: Partial<Grupo>) => guardar(grupos.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  const mover = (i: number, n: number) => {
    const l = [...grupos]
    const [g] = l.splice(i, 1)
    l.splice(i + n, 0, g)
    guardar(l)
  }
  const anadirOpcion = (g: Grupo) => {
    const nombre = (nuevas[g.id] ?? '').trim()
    if (!nombre) return
    const ops = g.opciones ?? []
    cambia(g.id, { opciones: [...ops, { id: idLibre(nombre, ops.map((o) => o.id)), nombre }] })
    setNuevas((x) => ({ ...x, [g.id]: '' }))
  }
  const anadirGrupo = () => {
    const nombre = nuevo.trim()
    if (!nombre) return
    guardar([...grupos, { id: idLibre(nombre, grupos.map((g) => g.id)), nombre, tipo: 'varias', opciones: [] }])
    setNuevo('')
  }
  const cargar = () => {
    const l = leerGrupos(pegado)
    if (!l) { setAviso('El texto no es una configuración válida. No se ha cambiado nada.'); return }
    guardar(l); setPegado(''); setAviso(`Configuración cargada: ${l.length} grupos.`)
  }

  return (
    <div>
      <p className="muted small">Los cambios se guardan al momento. Quitar una opción no borra lo ya registrado con ella.</p>
      {grupos.map((g, i) => (
        <div className="editor-grupo" key={g.id}>
          <div className="row">
            <input type="text" aria-label="Nombre del grupo" defaultValue={g.nombre} key={g.nombre} style={{ flex: 1, minWidth: '8rem', fontWeight: 700 }} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== g.nombre) cambia(g.id, { nombre: v }) }} />
            <button type="button" className="btn sm ghost" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
            <button type="button" className="btn sm ghost" aria-label="Bajar" disabled={i === grupos.length - 1} onClick={() => mover(i, 1)}>↓</button>
          </div>
          <div className="row" style={{ marginTop: '.4rem' }}>
            <select aria-label="Tipo de grupo" value={g.tipo} style={{ flex: 1, minWidth: '10rem' }} onChange={(e) => cambia(g.id, { tipo: e.target.value as TipoGrupo })}>
              {TIPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          {g.tipo !== 'episodio' && (
            <>
              <div className="chips" style={{ marginTop: '.5rem' }}>
                {(g.opciones ?? []).map((o) => (
                  <span className="chip" key={o.id} style={{ cursor: 'default' }}>
                    {o.nombre} <button type="button" className="quitar" aria-label={`Quitar ${o.nombre}`} onClick={() => cambia(g.id, { opciones: g.opciones!.filter((x) => x.id !== o.id) })}>×</button>
                  </span>
                ))}
              </div>
              <form className="row" style={{ marginTop: '.4rem' }} onSubmit={(e) => { e.preventDefault(); anadirOpcion(g) }}>
                <input type="text" aria-label={`Nueva opción de ${g.nombre}`} placeholder="Nueva opción" style={{ flex: 1, minWidth: '8rem' }} value={nuevas[g.id] ?? ''} onChange={(e) => setNuevas((x) => ({ ...x, [g.id]: e.target.value }))} />
                <button className="btn sm secondary" disabled={!(nuevas[g.id] ?? '').trim()}>Añadir</button>
              </form>
              {g.tipo === 'varias' && (
                <label className="check small" style={{ borderBottom: 'none' }}>
                  <input type="checkbox" checked={!!g.neutra} onChange={(e) => cambia(g.id, { neutra: e.target.checked })} />
                  <span>La primera opción significa «nada» y quita las demás</span>
                </label>
              )}
            </>
          )}
          {borrar === g.id
            ? <span className="small">¿Quitar el grupo «{g.nombre}»? <button type="button" className="linkbtn" onClick={() => { guardar(grupos.filter((x) => x.id !== g.id)); setBorrar(null) }}>Sí, quitar</button> · <button type="button" className="linkbtn" onClick={() => setBorrar(null)}>No</button></span>
            : <button type="button" className="linkbtn" onClick={() => setBorrar(g.id)}>Quitar grupo</button>}
        </div>
      ))}

      <form className="row" style={{ margin: '.8rem 0' }} onSubmit={(e) => { e.preventDefault(); anadirGrupo() }}>
        <input type="text" aria-label="Nombre del grupo nuevo" placeholder="Grupo nuevo" style={{ flex: 1, minWidth: '8rem' }} value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
        <button className="btn sm" disabled={!nuevo.trim()}>+ Grupo</button>
      </form>

      <Field label="Cargar una configuración" hint="Pega aquí el texto de configuración que te hayan preparado. Sustituye a los grupos actuales; lo ya registrado se conserva.">
        <textarea value={pegado} onChange={(e) => { setPegado(e.target.value); setAviso('') }} />
      </Field>
      <div className="row">
        <button type="button" className="btn sm secondary" disabled={!pegado.trim()} onClick={cargar}>Cargar</button>
        <button type="button" className="linkbtn" onClick={() => { guardar(GRUPOS_BASE); setAviso('Grupos de partida restaurados.') }}>Volver a los grupos de partida</button>
      </div>
      {aviso && <p className="small" role="status">{aviso}</p>}
    </div>
  )
}
