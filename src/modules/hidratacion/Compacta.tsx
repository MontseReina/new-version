import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CHUPITO_ML, TAZA_ML, filaLevantar, levantarHecho, type PautaFila } from './logica'
import type { useHidra } from './useHidra'

export type Hidra = ReturnType<typeof useHidra>

/** Cantidades de agua de los botones rápidos (ml). */
const VASOS = [250, 300, 500]

/** Hidratación reducida, dentro de Disautonomía: el total del día, la pauta en el orden en que se toma
 *  (un toque la anota con su hora) y los botones rápidos. El desglose y la semana siguen en su pantalla; la pauta se edita al final de Disautonomía. */
export function HidraCompacta({ date, h }: { date: string; h: Hidra }) {
  const { value: d, cfg, obj, t, lv, pauta, state } = h
  const mar = d.mar_ml ?? 0
  const marMin = cfg?.mar_min_ml ?? 0
  const marTope = cfg?.mar_tope_ml ?? 0
  const pct = Math.min(100, Math.round((t / obj) * 100))
  const conCantidad = pauta.map((f, i) => [f, i] as const).filter(([f]) => f.agua_ml || f.mar_ml)

  return (
    <div className="card sint-grupo hidra-mini">
      <h3>💧 Hidratación</h3>
      <div className="row between">
        <div className="vaso-total"><strong>{t.toLocaleString('es-ES')} ml</strong> de {obj.toLocaleString('es-ES')} ml</div>
        <span className="muted small">🌊 mar {mar}{marMin ? `/${marMin}` : ''} ml</span>
      </div>
      <div className="barra" style={{ margin: '.35rem 0 .6rem' }}><i className={lv} style={{ width: pct + '%' }} /></div>
      {marTope > 0 && mar > marTope && <div className="error small">Has pasado el tope de agua de mar ({marTope} ml).</div>}

      <fieldset className="sint" disabled={state === 'cargando'}>
        {cfg && filaLevantar(cfg) < 0 && (
          <button type="button" className={'midia-check sm' + (levantarHecho(cfg, d) ? ' on' : '')} aria-pressed={levantarHecho(cfg, d)} onClick={h.levantar}>
            <span className="midia-caja" aria-hidden="true">{levantarHecho(cfg, d) ? '✓' : ''}</span>
            Vaso de agua y chupito de mar al levantarme
          </button>
        )}
        {conCantidad.map(([f, i]) => {
          const hecho = !!d.pauta?.[i]
          const hora = h.horaPauta(i)
          return (
            <button type="button" key={i} className={'midia-check sm' + (hecho ? ' on' : '')} aria-pressed={hecho} onClick={() => h.tocarPauta(i)}>
              <span className="midia-caja" aria-hidden="true">{hecho ? '✓' : ''}</span>
              <span style={{ flex: 1 }}>
                <span className="muted small">{f.momento}</span><br />
                {f.que}
              </span>
              {hecho && hora && <span className="muted small">{hora}</span>}
            </button>
          )
        })}

        <div className="vaso-botones tres" style={{ marginTop: '.5rem' }}>
          {VASOS.map((ml) => <button type="button" key={ml} className="btn sm secondary" onClick={() => h.sumar('agua', `${ml} ml de agua`, ml)}>💧 + {ml} ml</button>)}
        </div>
        <div className="vaso-botones" style={{ marginTop: '.35rem' }}>
          <button type="button" className="btn sm secondary" onClick={() => h.sumar('mar', 'chupito de agua de mar')}>🌊 + chupito de mar</button>
          <button type="button" className="btn sm secondary" onClick={() => h.sumar('caldo', 'taza de caldo')}>🍲 + caldo</button>
          <button type="button" className="btn sm secondary" onClick={() => h.sumar('infusion', 'taza de infusión')}>🌼 + infusión</button>
          <button type="button" className="btn sm secondary" onClick={() => h.sumar('cardo', 'manzanilla con cardo mariano')}>🌿 + manzanilla con cardo</button>
        </div>
        {h.ultimo && <button type="button" className="linkbtn small" onClick={h.deshacer}>↩︎ Deshacer «{h.ultimo.txt}»</button>}
      </fieldset>
      <p className="muted small" style={{ margin: '.5rem 0 0' }}>Taza = {TAZA_ML} ml · chupito = {CHUPITO_ML} ml. <Link to={'/hidratacion/' + date}>Ver el desglose y la semana</Link></p>
    </div>
  )
}

