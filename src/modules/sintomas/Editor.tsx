import { useState } from 'react'
import { Field } from '../../components/ui'
import { GRUPOS_BASE, conOpciones, idLibre, leerGrupos, tieneEscala, type Grupo, type TipoGrupo } from './logica'

const TIPOS: [TipoGrupo, string][] = [['varias', 'Varias opciones'], ['una', 'Una sola opción'], ['detalle', 'Varias, con hora, gravedad y urgencias'], ['escala', 'Escala de 0 a 10']]
const FIJOS: { [t in TipoGrupo]?: string } = { hambre: 'Bloque de hambre', heces: 'Bloque de heces', micciones: 'Bloque de micciones', texto: 'Texto libre' }

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
  /** Adelanta una opción un puesto. */
  const moverOpcion = (g: Grupo, k: number) => {
    const ops = [...(g.opciones ?? [])]
    const [o] = ops.splice(k, 1)
    ops.splice(k - 1, 0, o)
    cambia(g.id, { opciones: ops })
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
          {!conOpciones(g.tipo) && g.tipo !== 'escala' && <div className="muted small" style={{ marginTop: '.3rem' }}>{FIJOS[g.tipo]}: se puede mover, renombrar o quitar.</div>}
          {(conOpciones(g.tipo) || g.tipo === 'escala') && (
            <div className="row" style={{ marginTop: '.4rem' }}>
              <select aria-label="Tipo de grupo" value={g.tipo} style={{ flex: 1, minWidth: '10rem' }} onChange={(e) => cambia(g.id, { tipo: e.target.value as TipoGrupo })}>
                {TIPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          )}
          {(g.tipo === 'una' || g.tipo === 'varias') && (
            <label className="check small" style={{ borderBottom: 'none' }}>
              <input type="checkbox" checked={!!g.con_escala} onChange={(e) => cambia(g.id, { con_escala: e.target.checked || undefined })} />
              <span>Añadir debajo una escala de 0 a 10</span>
            </label>
          )}
          {tieneEscala(g) && (
            <div className="grid2" style={{ marginTop: '.4rem' }}>
              <Field label="Qué significa el 0"><input type="text" defaultValue={g.min_txt ?? ''} key={'min' + (g.min_txt ?? '')} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (g.min_txt ?? '')) cambia(g.id, { min_txt: v || undefined }) }} /></Field>
              <Field label="Qué significa el 10"><input type="text" defaultValue={g.max_txt ?? ''} key={'max' + (g.max_txt ?? '')} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (g.max_txt ?? '')) cambia(g.id, { max_txt: v || undefined }) }} /></Field>
            </div>
          )}
          {conOpciones(g.tipo) && (
            <>
              <div className="chips" style={{ marginTop: '.5rem' }}>
                {(g.opciones ?? []).map((o, k) => (
                  <span className="chip" key={o.id} style={{ cursor: 'default' }}>
                    {k > 0 && <button type="button" className="quitar" style={{ padding: '0 .2rem 0 0' }} aria-label={`Mover ${o.nombre} antes`} title="Mover antes" onClick={() => moverOpcion(g, k)}>‹</button>}
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
