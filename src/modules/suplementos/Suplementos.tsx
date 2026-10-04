import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Empty, Section, TriButton, type TriState } from '../../components/ui'
import { addDays, diffDays, fmtDate, todayStr } from '../../lib/dates'
import { listDaily, type Daily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { MOMENTOS, cumplimiento, nivel, periodicos, type SuplCfg, type SuplDia, type Suplemento, type Toma } from './logica'

const nuevoId = () => Math.random().toString(36).slice(2, 10)

/** Suplementos: un toque hecho, dos no hecho, tres no precisa. Agrupados por momento del día. */
export default function Suplementos() {
  const date = useParams().date ?? todayStr()
  const { value: d, set, state, rev, retry } = useDaily<SuplDia>('suplementos', date)
  const [cfg, saveCfg] = useSettings<SuplCfg>('suplementos')
  const lista = cfg?.lista ?? []
  const tomas = d.tomas ?? {}
  const c = cumplimiento(lista, d)
  const lv = nivel(c.pct)

  const marcar = (id: string, v: TriState) => {
    const t = { ...tomas }
    if (v) t[id] = v as Toma
    else delete t[id]
    set({ tomas: t })
  }
  const marcarBloque = (items: Suplemento[]) => {
    const t = { ...tomas }
    items.forEach((s) => { if (!t[s.id]) t[s.id] = 'si' })
    set({ tomas: t })
  }

  // Últimas veces de lo que no es diario (se mira hasta 90 días atrás).
  const [historia, setHistoria] = useState<Daily<SuplDia>[]>([])
  const per = periodicos(lista)
  const hayPeriodicos = per.length > 0
  useEffect(() => {
    if (!hayPeriodicos) return
    let alive = true
    listDaily<SuplDia>('suplementos', addDays(date, -90), date).then((r) => alive && setHistoria(r), () => {})
    return () => { alive = false }
  }, [date, rev, hayPeriodicos])
  const ultima = (id: string) => {
    if (tomas[id] === 'si') return date
    const hechos = historia.filter((r) => r.day < date && r.value.tomas?.[id] === 'si')
    return hechos.length ? hechos[hechos.length - 1].day : null
  }
  const estadoPeriodico = (s: Suplemento) => {
    const u = ultima(s.id)
    const dias = u ? diffDays(date, u) : null
    const toca = !!s.cada_dias && (dias == null || dias >= s.cada_dias)
    return { u, dias, toca }
  }
  const pendientes = per.filter((s) => estadoPeriodico(s).toca && !tomas[s.id])

  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  return (
    <div>
      <h1>Suplementos</h1>
      <DateNav date={date} base="/suplementos" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}
      {pendientes.map((s) => (
        <div className="notice" key={s.id}><strong>Toca: {s.nombre}.</strong> {estadoPeriodico(s).u ? `La última fue hace ${estadoPeriodico(s).dias} días.` : 'Aún no hay ninguna registrada.'} {s.nota}</div>
      ))}

      {cfg && lista.length === 0 ? (
        <div className="card"><Empty>Aún no hay suplementos. Añádelos abajo, en «Editar mi lista».</Empty></div>
      ) : (
        <div className={'card vaso-card ' + lv} style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <div className="vaso-total"><strong>{c.hechas}</strong> de {c.pautadas} tomas hechas</div>
            <div className="muted small">{c.marcadas < c.total ? `${c.total - c.marcadas} sin marcar` : 'Todo marcado'}{c.total - c.pautadas > 0 ? ` · ${c.total - c.pautadas} no precisan hoy` : ''}</div>
            <div className="barra" style={{ marginTop: '.5rem' }}><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
            <div className="muted small" style={{ marginTop: '.4rem' }}>Un toque: ✓ hecho · dos: ✗ no hecho · tres: NP no precisa.</div>
          </div>
        </div>
      )}

      {MOMENTOS.map(([key, label]) => {
        const items = lista.filter((s) => s.momento === key)
        if (!items.length) return null
        const esPeriodico = key === 'periodico'
        const faltan = items.some((s) => !tomas[s.id])
        return (
          <Section key={key} title={label} open right={!esPeriodico && faltan ? <button type="button" className="btn sm secondary" onClick={(e) => { e.preventDefault(); marcarBloque(items) }}>Todo hecho</button> : undefined}>
            {items.map((s) => {
              const ep = esPeriodico ? estadoPeriodico(s) : null
              return (
                <div className={'tri-row ' + (tomas[s.id] ?? '')} key={s.id}>
                  <TriButton value={tomas[s.id] ?? null} onChange={(v) => marcar(s.id, v)} label={s.nombre} />
                  <div>
                    <strong>{s.nombre}</strong>{s.dosis ? <span className="lbl"> · {s.dosis}</span> : null}
                    {s.nota && <div className="muted small">{s.nota}</div>}
                    {ep && <div className="muted small">{s.cada_dias ? `Cada ${s.cada_dias} días · ` : ''}{ep.u ? `última: ${fmtDate(ep.u)}${ep.dias ? ` (hace ${ep.dias} días)` : ' (hoy)'}` : 'sin registrar todavía'}</div>}
                  </div>
                </div>
              )
            })}
          </Section>
        )
      })}

      {cfg && <Editor lista={lista} guardar={(l) => void saveCfg({ lista: l })} />}
    </div>
  )
}

/** Editor de la lista: los cambios se guardan al salir de cada casilla. */
function Editor({ lista, guardar }: { lista: Suplemento[]; guardar: (l: Suplemento[]) => void }) {
  const cambiar = (id: string, patch: Partial<Suplemento>) => guardar(lista.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  return (
    <Section title="Editar mi lista">
      <p className="muted small">Una línea por toma: si un suplemento se toma en dos momentos, añádelo dos veces. Los cambios se guardan al salir de cada casilla.</p>
      {lista.map((s) => (
        <div className="lista-edit" key={s.id}>
          <input type="text" aria-label="Nombre" defaultValue={s.nombre} onBlur={(e) => e.target.value.trim() && e.target.value !== s.nombre && cambiar(s.id, { nombre: e.target.value.trim() })} />
          <input type="text" aria-label="Dosis" placeholder="Dosis" defaultValue={s.dosis ?? ''} onBlur={(e) => e.target.value !== (s.dosis ?? '') && cambiar(s.id, { dosis: e.target.value.trim() })} />
          <select aria-label="Momento" value={s.momento} onChange={(e) => cambiar(s.id, { momento: e.target.value })}>
            {MOMENTOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button type="button" className="btn sm ghost" onClick={() => guardar(lista.filter((x) => x.id !== s.id))}>Quitar</button>
          <input type="text" aria-label="Nota" placeholder="Nota (opcional)" style={{ gridColumn: s.momento === 'periodico' ? '1 / 3' : '1 / -1' }} defaultValue={s.nota ?? ''} onBlur={(e) => e.target.value !== (s.nota ?? '') && cambiar(s.id, { nota: e.target.value.trim() })} />
          {s.momento === 'periodico' && (
            <input type="number" aria-label="Cada cuántos días" placeholder="Cada cuántos días" min={1} style={{ gridColumn: '3 / -1' }} defaultValue={s.cada_dias ?? ''} onBlur={(e) => cambiar(s.id, { cada_dias: Number(e.target.value) || undefined })} />
          )}
        </div>
      ))}
      <button type="button" className="btn sm secondary" style={{ marginTop: '.6rem' }} onClick={() => guardar([...lista, { id: nuevoId(), nombre: 'Nuevo suplemento', momento: 'desayuno' }])}>+ Añadir toma</button>
    </Section>
  )
}
