import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Empty, TriButton, type TriState } from '../../components/ui'
import { addDays, fmtDate, todayStr, weekStart } from '../../lib/dates'
import { listDaily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { Editor } from './Editor'
import { ICONO } from './Iconos'
import {
  DIAS_CORTOS, MOMENTOS, bloquesDel, diasTxt, distintivo, estadoBloque, marcables, minutosTotales, nivelDia, otrosDias, porMomento, semanaDe,
  type BioCfg, type BioDia, type Bloque, type Marca,
} from './logica'

type Vista = { v: 'agenda' } | { v: 'bloque'; id: string } | { v: 'editar' }

/** Biohacking, como el Ejercicio de Huma: arriba la semana y, por día, una tarjeta por bloque de la rutina.
 *  Dentro de cada bloque, sus prácticas con los tres toques: ✓ hecho · ✗ no hecho · NP no precisa. */
export default function Biohacking() {
  const date = useParams().date ?? todayStr()
  const nav = useNavigate()
  const [vista, setVistaRaw] = useState<Vista>({ v: 'agenda' })
  const setVista = (v: Vista) => { setVistaRaw(v); window.scrollTo(0, 0) }
  const { value: d, set, state, rev, retry } = useDaily<BioDia>('biohacking', date)
  const [cfg, saveCfg] = useSettings<BioCfg>('biohacking')
  const marcas = d.marcas ?? {}

  const marcar = (cambios: { [id: string]: Marca | null }) => {
    const m = { ...marcas }
    for (const [k, v] of Object.entries(cambios)) { if (v) m[k] = v; else delete m[k] }
    set({ marcas: m })
  }
  const irA = (fecha: string) => nav(`/biohacking/${fecha}`)
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'
  const errorGuardar = state === 'error' && (
    <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
  )

  if (vista.v === 'editar') {
    return <Editor bloques={cfg?.bloques ?? []} guardar={async (bloques) => { await saveCfg({ bloques }); setVista({ v: 'agenda' }) }} cancelar={() => setVista({ v: 'agenda' })} />
  }
  if (vista.v === 'bloque') {
    const b = (cfg?.bloques ?? []).find((x) => x.id === vista.id)
    if (b) return <>{errorGuardar}<VistaBloque b={b} date={date} marcas={marcas} marcar={marcar} estado={estado} volver={() => setVista({ v: 'agenda' })} /></>
  }
  return (
    <div className="bio">
      {errorGuardar}
      <Agenda cfg={cfg} date={date} dia={d} rev={rev} irA={irA} estado={estado} abrir={(id) => setVista({ v: 'bloque', id })} editar={() => setVista({ v: 'editar' })} />
    </div>
  )
}

// ---------------------------------------------------------------- Agenda
function Agenda({ cfg, date, dia, rev, irA, estado, abrir, editar }: {
  cfg: BioCfg | null; date: string; dia: BioDia; rev: number; irA: (d: string) => void; estado: string; abrir: (id: string) => void; editar: () => void
}) {
  const hoy = todayStr()
  const lunes = weekStart(date)
  const semana = semanaDe(date)
  const [dias, setDias] = useState<{ [d: string]: BioDia }>({})
  useEffect(() => {
    let vivo = true
    listDaily<BioDia>('biohacking', lunes, addDays(lunes, 6)).then(
      (rs) => { if (vivo) setDias(Object.fromEntries(rs.map((r) => [r.day, r.value]))) },
      () => { /* sin conexión: la semana sale sin puntos */ },
    )
    return () => { vivo = false }
  }, [lunes, rev])
  const diaDe = (x: string) => (x === date ? dia : dias[x])

  const bs = bloquesDel(cfg, date)
  const otros = otrosDias(cfg, date)
  const n = nivelDia(cfg, date, dia)
  const min = minutosTotales(bs)

  return (
    <div>
      <div className="row between">
        <h1>Biohacking</h1>
        <button type="button" className="btn sm secondary" onClick={editar}>Editar rutina</button>
      </div>
      <div className="bio-semana-nav">
        <button type="button" className="btn sm ghost" aria-label="Semana anterior" onClick={() => irA(addDays(lunes, -7))}>‹</button>
        <strong>Semana del {fmtDate(lunes)}</strong>
        <button type="button" className="btn sm ghost" aria-label="Semana siguiente" disabled={addDays(lunes, 7) > hoy} onClick={() => irA(addDays(lunes, 7) > hoy ? hoy : addDays(lunes, 7))}>›</button>
      </div>
      <div className="bio-semana">
        {semana.map((x, i) => {
          const nv = x > hoy ? 'sin' : nivelDia(cfg, x, diaDe(x)).nivel
          return (
            <button key={x} type="button" disabled={x > hoy} className={'bio-dia' + (x === date ? ' on' : '') + (x === hoy ? ' hoy' : '')} onClick={() => irA(x)} aria-label={fmtDate(x)}>
              <span className="l">{DIAS_CORTOS[i]}</span>
              <span className="n">{Number(x.slice(8))}</span>
              <span className="pts">{nv !== 'sin' && <i className={nv} />}</span>
            </button>
          )
        })}
      </div>
      <p className="muted small bio-leyenda"><i className="completo" /> completo <i className="parcial" /> a medias <i className="nada" /> sin hacer</p>

      <p className="muted small bio-dia-txt">
        <strong>{date === hoy ? 'Hoy' : fmtDate(date)}</strong>
        {bs.length > 0 && <> · {n.pct} % · {min ? `unos ${min} min` : ''}</>}
        {' · '}{estado}
      </p>

      {cfg && !(cfg.bloques ?? []).length && (
        <div className="card"><Empty>Aún no hay rutina. Crea el primer bloque con «Editar rutina».</Empty></div>
      )}

      {porMomento(bs).map((g) => (
        <div key={g.titulo}>
          <h3 className="bio-momento">{g.titulo}</h3>
          {g.bloques.map((b) => {
            const e = estadoBloque(b, dia.marcas)
            const dist = distintivo(e)
            const sub = [`${e.total} ${e.total === 1 ? 'práctica' : 'prácticas'}`, b.minutos ? `${b.minutos} min` : '', b.dias?.length ? diasTxt(b.dias) : ''].filter(Boolean).join(' · ')
            return (
              <button type="button" key={b.id} className="bio-card" onClick={() => abrir(b.id)}>
                <span className={'bio-ico ' + (b.ico ?? 'otro')} aria-hidden="true">{ICONO[b.ico ?? 'otro'] ?? ICONO.otro}</span>
                <span className="bio-txt"><strong>{b.nombre}</strong><span>{sub}</span></span>
                <span className={'bio-badge' + (dist.ok ? ' ok' : '')}>{dist.txt}</span>
              </button>
            )
          })}
        </div>
      ))}

      {otros.length > 0 && (
        <div className="bio-otros">
          <h3 className="bio-momento">{date === hoy ? 'Hoy no toca' : 'Ese día no tocaba'}</h3>
          {otros.map((b) => <p key={b.id} className="small muted">{b.nombre} · {diasTxt(b.dias)}</p>)}
        </div>
      )}
      {bs.length > 0 && <p className="muted small">Un toque ✓ hecho · dos ✗ no hecho · tres NP no precisa. Lo que quede sin marcar cuenta como no hecho.</p>}
    </div>
  )
}

// ---------------------------------------------------------------- Un bloque
function VistaBloque({ b, date, marcas, marcar, estado, volver }: {
  b: Bloque; date: string; marcas: NonNullable<BioDia['marcas']>; marcar: (c: { [id: string]: Marca | null }) => void; estado: string; volver: () => void
}) {
  const ps = marcables(b)
  const e = estadoBloque(b, marcas)
  const momento = MOMENTOS.find(([k]) => k === b.momento)?.[1]
  const sub = [b.minutos ? `${b.minutos} min` : '', momento, b.dias?.length ? diasTxt(b.dias) : ''].filter(Boolean).join(' · ')
  const todo = (v: Marca) => marcar(Object.fromEntries(ps.filter((p) => v === 'np' || !marcas[p.id]).map((p) => [p.id, v])))
  return (
    <div className="bio">
      <div className="bio-head">
        <button type="button" className="bio-back" aria-label="Volver" onClick={volver}>←</button>
        <div className="bio-fecha">{date === todayStr() ? 'Hoy' : fmtDate(date)} · {estado}</div>
        <h1>{b.nombre}</h1>
        {sub && <p className="muted small">{sub}</p>}
      </div>
      {b.nota && <div className="card tight small">{b.nota}</div>}
      {!!b.minutos && <Temporizador key={b.id} minutos={b.minutos} />}

      <div className="card">
        {b.practicas.filter((p) => p.nombre.trim()).map((p) => p.sep ? (
          <div key={p.id} className="bio-sep">{p.nombre}</div>
        ) : (
          <div key={p.id} className={'tri-row ' + (marcas[p.id] ?? '')}>
            <TriButton value={(marcas[p.id] ?? null) as TriState} label={p.nombre} onChange={(v) => marcar({ [p.id]: v as Marca | null })} />
            <div>
              <strong>{p.nombre}</strong>
              {p.nota && <div className="muted small">{p.nota}</div>}
            </div>
          </div>
        ))}
        {!ps.length && <Empty>Este bloque aún no tiene prácticas. Añádelas en «Editar rutina».</Empty>}
      </div>
      {ps.length > 0 && (
        <div className="bio-pie">
          <button type="button" className="btn" disabled={e.marcadas === e.total} onClick={() => todo('si')}>Marcar lo que falta como hecho</button>
          <button type="button" className="btn ghost" onClick={() => todo('np')}>Hoy no precisa</button>
        </div>
      )}
      <p className="muted small">Un toque ✓ hecho · dos ✗ no hecho · tres NP no precisa · cuatro, sin marcar.</p>
    </div>
  )
}

/** Cuenta atrás de la duración del bloque. Al llegar a cero vibra, si el móvil lo permite. */
function Temporizador({ minutos }: { minutos: number }) {
  const total = minutos * 60
  const [quedan, setQuedan] = useState(total)
  const [corre, setCorre] = useState(false)
  const fin = useRef(0)
  useEffect(() => {
    if (!corre) return
    fin.current = Date.now() + quedan * 1000
    const t = window.setInterval(() => {
      const q = Math.max(0, Math.round((fin.current - Date.now()) / 1000))
      setQuedan(q)
      if (q === 0) {
        setCorre(false)
        try { navigator.vibrate?.([300, 150, 300]) } catch { /* sin vibración */ }
      }
    }, 250)
    return () => window.clearInterval(t)
  }, [corre]) // eslint-disable-line react-hooks/exhaustive-deps
  const mm = String(Math.floor(quedan / 60)).padStart(2, '0')
  const ss = String(quedan % 60).padStart(2, '0')
  const pct = 100 - Math.round((quedan / total) * 100)
  return (
    <div className="card bio-timer">
      <div className={'bio-reloj' + (quedan === 0 ? ' fin' : '')}>{quedan === 0 ? 'Hecho' : `${mm}:${ss}`}</div>
      <div className="barra"><i className="verde" style={{ width: pct + '%' }} /></div>
      <div className="row">
        {quedan > 0 && <button type="button" className="btn sm" onClick={() => setCorre(!corre)}>{corre ? 'Pausa' : quedan === total ? `Empezar ${minutos} min` : 'Seguir'}</button>}
        {quedan !== total && <button type="button" className="btn sm ghost" onClick={() => { setCorre(false); setQuedan(total) }}>Reiniciar</button>}
      </div>
    </div>
  )
}
