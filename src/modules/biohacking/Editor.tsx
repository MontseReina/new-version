import { useState } from 'react'
import { Field } from '../../components/ui'
import { DIAS_CORTOS, ICONOS, MOMENTOS, type Bloque, type Momento, type Practica } from './logica'
import { ICONO } from './Iconos'

const nuevoId = () => Math.random().toString(36).slice(2, 10)
const mover = <T,>(xs: T[], i: number, d: number) => {
  const j = i + d
  if (j < 0 || j >= xs.length) return xs
  const c = [...xs]; [c[i], c[j]] = [c[j], c[i]]; return c
}

/** Editar la rutina: bloques (nombre, minutos, momento, días, icono, nota) y sus prácticas.
 *  Se trabaja sobre una copia y se guarda todo de una vez. Lo ya marcado en días pasados se conserva. */
export function Editor({ bloques, guardar, cancelar }: { bloques: Bloque[]; guardar: (b: Bloque[]) => Promise<void>; cancelar: () => void }) {
  const [bs, setBs] = useState<Bloque[]>(() => structuredClone(bloques))
  const [abierto, setAbierto] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')

  const cambiar = (id: string, p: Partial<Bloque>) => setBs(bs.map((b) => (b.id === id ? { ...b, ...p } : b)))
  const cambiarP = (b: Bloque, pid: string, p: Partial<Practica>) => cambiar(b.id, { practicas: b.practicas.map((x) => (x.id === pid ? { ...x, ...p } : x)) })
  const nuevoBloque = () => {
    const b: Bloque = { id: nuevoId(), nombre: '', momento: 'manana', ico: 'otro', practicas: [{ id: nuevoId(), nombre: '' }] }
    setBs([...bs, b]); setAbierto(b.id)
  }
  const ok = async () => {
    setEstado('guardando')
    const limpio = bs
      .map((b) => ({ ...b, nombre: b.nombre.trim(), practicas: b.practicas.map((p) => ({ ...p, nombre: p.nombre.trim(), nota: p.nota?.trim() || undefined })).filter((p) => p.nombre) }))
      .filter((b) => b.nombre)
    try { await guardar(limpio) } catch { setEstado('error') }
  }

  return (
    <div className="bio">
      <div className="bio-head">
        <button type="button" className="bio-back" aria-label="Volver" onClick={cancelar}>←</button>
        <h1>Editar rutina</h1>
        <p className="muted small">Toca un bloque para cambiarlo. Sin días marcados, el bloque toca todos los días.</p>
      </div>

      {bs.map((b, i) => (
        <div className="card bio-ed" key={b.id}>
          <div className="row between">
            <button type="button" className="bio-ed-tit" onClick={() => setAbierto(abierto === b.id ? null : b.id)}>
              <span className={'bio-ico sm ' + (b.ico ?? 'otro')} aria-hidden="true">{ICONO[b.ico ?? 'otro']}</span>
              <strong>{b.nombre || 'Bloque sin nombre'}</strong>
            </button>
            <span className="row">
              <button type="button" className="btn sm ghost" aria-label="Subir" disabled={i === 0} onClick={() => setBs(mover(bs, i, -1))}>↑</button>
              <button type="button" className="btn sm ghost" aria-label="Bajar" disabled={i === bs.length - 1} onClick={() => setBs(mover(bs, i, 1))}>↓</button>
            </span>
          </div>
          {abierto === b.id && (
            <div className="bio-ed-cuerpo">
              <Field label="Nombre del bloque"><input type="text" value={b.nombre} onChange={(e) => cambiar(b.id, { nombre: e.target.value })} /></Field>
              <Field label="Minutos (para el temporizador)">
                <input type="number" inputMode="numeric" min={0} value={b.minutos ?? ''} onChange={(e) => cambiar(b.id, { minutos: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} />
              </Field>
              <div className="field"><span>Momento del día</span>
                <div className="chips">
                  {MOMENTOS.map(([k, t]) => <button type="button" key={k} className={'chip' + (b.momento === k ? ' on' : '')} onClick={() => cambiar(b.id, { momento: b.momento === k ? undefined : (k as Momento) })}>{t}</button>)}
                </div>
              </div>
              <div className="field"><span>Días que toca</span>
                <div className="chips">
                  {DIAS_CORTOS.map((t, d) => {
                    const on = !!b.dias?.includes(d)
                    return <button type="button" key={t} className={'chip' + (on ? ' on' : '')} onClick={() => cambiar(b.id, { dias: on ? b.dias!.filter((x) => x !== d) : [...(b.dias ?? []), d].sort() })}>{t}</button>
                  })}
                </div>
              </div>
              <div className="field"><span>Icono</span>
                <div className="chips">
                  {ICONOS.map((k) => <button type="button" key={k} aria-label={k} className={'chip bio-chip-ico' + (b.ico === k ? ' on' : '')} onClick={() => cambiar(b.id, { ico: k })}><span className={'bio-ico sm ' + k}>{ICONO[k]}</span></button>)}
                </div>
              </div>
              <Field label="Nota del bloque (opcional)"><textarea value={b.nota ?? ''} onChange={(e) => cambiar(b.id, { nota: e.target.value || undefined })} /></Field>

              <h3>Prácticas</h3>
              {b.practicas.map((p, j) => (
                <div className={'bio-ed-p' + (p.sep ? ' sep' : '')} key={p.id}>
                  <div className="row">
                    <input type="text" value={p.nombre} placeholder={p.sep ? 'Subtítulo' : 'Práctica'} onChange={(e) => cambiarP(b, p.id, { nombre: e.target.value })} />
                    <button type="button" className="btn sm ghost" aria-label="Subir" disabled={j === 0} onClick={() => cambiar(b.id, { practicas: mover(b.practicas, j, -1) })}>↑</button>
                    <button type="button" className="btn sm ghost" aria-label="Bajar" disabled={j === b.practicas.length - 1} onClick={() => cambiar(b.id, { practicas: mover(b.practicas, j, 1) })}>↓</button>
                    <button type="button" className="btn sm ghost" aria-label="Quitar" onClick={() => cambiar(b.id, { practicas: b.practicas.filter((x) => x.id !== p.id) })}>✕</button>
                  </div>
                  {!p.sep && <input type="text" className="bio-ed-nota" value={p.nota ?? ''} placeholder="Indicación (opcional)" onChange={(e) => cambiarP(b, p.id, { nota: e.target.value })} />}
                </div>
              ))}
              <div className="row">
                <button type="button" className="btn sm secondary" onClick={() => cambiar(b.id, { practicas: [...b.practicas, { id: nuevoId(), nombre: '' }] })}>+ Práctica</button>
                <button type="button" className="btn sm ghost" onClick={() => cambiar(b.id, { practicas: [...b.practicas, { id: nuevoId(), nombre: '', sep: true }] })}>+ Subtítulo</button>
              </div>
              <div className="bio-ed-borrar">
                {borrando === b.id ? (
                  <span className="small">¿Quitar el bloque «{b.nombre}»? <button type="button" className="linkbtn" onClick={() => { setBs(bs.filter((x) => x.id !== b.id)); setBorrando(null) }}>Sí, quitar</button> · <button type="button" className="linkbtn" onClick={() => setBorrando(null)}>No</button></span>
                ) : (
                  <button type="button" className="linkbtn" onClick={() => setBorrando(b.id)}>Quitar este bloque</button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <button type="button" className="bio-add" onClick={nuevoBloque}>+ Bloque</button>
      {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
      <div className="bio-pie">
        <button type="button" className="btn" disabled={estado === 'guardando'} onClick={() => void ok()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar rutina'}</button>
        <button type="button" className="btn ghost" onClick={cancelar}>Cancelar</button>
      </div>
    </div>
  )
}