/** «Editar mi pauta», al final de Disautonomía junto a «Editar mis grupos». */
export function EditarPauta({ h }: { h: Hidra }) {
  return <EditorPauta pauta={h.pauta} guardar={(p, antes) => { void h.saveCfg({ pauta: p }); if (antes) h.recolocar(antes) }} />
}

/** Edición de la pauta de hidratación: filas en el orden del día, con qué se toma y cuánto suma. */
function EditorPauta({ pauta, guardar }: { pauta: PautaFila[]; guardar: (p: PautaFila[], antes?: number[]) => void }) {
  const [borrar, setBorrar] = useState<number | null>(null)
  const cambia = (i: number, patch: Partial<PautaFila>) => guardar(pauta.map((f, k) => (k === i ? { ...f, ...patch } : f)))
  const mover = (i: number, n: number) => {
    const pos = pauta.map((_, k) => k)
    const l = [...pauta]; const [f] = l.splice(i, 1); l.splice(i + n, 0, f)
    const [p] = pos.splice(i, 1); pos.splice(i + n, 0, p)
    guardar(l, pos)
  }
  const num = (v: string) => { const n = Number(v); return v === '' || !(n > 0) ? undefined : n }
  return (
    <div>
      <p className="muted small">Una fila por toma, en el orden en que la haces. «Agua» y «Mar» son los mililitros que suma al anotarla. Una fila cuyo momento diga «al levantarme» marca tu hora de levantarte.</p>
      {pauta.map((f, i) => (
        <div className="editor-grupo" key={i + f.momento + f.que}>
          <div className="row">
            <input type="text" aria-label="Momento" placeholder="Momento (p. ej. Al levantarme)" defaultValue={f.momento} style={{ flex: 1, minWidth: '8rem', fontWeight: 700 }} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.momento) cambia(i, { momento: v }) }} />
            <button type="button" className="btn sm ghost" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
            <button type="button" className="btn sm ghost" aria-label="Bajar" disabled={i === pauta.length - 1} onClick={() => mover(i, 1)}>↓</button>
          </div>
          <input type="text" aria-label="Qué tomo" placeholder="Qué tomo" defaultValue={f.que} style={{ width: '100%', marginTop: '.35rem' }} onBlur={(e) => { const v = e.target.value.trim(); if (v !== f.que) cambia(i, { que: v }) }} />
          <div className="grid2" style={{ marginTop: '.35rem' }}>
            <label className="field"><span>Agua (ml)</span><input type="number" inputMode="numeric" min={0} step={10} defaultValue={f.agua_ml ?? ''} onBlur={(e) => { const v = num(e.target.value); if (v !== f.agua_ml) cambia(i, { agua_ml: v }) }} /></label>
            <label className="field"><span>Mar (ml)</span><input type="number" inputMode="numeric" min={0} step={5} defaultValue={f.mar_ml ?? ''} onBlur={(e) => { const v = num(e.target.value); if (v !== f.mar_ml) cambia(i, { mar_ml: v }) }} /></label>
          </div>
          {borrar === i
            ? <span className="small">¿Quitar esta fila? <button type="button" className="linkbtn" onClick={() => { guardar(pauta.filter((_, k) => k !== i), pauta.map((_, k) => k).filter((k) => k !== i)); setBorrar(null) }}>Sí, quitar</button> · <button type="button" className="linkbtn" onClick={() => setBorrar(null)}>No</button></span>
            : <button type="button" className="linkbtn" onClick={() => setBorrar(i)}>Quitar fila</button>}
        </div>
      ))}
      <button type="button" className="btn sm secondary" onClick={() => guardar([...pauta, { momento: 'Nueva toma', que: '' }])}>+ Añadir fila</button>
      <p className="muted small">Al cambiar el orden, lo marcado en el día abierto se mueve con su fila. Lo ya sumado en otros días no cambia.</p>
    </div>
  )
}
