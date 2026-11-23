import { useState } from 'react'
import { Stepper } from '../../components/ui'
import { todayStr } from '../../lib/dates'
import { Bristol } from './Bristol'
import { DatosEpisodio } from './DatosEpisodio'
import { COMIDAS, HECES_COLORES, HECES_MARCAS, ORINA_COLORES, ORINA_NOMBRES, alternar, episodiosOpcion, tieneEscala, tiposEpisodio, type Deposicion, type Detalle, type Grupo, type SintDia, textoTiempo } from './logica'
import { emojiOpcion } from './emojis'

const DIEZ = Array.from({ length: 10 }, (_, i) => i + 1)
const ahora = () => new Date().toTimeString().slice(0, 5)
/** Una línea con lo esencial de un episodio plegado: hora, intensidad, duración e ingreso. */
const resumenEpisodio = (x: Detalle) => [
  x.hora,
  x.gravedad != null && `intensidad ${x.gravedad}/10`,
  textoTiempo(x.duracion) && `duró ${textoTiempo(x.duracion)}`,
  x.conocimiento && 'pérdida de conocimiento',
  x.urgencias && '🚑 urgencias',
].filter(Boolean).join(' · ') || 'sin datos'

/** Grupos de síntomas del día, para marcar con un toque. Lo usan Disautonomía y Ciclo menstrual:
 *  los dos escriben en el mismo registro diario ('sintomas'), cada uno con sus grupos. */
