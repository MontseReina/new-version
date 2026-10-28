import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Empty, Field, Plegable, Section, TriButton, type TriState } from '../../components/ui'
import { addDays, fmtDate, todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { AVISO_DIAS, DIAS, MOMENTOS, VIAS, avisosDe, cambiosDe, clave, conCambio, delDia, diasDesde, enDias, enFecha, esAgendado, futuros, momentosTxt, mismaPauta, momentosDe, periodicos, proximaDe, retirados, terapia, type Producto, type SuplCfg, type SuplDia, type Toma } from './logica'
import { useUltimas } from './useUltimas'

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
  const ter = terapia(lista, date)
  const fut = futuros(lista, date)
  const cambios = cambiosDe(lista, date)
  const out = retirados(lista, date)
  const resaltar = new Map(cambios.filter((x) => x.tipo !== 'termina').map((x) => [x.p.id, x.tipo === 'empieza' ? 'Empieza hoy' : 'Cambia hoy']))
  const [editando, setEditando] = useState<Producto | 'nuevo' | null>(null)
  const [retirando, setRetirando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

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
    const m = motivo.trim()
    void saveCfg({ lista: lista.map((x) => (x.id === p.id ? { ...x, retirado: date, ...(m ? { motivo_retirada: m } : {}) } : x)) })
    setRetirando(null)
    setMotivo('')
  }
  const ponerMotivo = (p: Producto, m: string) =>
    void saveCfg({ lista: lista.map((x) => { if (x.id !== p.id) return x; const { motivo_retirada: _, ...resto } = x; return m.trim() ? { ...resto, motivo_retirada: m.trim() } : resto }) })

  // Últimas veces de lo que no es diario (se mira hasta 90 días atrás).
  const { historia, ultimas, listo } = useUltimas(lista, d, date, rev)
  const estadoPeriodico = (p: Producto) => {
    const u = ultimas[p.id] ?? null
    const dias = diasDesde(date, u)
    const empezado = !p.inicio || p.inicio <= date
    return { u, dias, toca: empezado && (dias == null || dias >= (p.cada_dias ?? 0)) }
  }
  const pendientes = listo ? per.filter((p) => estadoPeriodico(p).toca && !tomas[p.id]) : []
  /** Terapia endovenosa: la próxima, la última hecha y las fechas pasadas que quedaron sin marcar. */
  const estadoTerapia = (p: Producto) => {
    const marcado = (dia: string) => (dia === date ? tomas[p.id] : historia.find((r) => r.day === dia)?.value.tomas?.[p.id])
    const ultima = ultimas[p.id] ?? null
    const sinMarcar = (p.fechas ?? []).filter((f) => f < date && f >= addDays(date, -90) && !marcado(f))
    return { prox: proximaDe(p, date, ultima ?? undefined), ultima, sinMarcar }
  }
  const cuando = (f: string) => enDias(diasDesde(f, date) ?? 0)
  const avisos = listo ? avisosDe(lista, d, date, ultimas) : []

  const esHoy = date === todayStr()
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'
  const retirarLink = (p: Producto) =>
    retirando === p.id ? (
      <div className="retirar-caja small">
        <div>¿Retirar de la pauta? Pasará a «Suplementos out».</div>
        <input type="text" aria-label={`Motivo para dejar ${p.nombre}`} placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <span><button type="button" className="linkbtn" onClick={() => retirar(p)}>Sí, retirar</button> · <button type="button" className="linkbtn" onClick={() => { setRetirando(null); setMotivo('') }}>No</button></span>
      </div>
    ) : (
      <span className="small"><button type="button" className="linkbtn" onClick={() => setEditando(original(p))}>Modificar</button> · <button type="button" className="linkbtn" onClick={() => { setRetirando(p.id); setMotivo('') }}>Retirar</button></span>
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
      {avisos.map(({ p, faltan }) => (
        <div className="notice" key={p.id}><strong>{faltan === 0 ? (esHoy ? 'Hoy toca' : 'Este día tocaba') : faltan === 1 ? 'Mañana toca' : `En ${faltan} días toca`}: {p.nombre}.</strong> {faltan > 0 && `Es el ${fmtDate(addDays(date, faltan))}. `}{p.nota}</div>
      ))}
      {pendientes.map((p) => {
        const e = estadoPeriodico(p)
        return <div className="notice" key={p.id}><strong>Toca: {p.nombre}.</strong> {e.u ? `La última fue hace ${e.dias} días.` : 'Aún no hay ninguna registrada.'} {p.nota}</div>
      })}

      {cfg && hoy.length + fut.length + per.length + ter.length + out.length === 0 && (
        <div className="card"><Empty>Aún no hay suplementos. Añade el primero con «+ Producto».</Empty></div>
      )}

      {ter.length > 0 && (
        <Plegable id="supl-terapia" title="Terapia endovenosa">
          <p className="muted small">Lo que se administra en días concretos o cada cierto número de días. La app avisa desde {AVISO_DIAS} días antes.</p>
          {ter.map((p) => {
            const e = estadoTerapia(p)
            const futuras = (p.fechas ?? []).filter((f) => f >= date)
            const nueva = fechaNueva[p.id] ?? ''
            return (
              <div className={'tri-row ' + (tomas[p.id] ?? '')} key={p.id}>
                <TriButton value={tomas[p.id] ?? null} onChange={(v) => marcar(p.id, v)} label={p.nombre} />
                <div>
                  <div onClick={() => setEditando(p)} style={{ cursor: 'pointer' }}><strong>{p.nombre}</strong>{detalle(p) ? <span className="lbl"> · {detalle(p)}</span> : null}</div>
                  {p.nota && <div className="muted small">{p.nota}</div>}
                  {p.cada_dias && !esAgendado(p) && <div className="muted small">Cada {p.cada_dias} días{p.inicio && p.inicio > date && !e.ultima ? ` · empieza el ${fmtDate(p.inicio)}` : ''}</div>}
                  <div className="small">{!listo ? <span className="muted">Cargando…</span> : e.prox ? <>Próxima: <strong>{fmtDate(e.prox)}</strong> ({cuando(e.prox)})</> : <span className="muted">Sin próxima fecha puesta</span>}</div>
                  <div className="muted small">{e.ultima ? `Última hecha: ${fmtDate(e.ultima)}` : 'Ninguna hecha todavía'}{e.sinMarcar.length > 0 ? ` · sin marcar: ${e.sinMarcar.map((f) => fmtDate(f)).join(', ')}` : ''}</div>
                  {esAgendado(p) && futuras.length > 0 && (
                    <div className="chips" style={{ margin: '.4rem 0' }}>
                      {futuras.map((f) => (
                        <span className="chip" key={f} style={{ cursor: 'default' }}>
                          {fmtDate(f)} <button type="button" className="quitar" aria-label={`Quitar el ${fmtDate(f)}`} onClick={() => ponerFechas(p, (p.fechas ?? []).filter((x) => x !== f))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {esAgendado(p) && <form className="row" style={{ margin: '.4rem 0' }} onSubmit={(ev) => { ev.preventDefault(); if (nueva) { ponerFechas(p, [...(p.fechas ?? []), nueva]); setFechaNueva((x) => ({ ...x, [p.id]: '' })) } }}>
                    <input type="date" aria-label={`Fecha nueva de ${p.nombre}`} style={{ width: '10.5rem' }} value={nueva} onChange={(ev) => setFechaNueva((x) => ({ ...x, [p.id]: ev.target.value }))} />
                    <button className="btn sm secondary" disabled={!nueva}>Añadir fecha</button>
                  </form>}
                  {retirarLink(p)}
                </div>
              </div>
            )
          })}
        </Plegable>
      )}

      {cambios.length > 0 && (
        <div className="notice cambios">
          <strong>{esHoy ? 'Hoy cambia tu pauta' : 'Este día cambió la pauta'}</strong>
          <ul>
            {cambios.map((x) => <li key={x.p.id}><strong>{x.p.nombre}</strong>: {x.texto}</li>)}
          </ul>
        </div>
      )}

      {hoy.length + fut.length > 0 && (
        <Section title={esHoy ? 'Tomas de hoy' : `Tomas del ${fmtDate(date)}`} open>
          <p className="muted small">Un toque: ✓ tomado · dos: ✗ no tomado · tres: NP no precisa. Toca el nombre de un momento para marcar toda su columna. Para pasar un producto a otro momento, toca «Modificar».</p>
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
                  <tr key={p.id} className={resaltar.has(p.id) ? 'cambio-hoy' : undefined}>
                    <td>
                      <div onClick={() => setEditando(original(p))} style={{ cursor: 'pointer' }}>
                        {p.nombre}
                        {resaltar.has(p.id) && <span className="tag-cambio">{resaltar.get(p.id)}</span>}
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
                {fut.map((p) => (
                  <tr key={p.id} className="futuro">
                    <td colSpan={columnas.length + 1}>
                      <div>
                        {p.nombre}
                        <div className="meta">{[detalle(p), momentosTxt(p)].filter(Boolean).join(' · ')}</div>
                        <div className="empieza">Empieza el {fmtDate(p.inicio)} ({cuando(p.inicio!)})</div>
                      </div>
                      {retirarLink(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <div className="muted small">Cada {p.cada_dias} días · {e.u ? `última: ${fmtDate(e.u)}${e.dias ? ` (hace ${e.dias} días)` : ' (hoy)'}` : p.inicio && p.inicio > date ? `empieza el ${fmtDate(p.inicio)}` : 'sin registrar todavía'}</div>
                  {retirarLink(p)}
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {out.length > 0 && (
        <Plegable id="supl-out" title={`Suplementos out (${out.length})`}>
          <p className="muted small">Lo que has dejado de tomar, con el porqué. Lo último retirado va primero.</p>
          {out.map((p) => <Retirado key={p.id} p={p} date={date} guardar={(m) => ponerMotivo(p, m)} />)}
        </Plegable>
      )}
    </div>
  )
}

/** Una fila de «Suplementos out»: qué era, desde cuándo no se toma y el motivo, que se puede escribir o cambiar. */
function Retirado({ p, date, guardar }: { p: Producto; date: string; guardar: (m: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(p.motivo_retirada ?? '')
  const ultima = enFecha(p, addDays(p.retirado!, -1))
  const hace = diasDesde(date, p.retirado!) ?? 0
  const pauta = [ultima.dosis, p.marca, esAgendado(p) || p.cada_dias ? (p.cada_dias ? `cada ${p.cada_dias} días` : 'en fechas') : momentosTxt(ultima)].filter(Boolean).join(' · ')
  return (
    <div className="supl-out">
      <div className="row between">
        <strong>{p.nombre}</strong>
        <span className="muted small">Desde el {fmtDate(p.retirado!)}{hace > 0 ? ` (hace ${hace} ${hace === 1 ? 'día' : 'días'})` : ' (hoy)'}</span>
      </div>
      {pauta && <div className="muted small">Lo tomabas: {pauta}</div>}
      {abierto ? (
        <form onSubmit={(e) => { e.preventDefault(); guardar(texto); setAbierto(false) }}>
          <textarea aria-label={`Motivo para dejar ${p.nombre}`} placeholder="Por qué lo dejas: efecto que notaste, indicación médica, fin de la pauta…" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          <div className="row">
            <button type="submit" className="btn sm">Guardar</button>
            <button type="button" className="btn sm ghost" onClick={() => { setTexto(p.motivo_retirada ?? ''); setAbierto(false) }}>Cancelar</button>
          </div>
        </form>
      ) : p.motivo_retirada ? (
        <p className="supl-out-motivo small"><span className="muted">Motivo:</span> {p.motivo_retirada} <button type="button" className="linkbtn" onClick={() => { setTexto(p.motivo_retirada ?? ''); setAbierto(true) }}>Modificar</button></p>
      ) : (
        <button type="button" className="linkbtn small" onClick={() => setAbierto(true)}>+ Escribir el motivo</button>
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
    for (const k of ['marca', 'composicion', 'dosis', 'pautado_por', 'nota', 'via', 'inicio', 'retirado', 'motivo_retirada'] as const) { const v = p[k]?.trim(); if (v) out[k] = v }
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
