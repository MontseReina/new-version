import { useState } from 'react'
import { Field } from '../../components/ui'
import { addDays, fmtDate, todayStr } from '../../lib/dates'
import { SelectorMes } from '../ciclo/Calendario'
import { nombreMes, sumaMeses } from '../ciclo/logica'
import { useEpisodios } from '../ciclo/useEpisodios'
import { ACCIONES, AREAS, PARA_POR_DEFECTO, VALORACIONES, borrarCambio, guardarCambio, useCambios, type Cambio } from './store'

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const finDeMes = (mes: string) => addDays(sumaMeses(mes, 1) + '-01', -1)
const dec = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const NOMBRE_ACCION = Object.fromEntries(ACCIONES)

/**
 * Evaluaciones · Lo que pruebo: cada mes, los cambios aplicados para intentar prevenir las disautonomías
 * (un suero nuevo, un suplemento que pasa de la comida a la cena…) y cómo fueron, junto a los episodios de ese
 * mes y del anterior para compararlos.
 */
export function LoQuePruebo() {
  const hoy = todayStr()
  const [mes, setMes] = useState(hoy.slice(0, 7))
  const { lista, error } = useCambios()
  const [editando, setEditando] = useState<Cambio | null>(null)
  const nuevo = (): Cambio => ({ dia: mes === hoy.slice(0, 7) ? hoy : mes + '-01', accion: 'empiezo', que: '', detalle: '', area: 'Suplementos', para: PARA_POR_DEFECTO })

  const delMes = (lista ?? []).filter((c) => c.dia.slice(0, 7) === mes).sort((a, b) => a.dia.localeCompare(b.dia))
  const ep = useEpisodios(mes + '-01', finDeMes(mes))
  const mesAnt = sumaMeses(mes, -1)
  const epAnt = useEpisodios(mesAnt + '-01', finDeMes(mesAnt))
  const desde = Math.min(Number(hoy.slice(0, 4)) - 1, ...(lista ?? []).map((c) => Number(c.dia.slice(0, 4))))

  return (
    <section className="card pruebo">
      <h2 style={{ marginTop: 0 }}>Lo que pruebo</h2>
      <p className="muted small" style={{ marginTop: 0 }}>Lo que cambias cada mes para prevenir las disautonomías, y cómo te va.</p>
      <SelectorMes id="pruebo" mes={mes} onMes={(m) => { setMes(m); setEditando(null) }} desde={desde} />

      <Episodios mes={mes} n={ep.lista.length} ingresos={ep.lista.filter((e) => e.urgencias).length} grav={ep.lista} ant={{ mes: mesAnt, n: epAnt.lista.length }} />

      {error && <div className="notice small">No se han podido leer los cambios. Revisa la conexión.</div>}
      {lista === null && !error && <p className="muted small">Cargando…</p>}
      {lista !== null && delMes.length === 0 && !editando && <p className="muted small">Nada anotado en {nombreMes(mes)}.</p>}

      <ul className="pruebo-lista">
        {delMes.map((c) => (editando?.id === c.id
          ? <li key={c.id}><Formulario c={editando!} onCambio={setEditando} onFin={() => setEditando(null)} /></li>
          : <li key={c.id}><Ficha c={c} onEditar={() => setEditando(c)} /></li>))}
      </ul>

      {editando && !editando.id
        ? <Formulario c={editando} onCambio={setEditando} onFin={() => setEditando(null)} />
        : !editando && <button type="button" className="btn secondary" onClick={() => setEditando(nuevo())}>+ Añadir un cambio</button>}
    </section>
  )
}

/** Episodios del mes frente al anterior: cuántos, con ingreso y la gravedad media. */
function Episodios({ mes, n, ingresos, grav, ant }: { mes: string; n: number; ingresos: number; grav: { gravedad: number | null }[]; ant: { mes: string; n: number } }) {
  const gs = grav.map((e) => e.gravedad).filter((g): g is number => g != null)
  const media = gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null
  const dif = n - ant.n
  return (
    <dl className="pruebo-ep">
      <div><dt>Episodios en {nombreMes(mes).replace(/ de \d+$/, '')}</dt><dd><strong>{n}</strong>{ingresos ? ` · ${ingresos} con ingreso` : ''}{media != null ? ` · gravedad media ${dec(media)}` : ''}</dd></div>
      <div><dt>{mayus(nombreMes(ant.mes).replace(/ de \d+$/, ''))}</dt><dd>{ant.n}{n || ant.n ? <span className={'pruebo-dif ' + (dif < 0 ? 'baja' : dif > 0 ? 'sube' : '')}>{dif < 0 ? ` · ${-dif} menos` : dif > 0 ? ` · ${dif} más este mes` : ' · igual'}</span> : null}</dd></div>
    </dl>
  )
}

