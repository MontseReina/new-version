import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Plegable } from '../../components/ui'
import { addDays, todayStr, weekStart } from '../../lib/dates'
import { listDaily, type Daily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { Ejercicios } from './Ejercicios'
import { Informe } from './Informe'
import {
  EXPRESIONES, PAGINAS, PALABRAS_PAGINA, ejercicioActivo, escritas, expresadas, graciasDe, hechosDe, paginas, palabras, resumen,
  type Gracia, type IntroCfg, type IntroDia,
} from './logica'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Trabajo introspectivo: diario de la mañana, ejercicio de ahora y agradecimientos de la noche. */
export default function Introspeccion() {
  const hoy = todayStr()
  const date = useParams().date ?? hoy
  const { value: d, set, state, rev, retry } = useDaily<IntroDia>('introspeccion', date)
  const [cfg, saveCfg] = useSettings<IntroCfg>('introspeccion')
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  // El diario no se relee por defecto: se abre para escribir hoy y queda plegado cuando ya está hecho.
  const [ver, setVer] = useState<boolean | null>(null)
  const [alCargar, setAlCargar] = useState<{ date: string; hecho: boolean } | null>(null)
  useEffect(() => { setVer(null); setAlCargar(null) }, [date])
  useEffect(() => {
    if (state !== 'cargando' && alCargar?.date !== date) setAlCargar({ date, hecho: paginas(d.diario) >= PAGINAS })
  }, [state, date, d.diario, alCargar])
  const n = palabras(d.diario)
  const pag = n / PALABRAS_PAGINA
  const abierto = ver ?? (date === hoy && !alCargar?.hecho)

  const gracias = graciasDe(d)
  const setGracia = (i: number, patch: Gracia) => set({ gracias: gracias.map((g, k) => (k === i ? { ...g, ...patch } : g)) })
  const tocarComo = (i: number, k: string) => {
    const como = gracias[i].como ?? []
    setGracia(i, { como: como.includes(k) ? como.filter((x) => x !== k) : [...como, k] })
  }

  const activo = ejercicioActivo(cfg)
  const bloque = (cfg?.bloques ?? []).find((b) => b.id === activo?.bloque)
  const hecho = activo ? d.hechos?.[activo.id] : undefined
  const tocarHecho = () => {
    if (!activo) return
    const resto = { ...(d.hechos ?? {}) }
    if (hecho) delete resto[activo.id]; else resto[activo.id] = {}
    set({ hechos: resto })
  }

  // Semana de lunes a domingo del día que se está viendo.
  const lunes = weekStart(date)
  const [semana, setSemana] = useState<Daily<IntroDia>[]>([])
  useEffect(() => {
    let alive = true
    listDaily<IntroDia>('introspeccion', lunes, addDays(lunes, 6)).then((r) => alive && setSemana(r), () => {})
    return () => { alive = false }
  }, [lunes, rev])
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const porDia = new Map(semana.map((r) => [r.day, r.value]))
  if (state !== 'cargando') porDia.set(date, d)
  const sem = resumen(dias.filter((x) => porDia.has(x)).map((x) => ({ day: x, value: porDia.get(x)! })))
  const fila = (titulo: string, marca: (v: IntroDia) => string) => (
    <>
      <span className="intro-sem-tit">{titulo}</span>
      {dias.map((x) => {
        const v = porDia.get(x)
        const m = v ? marca(v) : ''
        return <Link key={x} to={`/introspeccion/${x}`} className={'intro-celda' + (m ? ' on' : '') + (x === hoy ? ' hoy' : '') + (x > hoy ? ' futuro' : '')} aria-label={`${titulo}, ${x}`}>{m}</Link>
      })}
    </>
  )

  return (
    <div>
      <h1>Trabajo introspectivo</h1>
      <DateNav date={date} base="/introspeccion" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <div className="card">
        <div className="row between">
          <h2 className="intro-h">Mañana · Diario de tres páginas</h2>
          {n > 0 && <button type="button" className="btn sm ghost" onClick={() => setVer(!abierto)}>{abierto ? 'Plegar' : 'Ver lo escrito'}</button>}
        </div>
        {abierto ? (
          <textarea className="intro-diario" aria-label="Diario de la mañana" placeholder="Escribe sin releer ni corregir. Todo lo que salga."
            disabled={state === 'cargando'} value={d.diario ?? ''} onChange={(e) => set({ diario: e.target.value })} />
        ) : (
          <p className="muted">{n > 0 ? 'Escrito y guardado. No hace falta releerlo.' : 'Este día no hay diario.'}</p>
        )}
        <div className="intro-paginas" role="img" aria-label={`${n} palabras, ${Math.min(PAGINAS, Math.floor(pag))} de ${PAGINAS} páginas`}>
          {Array.from({ length: PAGINAS }, (_, i) => <span key={i}><i style={{ width: Math.round(Math.max(0, Math.min(1, pag - i)) * 100) + '%' }} /></span>)}
        </div>
        <p className="muted small">
          {n} palabras · {pag >= PAGINAS ? 'Tres páginas. Puedes soltarlo aquí.' : `página ${Math.floor(pag) + 1} de ${PAGINAS}`}
        </p>
      </div>

      <div className="card">
        <h2 className="intro-h">Ejercicio de ahora</h2>
        {!cfg ? <p className="muted">Cargando…</p> : !activo ? (
          <p className="muted">No hay ningún ejercicio elegido. Elige uno en «Mis ejercicios», más abajo.</p>
        ) : (
          <>
            {bloque && <span className="tag">{bloque.nombre}</span>}
            <p><strong>{activo.titulo}</strong></p>
            {activo.texto && <p className="intro-texto">{activo.texto}</p>}
            <button type="button" className={'midia-check' + (hecho ? ' on' : '')} aria-pressed={!!hecho} disabled={state === 'cargando'} onClick={tocarHecho}>
              <span className="midia-caja" aria-hidden="true">{hecho ? '✓' : ''}</span>
              {date === hoy ? 'Lo he hecho hoy' : 'Lo hice este día'}
            </button>
            {hecho && (
              <label className="field">
                <span>Qué noté</span>
                <input type="text" value={hecho.nota ?? ''} onChange={(e) => set({ hechos: { ...(d.hechos ?? {}), [activo.id]: { nota: e.target.value } } })} />
              </label>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2 className="intro-h">Noche · Tres agradecimientos</h2>
        {gracias.map((g, i) => (
          <div className="intro-gracia" key={i}>
            <input type="text" aria-label={`Agradecimiento ${i + 1}`} placeholder={`${i + 1}. Hoy agradezco…`} disabled={state === 'cargando'}
              value={g.texto ?? ''} onChange={(e) => setGracia(i, { texto: e.target.value })} />
            {g.texto?.trim() && (
              <div className="chips" role="group" aria-label="Cómo se lo he expresado">
                {EXPRESIONES.map(([k, l]) => {
                  const on = (g.como ?? []).includes(k)
                  return <button key={k} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => tocarComo(i, k)}>{l}</button>
                })}
              </div>
            )}
          </div>
        ))}
        <p className="muted small">Si el agradecimiento es a una persona, marca cómo se lo has hecho llegar. Si no lo es, déjalo sin marcar.</p>
      </div>

      <Plegable id="intro-semana" title="Esta semana" abierto>
        <div className="intro-sem">
          <span />
          {dias.map((x, i) => <span key={x} className={'intro-dow' + (x === hoy ? ' hoy' : '')}>{DOW[i]}</span>)}
          {fila('Diario', (v) => (paginas(v.diario) >= PAGINAS ? '✓' : palabras(v.diario) ? '·' : ''))}
          {fila('Gracias', (v) => (escritas(v) ? String(escritas(v)) : ''))}
          {fila('Expresadas', (v) => (expresadas(v) ? String(expresadas(v)) : ''))}
          {fila('Ejercicio', (v) => (hechosDe(v) ? '✓' : ''))}
        </div>
        <p className="muted small">
          Diario {sem.conDiario} días ({sem.completos} con las tres páginas) · {sem.gracias} agradecimientos, {sem.dichas} expresados · ejercicio {sem.conEjercicio} días.
        </p>
      </Plegable>

      <Plegable id="intro-patrones" title="Lo que se repite">
        {(cfg?.patrones ?? []).length === 0 ? (
          <p className="muted">Aquí aparecerá lo que más se repite en tu diario, con su recuento, después del primer informe.</p>
        ) : (
          <>
            {cfg?.periodo && <p className="muted small">{cfg.periodo}</p>}
            {(cfg?.patrones ?? []).map((p) => {
              const ej = (cfg?.ejercicios ?? []).find((e) => e.id === p.ejercicio)
              return (
                <div className="item" key={p.id}>
                  <div className="main">
                    {p.tipo && <span className="tag gray">{p.tipo}</span>}
                    <div>{p.texto}</div>
                    {ej && (
                      <div className="meta">
                        Ejercicio: {ej.titulo}
                        {cfg?.activo !== ej.id && <> · <button type="button" className="linkbtn" onClick={() => void saveCfg({ activo: ej.id })}>Trabajar ahora</button></>}
                      </div>
                    )}
                  </div>
                  {p.veces != null && <span className="intro-veces"><b>{p.veces}</b>{p.de ? ` de ${p.de} días` : ' veces'}</span>}
                </div>
              )
            })}
          </>
        )}
      </Plegable>

      <Plegable id="intro-ejercicios" title="Mis ejercicios">
        {cfg ? <Ejercicios cfg={cfg} saveCfg={saveCfg} /> : <p className="muted">Cargando…</p>}
      </Plegable>

      <Plegable id="intro-informe" title="Informe mensual">
        <Informe cfg={cfg} saveCfg={saveCfg} hasta={date} />
      </Plegable>
    </div>
  )
}
