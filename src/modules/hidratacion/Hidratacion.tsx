import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Vaso } from '../../components/Vaso'
import { Field, Section, Stepper } from '../../components/ui'
import { addDays, fmtDate, nowHM, todayStr } from '../../lib/dates'
import { listDaily, type Daily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { CHUPITO_ML, TAZA_ML, filaLevantar, levantarHecho, nivel, objetivo, suma, total, tocarLevantar, type HidraCfg, type HidraDia } from './logica'

const num = (s: string) => (s === '' ? null : Number(s))

/** Hidratación: vaso hacia el objetivo del día, botones rápidos, pauta y desglose. */
export default function Hidratacion() {
  const date = useParams().date ?? todayStr()
  const { value: d, set, state, rev, retry } = useDaily<HidraDia>('hidratacion', date)
  const [cfg, saveCfg] = useSettings<HidraCfg>('hidratacion')
  const obj = objetivo(cfg)
  const t = total(d)
  const lv = nivel(t, obj)
  const mar = d.mar_ml ?? 0
  const marMin = cfg?.mar_min_ml ?? 0
  const marTope = cfg?.mar_tope_ml ?? 0
  const pauta = cfg?.pauta ?? []

  // Botones rápidos: cada toque suma a su casilla (y al total si está tecleado a mano). Se deshace el último.
  const [ultimo, setUltimo] = useState<{ previo: HidraDia; txt: string } | null>(null)
  useEffect(() => setUltimo(null), [date])
  // Cada toque de hoy guarda su hora, para poder cruzarla con las comidas. `k` dice qué se bebió.
  const aplicar = (patch: HidraDia, ml: number, txt: string, k?: string) => {
    setUltimo({ previo: d, txt })
    const horas = k && date === todayStr() ? { horas: [...(d.horas ?? []), { h: nowHM(), k, ml }] } : {}
    set({ ...patch, ...horas, ...(d.total_ml != null ? { total_ml: Math.max(0, d.total_ml + ml) } : {}) })
  }
  const sumar = (k: 'agua' | 'mar' | 'caldo' | 'infusion' | 'cardo', txt: string) => {
    if (k === 'agua') aplicar({ agua_ml: (d.agua_ml ?? 0) + TAZA_ML }, TAZA_ML, txt, k)
    if (k === 'mar') aplicar({ mar_ml: mar + CHUPITO_ML }, CHUPITO_ML, txt, k)
    if (k === 'caldo') aplicar({ caldo_tazas: (d.caldo_tazas ?? 0) + 1 }, TAZA_ML, txt, k)
    if (k === 'infusion') aplicar({ infusion_tazas: (d.infusion_tazas ?? 0) + 1 }, TAZA_ML, txt, k)
    if (k === 'cardo') aplicar({ cardo_tazas: (d.cardo_tazas ?? 0) + 1 }, TAZA_ML, txt, k)
  }
  const deshacer = () => {
    if (!ultimo) return
    const p = ultimo.previo
    set({ agua_ml: p.agua_ml ?? null, mar_ml: p.mar_ml ?? null, caldo_tazas: p.caldo_tazas ?? null, infusion_tazas: p.infusion_tazas ?? null, cardo_tazas: p.cardo_tazas ?? null, total_ml: p.total_ml ?? null, pauta: p.pauta ?? {}, horas: p.horas ?? [] })
    setUltimo(null)
  }
  // Pauta: un toque anota las cantidades de esa fila; otro toque las quita.
  const tocarPauta = (i: number) => {
    const f = pauta[i]
    const hecho = !!d.pauta?.[i]
    const s = hecho ? -1 : 1
    const agua = (f.agua_ml ?? 0) * s, m = (f.mar_ml ?? 0) * s
    // Al quitar una fila de la pauta se quita también su hora.
    const sinHora = hecho ? { horas: (d.horas ?? []).filter((x) => x.k !== 'pauta:' + i) } : {}
    aplicar(
      { agua_ml: Math.max(0, (d.agua_ml ?? 0) + agua), mar_ml: Math.max(0, mar + m), pauta: { ...(d.pauta ?? {}), [i]: !hecho }, ...sinHora },
      agua + m,
      hecho ? `quitar «${f.momento}»` : f.momento,
      hecho ? undefined : 'pauta:' + i,
    )
  }

  // Última semana
  const [semana, setSemana] = useState<Daily<HidraDia>[]>([])
  useEffect(() => {
    let alive = true
    listDaily<HidraDia>('hidratacion', addDays(date, -6), date).then((r) => alive && setSemana(r), () => {})
    return () => { alive = false }
  }, [date, rev])
  const porDia = new Map(semana.map((r) => [r.day, r.value]))
  const dias = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6))

  const falta = t < obj ? `faltan ${obj - t} ml` : 'objetivo cumplido'
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  return (
    <div>
      <h1>Hidratación</h1>
      <DateNav date={date} base="/hidratacion" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <div className={'card vaso-card ' + lv}>
        <Vaso total={t} objetivo={obj} nivel={lv} />
        <div className="vaso-info">
          <div className="vaso-total"><strong>{t} ml</strong> de {obj} ml</div>
          <div className="muted small">{falta}</div>
          <div className="vaso-mar small">
            🌊 Agua de mar: <strong>{marMin ? `${mar} de ${marMin} ml` : `${mar} ml`}</strong>
            {marMin ? ' como mínimo' : ''}{marTope ? ` · tope ${marTope} ml` : ''}
            {marTope > 0 && mar > marTope && <div className="error">Has pasado el tope de {marTope} ml.</div>}
          </div>
          <div className="vaso-botones">
            <button type="button" className="btn sm secondary" onClick={() => sumar('agua', 'vaso de agua')}>💧 + vaso de agua</button>
            <button type="button" className="btn sm secondary" onClick={() => sumar('mar', 'chupito de agua de mar')}>🌊 + chupito de mar</button>
            <button type="button" className="btn sm secondary" onClick={() => sumar('caldo', 'taza de caldo')}>🍲 + taza de caldo</button>
            <button type="button" className="btn sm secondary" onClick={() => sumar('infusion', 'taza de infusión')}>🌼 + taza de infusión</button>
            <button type="button" className="btn sm secondary ancho" onClick={() => sumar('cardo', 'manzanilla con cardo mariano')}>🌿 + manzanilla con cardo mariano</button>
          </div>
          {ultimo && <button type="button" className="linkbtn small" onClick={deshacer}>↩︎ Deshacer «{ultimo.txt}»</button>}
        </div>
      </div>

      {/* Sin una fila para ello en la pauta, lo de «al levantarme» se anota con este botón. */}
      {cfg && filaLevantar(cfg) < 0 && (
        <button type="button" className={'midia-check' + (levantarHecho(cfg, d) ? ' on' : '')} aria-pressed={levantarHecho(cfg, d)} disabled={state === 'cargando'}
          onClick={() => { setUltimo(null); set(tocarLevantar(cfg, d, date === todayStr() ? nowHM() : null)) }}>
          <span className="midia-caja" aria-hidden="true">{levantarHecho(cfg, d) ? '✓' : ''}</span>
          Vaso de agua y chupito de mar al levantarme
        </button>
      )}

      {pauta.length > 0 && (
        <Section title="Mi pauta diaria" open>
          {pauta.map((f, i) => {
            const conCantidad = !!(f.agua_ml || f.mar_ml)
            const hecho = !!d.pauta?.[i]
            return (
              <div className="pauta" key={i}>
                <div>
                  <div className="momento">{f.momento}</div>
                  <div className="small">{f.que}</div>
                </div>
                {conCantidad && (
                  <button type="button" className={'btn sm ' + (hecho ? 'hecho' : 'secondary')} aria-pressed={hecho} onClick={() => tocarPauta(i)}>
                    {hecho ? '✓ Anotado' : '+ Anotar'}
                  </button>
                )}
              </div>
            )
          })}
          {(cfg?.reglas ?? []).length > 0 && (
            <div style={{ marginTop: '.6rem' }}>
              <h3>Reglas de ajuste</h3>
              {(cfg?.reglas ?? []).map((r) => <div key={r} className="small" style={{ margin: '.25rem 0' }}>• {r}</div>)}
            </div>
          )}
        </Section>
      )}

      <Section title="Qué he bebido hoy" open>
        <div className="notice small"><strong>0 también es un dato:</strong> pon 0 si no has tomado nada. Dejarlo en blanco significa «no apuntado».</div>
        <p className="muted small">Vaso o taza = {TAZA_ML} ml; chupito de agua de mar = {CHUPITO_ML} ml. Los botones de arriba suman aquí; si algo no cuadra, corrígelo a mano.</p>
        <div className="grid2">
          <Field label="Agua (ml)"><input type="number" inputMode="numeric" step={100} min={0} value={d.agua_ml ?? ''} onChange={(e) => set({ agua_ml: num(e.target.value) })} /></Field>
          <Field label={marMin ? `Agua de mar (ml) · mínimo ${marMin} ml` : 'Agua de mar (ml)'}><input type="number" inputMode="numeric" step={10} min={0} value={d.mar_ml ?? ''} onChange={(e) => set({ mar_ml: num(e.target.value) })} /></Field>
          <Field label="Caldo (tazas)"><Stepper value={d.caldo_tazas} onChange={(v) => set({ caldo_tazas: v })} /></Field>
          <Field label="Infusión (tazas)"><Stepper value={d.infusion_tazas} onChange={(v) => set({ infusion_tazas: v })} /></Field>
          <Field label="Manzanilla con cardo mariano (tazas)"><Stepper value={d.cardo_tazas} onChange={(v) => set({ cardo_tazas: v })} /></Field>
        </div>
        <Field label="Total del día (ml)" hint={d.total_ml == null ? `Suma automática: ${suma(d)} ml` : 'Tecleado a mano (borra para volver a la suma automática)'}>
          <input type="number" inputMode="numeric" step={TAZA_ML} min={0} value={d.total_ml ?? ''} placeholder={String(suma(d))} onChange={(e) => set({ total_ml: num(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Última semana">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Día</th><th>Total</th><th>Agua</th><th>Mar</th><th>Caldo</th><th>Infus.</th><th>Cardo</th></tr></thead>
            <tbody>
              {dias.map((dia) => {
                const l = dia === date ? d : porDia.get(dia)
                const tt = l && Object.keys(l).length ? total(l) : null
                return (
                  <tr key={dia}>
                    <td><Link to={`/hidratacion/${dia}`}>{fmtDate(dia)}</Link></td>
                    <td>{tt != null && <span className={'dot ' + nivel(tt, obj)} />}{tt ?? '—'}</td>
                    <td className="small">{l?.agua_ml ?? '—'}</td>
                    <td className="small">{l?.mar_ml ?? '—'}</td>
                    <td className="small">{l?.caldo_tazas ?? '—'}</td>
                    <td className="small">{l?.infusion_tazas ?? '—'}</td>
                    <td className="small">{l?.cardo_tazas ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Mis objetivos">
        <div className="grid2">
          <Field label="Líquidos al día (ml)"><input type="number" inputMode="numeric" step={100} min={0} defaultValue={obj} key={'o' + obj} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== obj) void saveCfg({ objetivo_ml: v }) }} /></Field>
          <Field label="Agua de mar: mínimo (ml)"><input type="number" inputMode="numeric" step={10} min={0} defaultValue={marMin} key={'m' + marMin} onBlur={(e) => { const v = Number(e.target.value); if (v !== marMin) void saveCfg({ mar_min_ml: v }) }} /></Field>
          <Field label="Agua de mar: tope (ml)"><input type="number" inputMode="numeric" step={10} min={0} defaultValue={marTope} key={'t' + marTope} onBlur={(e) => { const v = Number(e.target.value); if (v !== marTope) void saveCfg({ mar_tope_ml: v }) }} /></Field>
        </div>
        <p className="muted small">Pon 0 en el agua de mar si no quieres objetivo.</p>
      </Section>
    </div>
  )
}
