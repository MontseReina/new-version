import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Empty, Field, Section, TriButton, type TriState } from '../../components/ui'
import { addDays, fmtDate, todayStr } from '../../lib/dates'
import { listDaily, type Daily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { DIAS, MOMENTOS, VIAS, agendados, clave, conCambio, cumplimiento, delDia, diasDesde, esAgendado, mismaPauta, momentosDe, nivel, periodicos, proxima, type Producto, type SuplCfg, type SuplDia, type Toma } from './logica'

const nuevoId = () => Math.random().toString(36).slice(2, 10)

/** Suplementos, como la Medicación de Huma: una fila por producto y una columna por momento.
 *  Un toque ✓ tomado · dos ✗ no tomado · tres NP no precisa. */
export default function Suplementos() {
  const date = useParams().date ?? todayStr()
  const { value: d, set, state, rev, retry } = useDaily<SuplDia>('suplementos', date)
  const [cfg, saveCfg] = useSettings<SuplCfg>('suplementos')
  const lista = cfg?.lista ?? []
  const tomas = d.tomas ?? {}
  const hoy = delDia(lista, date)
  const per = periodicos(lista, date)
  const age = agendados(lista, date)
  const c = cumplimiento(lista, d, date)
  const lv = nivel(c.pct)
  const [editando, setEditando] = useState<Producto | 'nuevo' | null>(null)
  const [retirando, setRetirando] = useState<string | null>(null)

  const marcar = (k: string, v: TriState) => {
    const t = { ...tomas }
    if (v) t[k] = v as Toma
    else delete t[k]
    set({ tomas: t })
  }
  const columnas = [...MOMENTOS.filter(([k]) => hoy.some((p) => p.momentos?.includes(k))), ...(hoy.some((p) => !p.momentos?.length) ? ([['demanda', 'A demanda']] as const) : [])]
  const marcarColumna = (m: string) => {
    const t = { ...tomas }
    hoy.filter((p) => momentosDe(p).includes(m)).forEach((p) => { if (!t[clave(p, m)]) t[clave(p, m)] = 'si' })
    set({ tomas: t })
  }

  /** `desde`: fecha desde la que vale un cambio de momentos, días o dosis (vacía = todos los días). */
  const guardarProducto = (p: Producto, desde?: string) => {
    const antes = lista.find((x) => x.id === p.id)
    const nuevo = antes && !esAgendado(p) && !p.cada_dias ? (mismaPauta(antes, p) ? { ...p, ...(antes.historial ? { historial: antes.historial } : {}) } : conCambio(antes, p, desde)) : p
    void saveCfg({ lista: antes ? lista.map((x) => (x.id === p.id ? nuevo : x)) : [...lista, nuevo] })
    setEditando(null)
  }
  const ponerFechas = (p: Producto, fechas: string[]) =>
    void saveCfg({ lista: lista.map((x) => (x.id === p.id ? { ...x, fechas: [...new Set(fechas)].sort() } : x)) })
  const [fechaNueva, setFechaNueva] = useState<{ [id: string]: string }>({})
  const retirar = (p: Producto) => {
    void saveCfg({ lista: lista.map((x) => (x.id === p.id ? { ...x, retirado: date } : x)) })
    setRetirando(null)
  }

  // Últimas veces de lo que no es diario (se mira hasta 90 días atrás).
  const [historia, setHistoria] = useState<Daily<SuplDia>[]>([])
  const hayPeriodicos = per.length + age.length > 0
  useEffect(() => {
    if (!hayPeriodicos) return
    let alive = true
    listDaily<SuplDia>('suplementos', addDays(date, -90), date).then((r) => alive && setHistoria(r), () => {})
    return () => { alive = false }
  }, [date, rev, hayPeriodicos])
  const estadoPeriodico = (p: Producto) => {
    const previos = historia.filter((r) => r.day < date && r.value.tomas?.[p.id] === 'si')
    const u = tomas[p.id] === 'si' ? date : previos.length ? previos[previos.length - 1].day : null
    const dias = diasDesde(date, u)
    return { u, dias, toca: dias == null || dias >= (p.cada_dias ?? 0) }
  }
  const pendientes = per.filter((p) => estadoPeriodico(p).toca && !tomas[p.id])
  /** Lo que tiene fecha: la próxima, la última hecha y las fechas pasadas que quedaron sin marcar. */
  const estadoAgendado = (p: Producto) => {
    const marcado = (dia: string) => (dia === date ? tomas[p.id] : historia.find((r) => r.day === dia)?.value.tomas?.[p.id])
    const hechas = historia.filter((r) => r.day < date && r.value.tomas?.[p.id] === 'si').map((r) => r.day)
    const ultima = tomas[p.id] === 'si' ? date : hechas.length ? hechas[hechas.length - 1] : null
    const sinMarcar = (p.fechas ?? []).filter((f) => f < date && f >= addDays(date, -90) && !marcado(f))
    return { prox: proxima(p, date), ultima, sinMarcar }
  }
  const cuando = (f: string) => { const n = diasDesde(f, date) ?? 0; return n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días` }
  const avisos = age.filter((p) => !tomas[p.id] && (p.fechas ?? []).some((f) => f === date || f === addDays(date, 1)))

  const esHoy = date === todayStr()
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'
  const retirarLink = (p: Producto) =>
    retirando === p.id ? (
      <span className="small">¿Retirar de la pauta? <button type="button" className="linkbtn" onClick={() => retirar(p)}>Sí, retirar</button> · <button type="button" className="linkbtn" onClick={() => setRetirando(null)}>No</button></span>
    ) : (
      <span className="small"><button type="button" className="linkbtn" onClick={() => setEditando(original(p))}>Cambiar</button> · <button type="button" className="linkbtn" onClick={() => setRetirando(p.id)}>Retirar</button></span>
    )
  /** El producto tal como está hoy en la lista (la tabla puede enseñar la pauta de un día pasado). */
  const original = (p: Producto) => lista.find((x) => x.id === p.id) ?? p
  const detalle = (p: Producto) => [p.dosis, p.marca, p.via].filter(Boolean).join(' · ')

  return (
    <div>
      <div className="row between">
        <h1>Suplementos</h1>
        <button type="button" className="btn" onClick={() => setEditando('nuevo')}>+ Producto</button>
      </div>
      <DateNav date={date} base="/suplementos" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}
      {editando && <Formulario key={editando === 'nuevo' ? 'nuevo' : editando.id} producto={editando === 'nuevo' ? null : editando} guardar={guardarProducto} cancelar={() => setEditando(null)} />}
      {avisos.map((p) => (
        <div className="notice" key={p.id}><strong>{p.fechas!.includes(date) ? (esHoy ? 'Hoy toca' : 'Este día tocaba') : 'Mañana toca'}: {p.nombre}.</strong> {p.nota}</div>
      ))}
      {pendientes.map((p) => {
        const e = estadoPeriodico(p)
        return <div className="notice" key={p.id}><strong>Toca: {p.nombre}.</strong> {e.u ? `La última fue hace ${e.dias} días.` : 'Aún no hay ninguna registrada.'} {p.nota}</div>
      })}

      {cfg && hoy.length + per.length + age.length === 0 ? (
        <div className="card"><Empty>Aún no hay suplementos. Añade el primero con «+ Producto».</Empty></div>
      ) : hoy.length === 0 ? null : (
        <div className={'card vaso-card ' + lv} style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <div className="vaso-total"><strong>{c.hechas}</strong> de {c.pautadas} tomas hechas</div>
            <div className="muted small">{c.marcadas < c.total ? `${c.total - c.marcadas} sin marcar` : 'Todo marcado'}{c.total - c.pautadas > 0 ? ` · ${c.total - c.pautadas} no precisan hoy` : ''}</div>
            <div className="barra" style={{ marginTop: '.5rem' }}><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
          </div>
        </div>
      )}

      {hoy.length > 0 && (
        <Section title={esHoy ? 'Tomas de hoy' : `Tomas del ${fmtDate(date)}`} open>
          <p className="muted small">Un toque: ✓ tomado · dos: ✗ no tomado · tres: NP no precisa. Toca el nombre de un momento para marcar toda su columna. Para pasar un producto a otro momento, toca «Cambiar».</p>
          <div className="table-wrap">
            <table className="table tomas">
              <thead>
                <tr>
                  <th>Producto</th>
                  {columnas.map(([k, l]) => (
                    <th key={k} style={{ textAlign: 'center' }}>
                      <button type="button" className="btn sm ghost" style={{ padding: '.2rem .4rem', fontSize: '.75rem' }} onClick={() => marcarColumna(k)} title="Marcar todo lo de este momento">{l}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hoy.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div onClick={() => setEditando(original(p))} style={{ cursor: 'pointer' }}>
                        {p.nombre}
                        {detalle(p) && <div className="meta">{detalle(p)}</div>}
                        {p.nota && <div className="meta">{p.nota}</div>}
                      </div>
                      {retirarLink(p)}
                    </td>
                    {columnas.map(([k, l]) => (
                      <td key={k} style={{ textAlign: 'center' }}>
                        {momentosDe(p).includes(k) && <TriButton value={tomas[clave(p, k)] ?? null} onChange={(v) => marcar(clave(p, k), v)} label={`${p.nombre} · ${l}`} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {age.length > 0 && (
        <Section title="Con fecha" open>
          <p className="muted small">Lo que se administra en días concretos. Pon aquí las fechas que te den; la app avisa la víspera y el mismo día.</p>
          {age.map((p) => {
            const e = estadoAgendado(p)
            const futuras = (p.fechas ?? []).filter((f) => f >= date)
            const nueva = fechaNueva[p.id] ?? ''
            return (
              <div className={'tri-row ' + (tomas[p.id] ?? '')} key={p.id}>
                <TriButton value={tomas[p.id] ?? null} onChange={(v) => marcar(p.id, v)} label={p.nombre} />
                <div>
                  <div onClick={() => setEditando(p)} style={{ cursor: 'pointer' }}><strong>{p.nombre}</strong>{detalle(p) ? <span className="lbl"> · {detalle(p)}</span> : null}</div>
                  {p.nota && <div className="muted small">{p.nota}</div>}
                  <div className="small">{e.prox ? <>Próxima: <strong>{fmtDate(e.prox)}</strong> ({cuando(e.prox)})</> : <span className="muted">Sin próxima fecha puesta</span>}</div>
                  <div className="muted small">{e.ultima ? `Última hecha: ${fmtDate(e.ultima)}` : 'Ninguna hecha todavía'}{e.sinMarcar.length > 0 ? ` · sin marcar: ${e.sinMarcar.map((f) => fmtDate(f)).join(', ')}` : ''}</div>
                  {futuras.length > 0 && (
                    <div className="chips" style={{ margin: '.4rem 0' }}>
                      {futuras.map((f) => (
                        <span className="chip" key={f} style={{ cursor: 'default' }}>
                          {fmtDate(f)} <button type="button" className="quitar" aria-label={`Quitar el ${fmtDate(f)}`} onClick={() => ponerFechas(p, (p.fechas ?? []).filter((x) => x !== f))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <form className="row" style={{ margin: '.4rem 0' }} onSubmit={(ev) => { ev.preventDefault(); if (nueva) { ponerFechas(p, [...(p.fechas ?? []), nueva]); setFechaNueva((x) => ({ ...x, [p.id]: '' })) } }}>
                    <input type="date" aria-label={`Fecha nueva de ${p.nombre}`} style={{ width: '10.5rem' }} value={nueva} onChange={(ev) => setFechaNueva((x) => ({ ...x, [p.id]: ev.target.value }))} />
                    <button className="btn sm secondary" disabled={!nueva}>Añadir fecha</button>
                  </form>
                  {retirarLink(p)}
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {per.length > 0 && (
        <Section title="Cada cierto tiempo" open>
          {per.map((p) => {
            const e = estadoPeriodico(p)
            return (
              <div className={'tri-row ' + (tomas[p.id] ?? '')} key={p.id}>
                <TriButton value={tomas[p.id] ?? null} onChange={(v) => marcar(p.id, v)} label={p.nombre} />
                <div>
                  <div onClick={() => setEditando(p)} style={{ cursor: 'pointer' }}><strong>{p.nombre}</strong>{detalle(p) ? <span className="lbl"> · {detalle(p)}</span> : null}</div>
                  {p.nota && <div className="muted small">{p.nota}</div>}
                  <div className="muted small">Cada {p.cada_dias} días · {e.u ? `última: ${fmtDate(e.u)}${e.dias ? ` (hace ${e.dias} días)` : ' (hoy)'}` : 'sin registrar todavía'}</div>
                  {retirarLink(p)}
                </div>
              </div>
            )
          })}
        </Section>
      )}
    </div>
  )
}

/** Alta y edición de un producto. */
type Modo = 'diario' | 'cada' | 'fechas'
function Formulario({ producto, guardar, cancelar }: { producto: Producto | null; guardar: (p: Producto, desde?: string) => void; cancelar: () => void }) {
  const [p, setP] = useState<Producto>(producto ?? { id: nuevoId(), nombre: '', momentos: [] })
  const [modo, setModo] = useState<Modo>(producto && esAgendado(producto) ? 'fechas' : producto?.cada_dias ? 'cada' : 'diario')
  const [desde, setDesde] = useState(todayStr())
  const [fecha, setFecha] = useState('')
  const caja = useRef<HTMLFormElement>(null)
  useEffect(() => { caja.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [])
  const cambia = (patch: Partial<Producto>) => setP((x) => ({ ...x, ...patch }))
  const alternar = <T,>(arr: T[] | undefined, v: T) => ((arr ?? []).includes(v) ? (arr ?? []).filter((x) => x !== v) : [...(arr ?? []), v])
  const texto = (k: 'nombre' | 'marca' | 'dosis' | 'pautado_por' | 'nota') => ({ value: p[k] ?? '', onChange: (e: { target: { value: string } }) => cambia({ [k]: e.target.value }) })
  const ok = p.nombre.trim().length > 0
  const limpiar = (): Producto => {
    const out: Producto = { id: p.id, nombre: p.nombre.trim() }
    for (const k of ['marca', 'composicion', 'dosis', 'pautado_por', 'nota', 'via', 'inicio', 'retirado'] as const) { const v = p[k]?.trim(); if (v) out[k] = v }
    if (modo === 'diario') {
      if (p.momentos?.length) out.momentos = MOMENTOS.map(([k]) => k as string).filter((k) => p.momentos!.includes(k))
      if (p.dias?.length) out.dias = [...p.dias].sort()
    }
    if (modo === 'cada' && p.cada_dias) out.cada_dias = p.cada_dias
    if (modo === 'fechas') out.fechas = [...new Set(p.fechas ?? [])].sort()
    return out
  }
  // Solo se pregunta desde cuándo si de verdad cambian los momentos, los días o la dosis de algo diario.
  const cambiaPauta = !!producto && modo === 'diario' && !esAgendado(producto) && !producto.cada_dias && !mismaPauta(producto, limpiar())
  return (
    <form className="card" ref={caja} style={{ scrollMarginTop: '4rem' }} onSubmit={(e) => { e.preventDefault(); if (ok) guardar(limpiar(), cambiaPauta ? desde || undefined : undefined) }}>
      <h2 style={{ marginTop: 0 }}>{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
      <Field label="Nombre comercial"><input type="text" required autoFocus {...texto('nombre')} /></Field>
      <Field label="Laboratorio / marca"><input type="text" {...texto('marca')} /></Field>
      <Field label="Composición (copiar de la etiqueta)"><textarea value={p.composicion ?? ''} onChange={(e) => cambia({ composicion: e.target.value })} /></Field>
      <div className="grid2">
        <Field label="Dosis por toma"><input type="text" placeholder="1 cápsula, 5 ml…" {...texto('dosis')} /></Field>
        <Field label="Pautado por"><input type="text" {...texto('pautado_por')} /></Field>
      </div>
      <div className="field">
        <span>Cuándo se toma</span>
        <div className="chips">
          {([['diario', 'A diario o por días de la semana'], ['fechas', 'En fechas que pongo yo'], ['cada', 'Cada cierto número de días']] as const).map(([k, l]) => <button type="button" key={k} className={'chip ' + (modo === k ? 'on' : '')} aria-pressed={modo === k} onClick={() => setModo(k)}>{l}</button>)}
        </div>
      </div>
      {modo === 'diario' && <>
      <div className="field">
        <span>Momentos del día</span>
        <div className="chips">
          {MOMENTOS.map(([k, l]) => <button type="button" key={k} className={'chip ' + (p.momentos?.includes(k) ? 'on' : '')} aria-pressed={!!p.momentos?.includes(k)} onClick={() => cambia({ momentos: alternar(p.momentos, k) })}>{l}</button>)}
        </div>
        <div className="muted small">Si no se marca ninguno, aparece como «a demanda».</div>
      </div>
      <div className="field">
        <span>Días de la semana</span>
        <div className="chips">
          {DIAS.map((l, i) => <button type="button" key={l} className={'chip ' + (p.dias?.includes(i) ? 'on' : '')} aria-pressed={!!p.dias?.includes(i)} onClick={() => cambia({ dias: alternar(p.dias, i) })}>{l}</button>)}
        </div>
        <div className="muted small">Si no se marca ninguno, todos los días.</div>
      </div>
      {cambiaPauta && (
        <Field label="El cambio vale desde" hint="Los días anteriores conservan la pauta que tenían. Si era un error y quieres corregir todos los días, deja la fecha vacía.">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
      )}
      </>}
      {modo === 'fechas' && (
        <div className="field">
          <span>Fechas de administración</span>
          <div className="chips">
            {[...(p.fechas ?? [])].sort().map((f) => (
              <span className="chip" key={f} style={{ cursor: 'default' }}>
                {fmtDate(f)} <button type="button" className="quitar" aria-label={`Quitar el ${fmtDate(f)}`} onClick={() => cambia({ fechas: (p.fechas ?? []).filter((x) => x !== f) })}>×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: '.4rem' }}>
            <input type="date" aria-label="Fecha nueva" style={{ width: '10.5rem' }} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <button type="button" className="btn sm secondary" disabled={!fecha} onClick={() => { cambia({ fechas: [...(p.fechas ?? []), fecha] }); setFecha('') }}>Añadir fecha</button>
          </div>
          <div className="muted small">También se pueden añadir después, desde la propia página de Suplementos.</div>
        </div>
      )}
      <div className="grid2">
        <Field label="Vía">
          <select value={p.via ?? ''} onChange={(e) => cambia({ via: e.target.value })}>
            <option value="">—</option>
            {VIAS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Inicio"><input type="date" value={p.inicio ?? ''} onChange={(e) => cambia({ inicio: e.target.value })} /></Field>
      </div>
      {modo === 'cada' && (
        <Field label="Cada cuántos días" hint="Por ejemplo 15. Avisa cuando toca y no cuenta en las tomas diarias.">
          <input type="number" inputMode="numeric" min={1} value={p.cada_dias ?? ''} onChange={(e) => cambia({ cada_dias: Number(e.target.value) || undefined })} />
        </Field>
      )}
      <Field label="Nota"><input type="text" placeholder="Pauta, subida de dosis, condición…" {...texto('nota')} /></Field>
      <div className="row">
        <button className="btn" disabled={!ok}>Guardar</button>
        <button type="button" className="btn ghost" onClick={cancelar}>Cancelar</button>
      </div>
    </form>
  )
}