export function Grupos({ grupos, d, set, date, acciones = [], disabled }: { grupos: Grupo[]; d: SintDia; set: (patch: SintDia) => void; date: string; acciones?: string[]; disabled?: boolean }) {
  const marcar = (g: Grupo, id: string) => set({ sel: { ...(d.sel ?? {}), [g.id]: alternar(g, d.sel?.[g.id] ?? [], id) } })
  const nuevoEpisodio = (): Detalle => (date === todayStr() ? { hora: ahora() } : {})
  /** Episodios de una opción marcada (al menos uno). */
  const episodios = (g: Grupo, id: string) => {
    const xs = episodiosOpcion(d.det?.[g.id]?.[id])
    return xs.length ? xs : [{}]
  }
  const ponerEpisodios = (g: Grupo, id: string, xs: Detalle[]) =>
    set({ det: { ...(d.det ?? {}), [g.id]: { ...(d.det?.[g.id] ?? {}), [id]: xs } } })
  const detalle = (g: Grupo, id: string, i: number, patch: Detalle) =>
    ponerEpisodios(g, id, episodios(g, id).map((x, k) => (k === i ? { ...x, ...patch } : x)))
  /** Grupo en el que se está eligiendo el tipo de un episodio nuevo. */
  const [eligiendo, setEligiendo] = useState<string | null>(null)
  /** Todos los episodios del día de un grupo, de cualquier tipo, ordenados por hora (sin hora, al final). */
  const episodiosDia = (g: Grupo) => (g.opciones ?? [])
    .filter((o) => (d.sel?.[g.id] ?? []).includes(o.id))
    .flatMap((o) => episodios(g, o.id).map((x, i) => ({ o, i, x })))
    .sort((a, b) => (a.x.hora || '99:99').localeCompare(b.x.hora || '99:99'))
  /** Crea un episodio del tipo elegido. */
  const nuevo = (g: Grupo, id: string) => {
    const marcadas = d.sel?.[g.id] ?? []
    const xs = marcadas.includes(id) ? [...episodios(g, id), nuevoEpisodio()] : [nuevoEpisodio()]
    set({
      sel: { ...(d.sel ?? {}), [g.id]: marcadas.includes(id) ? marcadas : [...marcadas, id] },
      det: { ...(d.det ?? {}), [g.id]: { ...(d.det?.[g.id] ?? {}), [id]: xs } },
    })
    setEligiendo(null)
  }
  /** Quita un episodio; si era el único de su tipo, el tipo deja de estar marcado ese día. */
  const quitar = (g: Grupo, id: string, i: number, extra?: { id: string; x: Detalle }) => {
    const marcadas = d.sel?.[g.id] ?? []
    const dg = { ...(d.det?.[g.id] ?? {}) }
    let sel = marcadas
    const resto = episodios(g, id).filter((_, k) => k !== i)
    if (resto.length) dg[id] = resto
    else { delete dg[id]; sel = sel.filter((y) => y !== id) }
    if (extra) {
      dg[extra.id] = sel.includes(extra.id) ? [...episodios(g, extra.id), extra.x] : [extra.x]
      if (!sel.includes(extra.id)) sel = [...sel, extra.id]
    }
    set({ sel: { ...(d.sel ?? {}), [g.id]: sel }, det: { ...(d.det ?? {}), [g.id]: dg } })
  }
  /** Marca o desmarca un tipo en un episodio (puede tener varios, siempre al menos uno).
   *  Se guarda bajo su primer tipo; si se desmarca ese, pasa con todo lo escrito al siguiente. */
  const tocarTipo = (g: Grupo, de: string, i: number, t: string) => {
    const x = episodios(g, de)[i]
    const ts = tiposEpisodio(de, x)
    const nuevos = ts.includes(t) ? ts.filter((y) => y !== t) : [...ts, t]
    if (!nuevos.length) return
    const resto = nuevos.slice(1)
    if (nuevos[0] === de) detalle(g, de, i, { tipos: resto.length ? resto : null })
    else quitar(g, de, i, { id: nuevos[0], x: { ...x, tipos: resto.length ? resto : null } })
  }

  const heces = d.heces ?? []
  const ponerDepo = (i: number, patch: Deposicion) => set({ heces: heces.map((x, k) => (k === i ? { ...x, ...patch } : x)) })

  const escala = (g: Grupo) => {
    const v = d.escala?.[g.id]
    return (
      <>
        <div className="seg escala fina" role="group" aria-label={`${g.nombre}, de 0 a 10`}>
          {[0, ...DIEZ].map((n) => <button type="button" key={n} className={v === n ? 'on' : ''} aria-pressed={v === n} onClick={() => set({ escala: { ...(d.escala ?? {}), [g.id]: v === n ? null : n } })}>{n}</button>)}
        </div>
        {(g.min_txt || g.max_txt) && <div className="muted small" style={{ marginTop: '.3rem' }}>{[g.min_txt && `0 ${g.min_txt}`, g.max_txt && `10 ${g.max_txt}`].filter(Boolean).join(' · ')}</div>}
      </>
    )
  }
  /** Grupos de episodios (Disautonomía): cada episodio lleva dentro su tipo, su hora y sus datos.
   *  Arriba no hay chips generales: se abre un episodio y dentro se elige qué fue. */
  const episodiosGrupo = (g: Grupo) => {
    const lista = episodiosDia(g)
    const opciones = g.opciones ?? []
    const nombreTipo = (o: { nombre: string }) => <>{emojiOpcion(g, o.nombre) && <span className="chip-emoji" aria-hidden="true">{emojiOpcion(g, o.nombre)} </span>}{o.nombre}</>
    return (
      <>
        {lista.length === 0 && <p className="muted small" style={{ margin: '0 0 .4rem' }}>Hoy sin episodios.</p>}
        {lista.map(({ o, i, x }, n) => {
          const ts = tiposEpisodio(o.id, x)
          const nombres = ts.map((t) => opciones.find((y) => y.id === t)?.nombre ?? t).join(' + ')
          const quien = `episodio ${n + 1} (${nombres})`
          if (x.guardado) return (
            <div className="depo epi-plegado" key={`${o.id}-${i}`}>
              <div className="row between">
                <span className="small"><strong>Episodio {n + 1} · {nombres}</strong>{' · '}{resumenEpisodio(x)}</span>
                <button type="button" className="linkbtn" aria-expanded={false} aria-label={`Desplegar ${quien}`} onClick={() => detalle(g, o.id, i, { guardado: null })}>Desplegar ▾</button>
              </div>
            </div>
          )
          return (
            <div className="depo" key={`${o.id}-${i}`}>
              <div className="row between">
                <strong className="small">Episodio {n + 1}</strong>
                <button type="button" className="linkbtn" onClick={() => quitar(g, o.id, i)}>Quitar</button>
              </div>
              <div className="field epi-tipo">
                <span>Tipo <span className="muted small">(puedes marcar varios)</span></span>
                <div className="chips" role="group" aria-label={`Tipos del episodio ${n + 1}`}>
                  {opciones.map((t) => { const on = ts.includes(t.id); return <button type="button" key={t.id} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => tocarTipo(g, o.id, i, t.id)}>{nombreTipo(t)}</button> })}
                </div>
              </div>
              <div className="row" style={{ marginTop: '.3rem' }}>
                <label className="row small" style={{ gap: '.4rem' }}>
                  <span className="muted">Hora</span>
                  <input type="time" aria-label={`Hora del ${quien}`} style={{ width: '7.5rem' }} value={x.hora ?? ''} onChange={(e) => detalle(g, o.id, i, { hora: e.target.value || null })} />
                </label>
                <button type="button" className={'chip alerta ' + (x.urgencias ? 'on' : '')} aria-pressed={!!x.urgencias} onClick={() => detalle(g, o.id, i, { urgencias: !x.urgencias })}>🚑 Ingreso en urgencias</button>
              </div>
              <div className="escala-fila">
                <span>Intensidad</span>
                <div className="seg escala fina diez" role="group" aria-label={`Intensidad del ${quien}, de 1 a 10`}>
                  {DIEZ.map((k) => <button type="button" key={k} className={x.gravedad === k ? 'on' : ''} aria-pressed={x.gravedad === k} onClick={() => detalle(g, o.id, i, { gravedad: x.gravedad === k ? null : k })}>{k}</button>)}
                </div>
              </div>
              <DatosEpisodio x={x} quien={quien} poner={(patch) => detalle(g, o.id, i, patch)} />
              <div className="field epi-hice">
                <span>Qué hice</span>
                {acciones.length > 0 && (
                  <div className="chips">
                    {acciones.map((a) => {
                      const on = (x.acciones ?? []).includes(a)
                      return <button type="button" key={a} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => detalle(g, o.id, i, { acciones: on ? (x.acciones ?? []).filter((y) => y !== a) : [...(x.acciones ?? []), a] })}>{a}</button>
                    })}
                  </div>
                )}
                <textarea aria-label={`Qué hice en el ${quien}`} rows={2} placeholder="Qué tomé, qué hice, cómo evolucionó…" value={x.hice ?? ''} onChange={(e) => detalle(g, o.id, i, { hice: e.target.value || null })} />
              </div>
              <div className="row epi-guardar">
                <button type="button" className="btn sm" aria-label={`Guardar y plegar el ${quien}`} onClick={() => detalle(g, o.id, i, { guardado: true })}>Guardar</button>
              </div>
            </div>
          )
        })}
        {eligiendo === g.id ? (
          <div className="depo">
            <div className="row between">
              <strong className="small">Nuevo episodio · ¿qué tipo? <span className="muted">(dentro puedes añadir más)</span></strong>
              <button type="button" className="linkbtn" onClick={() => setEligiendo(null)}>Cancelar</button>
            </div>
            <div className="chips" style={{ marginTop: '.4rem' }}>
              {opciones.map((t) => <button type="button" key={t.id} className="chip" onClick={() => nuevo(g, t.id)}>{nombreTipo(t)}</button>)}
              {!opciones.length && <span className="muted small">Sin tipos todavía. Añádelos en «Editar mis grupos».</span>}
            </div>
          </div>
        ) : (
          <div className="row" style={{ marginTop: '.5rem' }}>
            <button type="button" className="btn sm secondary" onClick={() => setEligiendo(g.id)}>+ Nuevo episodio</button>
          </div>
        )}
        {tieneEscala(g) && <div style={{ marginTop: '.6rem' }}>{escala(g)}</div>}
      </>
    )
  }
  const bloque = (g: Grupo) => {
    switch (g.tipo) {
      case 'hambre':
        return (
          <>
            {COMIDAS.map(([k, l]) => (
              <div className="escala-fila" key={k}>
                <span>{l}</span>
                <div className="seg escala fina" role="group" aria-label={`Hambre antes de ${l.toLowerCase()}`}>
                  {[0, ...DIEZ].map((n) => <button type="button" key={n} className={d.hambre?.[k] === n ? 'on' : ''} aria-pressed={d.hambre?.[k] === n} onClick={() => set({ hambre: { ...(d.hambre ?? {}), [k]: d.hambre?.[k] === n ? null : n } })}>{n}</button>)}
                </div>
              </div>
            ))}
            <div className="muted small">0 nada de hambre · 10 muchísima</div>
            <div className="chips" style={{ marginTop: '.4rem' }}>
              <button type="button" className={'chip ' + (d.sin_hambre ? 'on' : '')} aria-pressed={!!d.sin_hambre} onClick={() => set({ sin_hambre: !d.sin_hambre })}>Como sin hambre</button>
            </div>
          </>
        )
      case 'heces':
        return (
          <>
            {heces.map((x, i) => (
              <div className="depo" key={i}>
                <div className="row between">
                  <strong className="small">Deposición {i + 1}</strong>
                  <button type="button" className="linkbtn" onClick={() => set({ heces: heces.filter((_, k) => k !== i) })}>Quitar</button>
                </div>
                <Bristol value={x.bristol ?? null} onChange={(v) => ponerDepo(i, { bristol: v })} />
                <div className="field">
                  <span>Color</span>
                  <div className="chips">
                    {HECES_COLORES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.color === k ? 'on' : '')} aria-pressed={x.color === k} onClick={() => ponerDepo(i, { color: x.color === k ? null : k })}>{l}</button>)}
                  </div>
                </div>
                <div className="chips">
                  {HECES_MARCAS.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x[k] ? 'on' : '') + (k === 'sangre' ? ' alerta' : '')} aria-pressed={!!x[k]} onClick={() => ponerDepo(i, { [k]: !x[k] })}>{l}</button>)}
                </div>
              </div>
            ))}
            <div className="row">
              <button type="button" className="btn sm secondary" onClick={() => set({ heces: [...heces, {}], sin_heces: null })}>+ Añadir deposición</button>
              {heces.length === 0 && <button type="button" className={'chip ' + (d.sin_heces ? 'on' : '')} aria-pressed={!!d.sin_heces} onClick={() => set({ sin_heces: !d.sin_heces })}>Hoy no ha habido</button>}
            </div>
          </>
        )
      case 'micciones':
        return (
          <>
            <div className="row">
              <Stepper value={d.micciones} onChange={(v) => set({ micciones: v })} max={40} />
              <span className="muted small">veces, aproximadamente</span>
            </div>
            <div className="field">
              <span>Color</span>
              <div className="urine">
                {ORINA_COLORES.map((col, i) => <button type="button" key={col} title={ORINA_NOMBRES[i]} aria-label={ORINA_NOMBRES[i]} aria-pressed={d.orina_color === i + 1} style={{ background: col }} className={d.orina_color === i + 1 ? 'on' : ''} onClick={() => set({ orina_color: d.orina_color === i + 1 ? null : i + 1 })} />)}
              </div>
              {d.orina_color ? <div className="muted small">{ORINA_NOMBRES[d.orina_color - 1]}</div> : null}
            </div>
            <div className="chips">
              <button type="button" className={'chip ' + (d.orina_olor ? 'on' : '')} aria-pressed={!!d.orina_olor} onClick={() => set({ orina_olor: !d.orina_olor })}>Con olor</button>
            </div>
          </>
        )
      case 'escala':
        return escala(g)
      case 'texto':
        return <textarea aria-label={g.nombre} placeholder="Escribe lo que quieras anotar de hoy" value={d.texto?.[g.id] ?? ''} onChange={(e) => set({ texto: { ...(d.texto ?? {}), [g.id]: e.target.value } })} />
      default: {
        const marcadas = d.sel?.[g.id] ?? []
        if (g.tipo === 'detalle') return episodiosGrupo(g)
        return (
          <>
            <div className="chips">
              {(g.opciones ?? []).map((o) => {
                const on = marcadas.includes(o.id)
                return <button type="button" key={o.id} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => marcar(g, o.id)}>{emojiOpcion(g, o.nombre) && <span className="chip-emoji" aria-hidden="true">{emojiOpcion(g, o.nombre)} </span>}{o.nombre}</button>
              })}
              {!g.opciones?.length && <span className="muted small">Sin opciones todavía. Añádelas en «Editar mis grupos».</span>}
            </div>
            {tieneEscala(g) && <div style={{ marginTop: '.6rem' }}>{escala(g)}</div>}
          </>
        )
      }
    }
  }

  return (
    <fieldset className="sint" disabled={disabled}>
      {grupos.map((g) => (
        <div className="card sint-grupo" key={g.id}>
          <h3>{g.nombre}</h3>
          {bloque(g)}
        </div>
      ))}
    </fieldset>
  )
}
