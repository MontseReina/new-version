import { useEffect, useState } from 'react'
import { MiniChart } from '../../components/MiniChart'
import { Field } from '../../components/ui'
import { fmtDate, nowHM, todayStr } from '../../lib/dates'
import { listAllEntries, removeEntry, saveEntry } from '../../store/repo'
import type { Entry } from '../../store/types'

/** Una pesada: el peso y, si la báscula es de bioimpedancia, la composición corporal. Cada una es
 *  un registro suelto del módulo `peso`. */
export interface Pesada {
  id?: string
  dia: string
  hora?: string | null
  kg?: number | null
  grasa_pct?: number | null
  musculo_kg?: number | null
  hueso_kg?: number | null
  agua_pct?: number | null
  notas?: string | null
}
type Medida = 'kg' | 'grasa_pct' | 'musculo_kg' | 'hueso_kg' | 'agua_pct'
const MEDIDAS: { k: Medida; campo: string; titulo: string; unidad: string }[] = [
  { k: 'kg', campo: 'Peso (kg)', titulo: 'Peso', unidad: 'kg' },
  { k: 'grasa_pct', campo: 'Masa grasa (%)', titulo: 'Grasa', unidad: '%' },
  { k: 'musculo_kg', campo: 'Masa muscular (kg)', titulo: 'Músculo', unidad: 'kg' },
  { k: 'hueso_kg', campo: 'Hueso (kg)', titulo: 'Hueso', unidad: 'kg' },
  { k: 'agua_pct', campo: 'Agua corporal (%)', titulo: 'Agua corporal', unidad: '%' },
]
const MODULO = 'peso'
const deFila = (e: Entry): Pesada => ({ id: e.id, dia: e.day, notas: e.note, ...(e.value as Partial<Pesada>) })
const corta = (dia: string) => fmtDate(dia).replace(/^\S+,\s*/, '')
const nueva = (): Pesada => ({ dia: todayStr(), hora: nowHM() })

/** Peso y composición corporal, como en Huma: última pesada, formulario, un gráfico por medida y la lista plegada. */
export function Peso() {
  const [filas, setFilas] = useState<Pesada[] | null>(null)
  const [error, setError] = useState(false)
  const [w, setW] = useState<Pesada>(nueva)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [borrar, setBorrar] = useState<string | null>(null)

  const leer = () => listAllEntries(MODULO).then((r) => { setFilas(r.map(deFila)); setError(false) }, () => setError(true))
  useEffect(() => { void leer() }, [])

  // De la más reciente a la más antigua.
  const pesadas = [...(filas ?? [])].sort((a, b) => (b.dia + (b.hora ?? '')).localeCompare(a.dia + (a.hora ?? '')))
  const ultima = pesadas[0]
  const asc = [...pesadas].reverse()
  const serie = (k: Medida) => asc.filter((x) => x[k] != null).map((x) => ({ x: corta(x.dia), y: x[k]! }))
  const detalle = (x: Pesada) => MEDIDAS.slice(1).filter((m) => x[m.k] != null).map((m) => `${m.titulo.toLowerCase()} ${x[m.k]} ${m.unidad}`)
  const hayAlgo = MEDIDAS.some((m) => w[m.k] != null)

  const guardar = async () => {
    setGuardando(true)
    try {
      const { dia, notas, id: _id, ...valor } = w
      await saveEntry({ module: MODULO, day: dia, note: notas || null, value: valor })
      setW(nueva()); setAbierto(false); await leer()
    } catch { setError(true) }
    setGuardando(false)
  }
  const quitar = async (id: string) => {
    try { await removeEntry(id); setBorrar(null); await leer() } catch { setError(true) }
  }

  return (
    <div>
      {error && <div className="notice small">No se ha podido leer o guardar. Revisa la conexión.</div>}
      {ultima && (
        <p className="small">Última: {ultima.kg != null && <strong>{ultima.kg} kg</strong>}{ultima.kg != null && ' · '}{fmtDate(ultima.dia)}{ultima.hora ? `, ${ultima.hora}` : ''}{detalle(ultima).map((t) => ' · ' + t)}</p>
      )}
      {abierto ? (
        <div className="card tight">
          <div className="grid2">
            <Field label="Fecha y hora">
              <input type="datetime-local" max={todayStr() + 'T23:59'} value={`${w.dia}T${w.hora || '00:00'}`}
                onChange={(e) => { const [d, h] = e.target.value.split('T'); if (d) setW({ ...w, dia: d, hora: h || null }) }} />
            </Field>
            {MEDIDAS.map((m) => (
              <Field key={m.k} label={m.campo}>
                <input type="number" inputMode="decimal" step={0.1} min={0} value={w[m.k] ?? ''} onChange={(e) => setW({ ...w, [m.k]: e.target.value === '' ? null : Number(e.target.value) })} />
              </Field>
            ))}
          </div>
          <Field label="Notas"><input type="text" value={w.notas ?? ''} onChange={(e) => setW({ ...w, notas: e.target.value })} /></Field>
          <div className="row">
            <button type="button" className="btn sm" disabled={!hayAlgo || guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar pesada'}</button>
            <button type="button" className="btn sm ghost" onClick={() => { setAbierto(false); setW(nueva()) }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn sm secondary" onClick={() => setAbierto(true)}>+ Nueva pesada</button>
      )}
      <p className="muted small">Una vez por semana, el mismo día y en las mismas condiciones.</p>

      <div className="charts">
        {MEDIDAS.map((m) => <MiniChart key={m.k} title={m.titulo} unit={m.unidad} kind={m.k === 'kg' ? 'bar' : 'line'} points={serie(m.k)} />)}
      </div>

      {pesadas.length > 0 && (
        <details className="pesadas">
          <summary>Pesadas apuntadas ({pesadas.length})</summary>
          {pesadas.map((x) => (
            <div className="item" key={x.id}>
              <div className="main">
                <div>{x.kg != null ? `${x.kg} kg` : 'Sin peso'}</div>
                <div className="meta">{[fmtDate(x.dia) + (x.hora ? `, ${x.hora}` : ''), ...detalle(x), ...(x.notas ? [x.notas] : [])].join(' · ')}</div>
              </div>
              {borrar === x.id
                ? <button type="button" className="btn sm danger" onClick={() => void quitar(x.id!)}>Borrar</button>
                : <button type="button" className="btn sm ghost" aria-label="Borrar esta pesada" onClick={() => setBorrar(x.id!)}>✕</button>}
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