function Ficha({ c, onEditar }: { c: Cambio; onEditar: () => void }) {
  const valorar = (v: Cambio['valoracion']) => void guardarCambio({ ...c, valoracion: c.valoracion === v ? null : v })
  return (
    <div className={'pruebo-ficha ' + (c.valoracion ?? '')}>
      <div className="row between">
        <span className="muted small">{fmtDate(c.dia)} · {NOMBRE_ACCION[c.accion]}</span>
        <span className="tag">{c.area}</span>
      </div>
      <div className="pruebo-que"><strong>{c.que}</strong>{c.detalle && <span className="muted"> · {c.detalle}</span>}</div>
      {c.para && c.para !== PARA_POR_DEFECTO && <div className="muted small">Para: {c.para}</div>}
      <div className="seg sm pruebo-val" role="group" aria-label={`Cómo te va: ${c.que}`}>
        {VALORACIONES.map(([k, l]) => <button type="button" key={k} className={(c.valoracion === k ? 'on ' : '') + k} aria-pressed={c.valoracion === k} onClick={() => valorar(k)}>{l}</button>)}
      </div>
      {c.nota && <p className="small pruebo-nota">{c.nota}</p>}
      <button type="button" className="linkbtn" onClick={onEditar}>Modificar o añadir una nota</button>
    </div>
  )
}

function Formulario({ c, onCambio, onFin }: { c: Cambio; onCambio: (c: Cambio) => void; onFin: () => void }) {
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const [seguro, setSeguro] = useState(false)
  const poner = (p: Partial<Cambio>) => onCambio({ ...c, ...p })
  const guardar = async () => {
    setEstado('guardando')
    try { await guardarCambio(c); onFin() } catch { setEstado('error') }
  }
  const borrar = async () => {
    if (!c.id) { onFin(); return }
    setEstado('guardando')
    try { await borrarCambio(c.id); onFin() } catch { setEstado('error') }
  }
  return (
    <form className="pruebo-form" onSubmit={(e) => { e.preventDefault(); if (c.que.trim()) void guardar() }}>
      <div className="seg" role="group" aria-label="Qué haces">
        {ACCIONES.map(([k, l]) => <button type="button" key={k} className={c.accion === k ? 'on' : ''} aria-pressed={c.accion === k} onClick={() => poner({ accion: k })}>{l}</button>)}
      </div>
      <Field label="Qué"><input id="pruebo-que" type="text" placeholder="Suero de ácido lipoico, PEA, tiamina…" value={c.que} onChange={(e) => poner({ que: e.target.value })} /></Field>
      <Field label="Cómo o cuándo" hint="Opcional: «de la comida a la cena», «en la semana crítica», «cada 15 días»."><input id="pruebo-detalle" type="text" value={c.detalle ?? ''} onChange={(e) => poner({ detalle: e.target.value })} /></Field>
      <div className="grid2">
        <Field label="Área">
          <select id="pruebo-area" value={c.area} onChange={(e) => poner({ area: e.target.value })}>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Desde"><input id="pruebo-dia" type="date" value={c.dia} onChange={(e) => e.target.value && poner({ dia: e.target.value })} /></Field>
      </div>
      <Field label="Para qué"><input id="pruebo-para" type="text" value={c.para ?? ''} onChange={(e) => poner({ para: e.target.value })} /></Field>
      {c.id && <Field label="Nota" hint="Lo que notas: si ha cambiado algo en los episodios, efectos que no esperabas…"><textarea id="pruebo-nota" value={c.nota ?? ''} onChange={(e) => poner({ nota: e.target.value })} /></Field>}
      {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
      <div className="row">
        <button type="submit" className="btn" disabled={!c.que.trim() || estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="btn ghost" onClick={onFin}>Cancelar</button>
        {c.id && (seguro
          ? <button type="button" className="btn danger" style={{ marginLeft: 'auto' }} onClick={() => void borrar()}>Sí, borrarlo</button>
          : <button type="button" className="btn ghost" style={{ marginLeft: 'auto' }} onClick={() => setSeguro(true)}>Borrar</button>)}
      </div>
    </form>
  )
}
