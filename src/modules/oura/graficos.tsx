import { useState, type PointerEvent, type ReactNode } from 'react'
import type { FasesNoche } from './tipos'

/** Gráficos propios del pilar Oura Ring. Colores solo con las variables de tokens.css. */

const W = 320

/** Suma minutos a una hora HH:MM y la devuelve como HH:MM (vuelve a 00 pasada la medianoche). */
export function horaMas(hm: string, min: number) {
  const [h, m] = hm.split(':').map(Number)
  const t = (((h * 60 + m + min) % 1440) + 1440) % 1440
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')
}
export function hm(min?: number | null) {
  if (min == null) return '—'
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}
const fmt = (v: number, dec: number) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Letra del día de la semana (L M X J V S D) de una fecha AAAA-MM-DD. */
export const letraDia = (d: string) => 'LMXJVSD'[(new Date(d + 'T12:00:00').getDay() + 6) % 7]
export const finde = (d: string) => { const w = new Date(d + 'T12:00:00').getDay(); return w === 0 || w === 6 }
export const fechaCorta = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const fechaLarga = (d: string) => `${DIAS_SEMANA[new Date(d + 'T12:00:00').getDay()]} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`

/* ---------- Manos: valoración de una puntuación de 0 a 100 (rangos de Oura) ---------- */

export type Nivel = 'bien' | 'regular' | 'mal'
/** 85 o más, óptimo; de 70 a 84, bien; menos de 70, a vigilar (rangos de Oura para puntuaciones y factores). */
export const nivelDe = (v?: number | null): Nivel | null => (v == null ? null : v >= 85 ? 'bien' : v >= 70 ? 'regular' : 'mal')
const MANO: Record<Nivel, [string, string]> = { bien: ['👍', 'Bien'], regular: ['🫳', 'Ni bien ni mal'], mal: ['👎', 'A vigilar'] }
export function Mano({ n }: { n: Nivel | null }) {
  if (!n) return null
  return <span className={'oura-mano ' + n} role="img" aria-label={MANO[n][1]} title={MANO[n][1]}>{MANO[n][0]}</span>
}
export function LeyendaManos() {
  return (
    <div className="oura-leyenda-manos">
      <span><Mano n="bien" /> 85–100, bien</span>
      <span><Mano n="regular" /> 70–84, ni bien ni mal</span>
      <span><Mano n="mal" /> menos de 70, a vigilar</span>
    </div>
  )
}

/** Explicación plegable al final de un bloque. */
export function Explica({ titulo = '¿Qué significa?', children }: { titulo?: string; children: ReactNode }) {
  return (
    <details className="oura-explica">
      <summary>{titulo}</summary>
      <div>{children}</div>
    </details>
  )
}

/* ---------- Dibujo de la noche ---------- */

const FILA: Record<string, number> = { '4': 0, '3': 1, '2': 2, '1': 3 }
const NOMBRE_FILA = ['Despierta', 'REM', 'Ligero', 'Profundo']
const COLOR_FILA = ['var(--amber)', 'var(--plato-proteina)', 'var(--primary-soft)', 'var(--green)']

/** Cada 5 minutos, en qué fase estaba (como en la app de Oura). */
export function Hipnograma({ fases, dormir }: { fases: FasesNoche; dormir?: string }) {
  const H = 112, L = 62, T = 6, B = 18
  const n = fases.length
  if (!n) return null
  const fh = (H - T - B) / 4
  const x = (i: number) => L + ((W - L - 6) * i) / n
  const marcas = dormir ? [0, Math.round(n / 3), Math.round((2 * n) / 3), n] : []
  return (
    <svg className="oura-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fases del sueño de la noche, cada 5 minutos">
      {NOMBRE_FILA.map((t, r) => (
        <g key={t}>
          <text x={L - 6} y={T + fh * r + fh / 2 + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{t}</text>
          <line x1={L} x2={W - 6} y1={T + fh * (r + 1)} y2={T + fh * (r + 1)} stroke="var(--line)" />
        </g>
      ))}
      {[...fases].map((f, i) => {
        const r = FILA[f]
        if (r == null) return null
        return <rect key={i} x={x(i)} y={T + fh * r + 2} width={Math.max(1, x(i + 1) - x(i))} height={fh - 4} rx="1.5" fill={COLOR_FILA[r]} />
      })}
      {dormir && marcas.map((m) => (
        <text key={m} x={Math.min(Math.max(x(m), L + 12), W - 18)} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">{horaMas(dormir, m * 5)}</text>
      ))}
    </svg>
  )
}

/** Cuántos ciclos de sueño hubo, contando los tramos de REM separados por al menos 30 minutos sin REM. */
export function ciclosDe(fases: FasesNoche) {
  let ciclos = 0, sinRem = 99
  for (const f of fases) {
    if (f === '3') { if (sinRem >= 6) ciclos++; sinRem = 0 } else sinRem++
  }
  return ciclos
}
/** Minutos de sueño profundo en la primera mitad de la noche, sobre el total de profundo. */
export function profundoPrimeraMitad(fases: FasesNoche) {
  const mitad = Math.floor(fases.length / 2)
  const total = [...fases].filter((f) => f === '1').length
  const antes = [...fases.slice(0, mitad)].filter((f) => f === '1').length
  return total ? Math.round((100 * antes) / total) : null
}

/** Reparto de la noche en fases, en una sola barra. */
export function BarraFases({ profundo = 0, rem = 0, ligero = 0, despierta = 0 }: { profundo?: number; rem?: number; ligero?: number; despierta?: number }) {
  const total = profundo + rem + ligero + despierta || 1
  const partes: [string, number, string][] = [
    ['Profundo', profundo, 'var(--green)'], ['REM', rem, 'var(--plato-proteina)'], ['Ligero', ligero, 'var(--primary-soft)'], ['Despierta', despierta, 'var(--amber)'],
  ]
  return (
    <div>
      <div className="oura-fases">{partes.map(([n, v, c]) => <i key={n} style={{ width: (100 * v) / total + '%', background: c }} title={`${n}: ${hm(v)}`} />)}</div>
      <div className="oura-leyenda">
        {partes.map(([n, v, c]) => <span key={n}><i style={{ background: c }} />{n} <b>{hm(v)}</b></span>)}
      </div>
    </div>
  )
}

/* ---------- Curva por horas, se puede tocar ---------- */

/** Índice del punto más cercano al dedo o al cursor. */
function indiceEn(e: PointerEvent<SVGSVGElement>, n: number, L: number, R: number) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * W
  return Math.max(0, Math.min(n - 1, Math.round(((x - L) / (W - L - R)) * (n - 1))))
}

export function Curva({ valores, inicio, paso, unidad, titulo, color = 'var(--primary)', zona, dec = 0 }: {
  valores: (number | null)[]
  /** Hora del primer valor (HH:MM). */
  inicio: string
  /** Minutos entre valores. */
  paso: number
  unidad: string
  titulo: string
  color?: string
  /** Franja que se resalta, en minutos desde `inicio` (por ejemplo, de 00 a 04 h). */
  zona?: { desde: number; hasta: number; texto: string }
  dec?: number
}) {
  const [sel, setSel] = useState<number | null>(null)
  const H = 124, L = 30, R = 8, T = 10, B = 20
  const ok = valores.filter((v): v is number => v != null)
  if (!ok.length) return null
  let lo = Math.min(...ok), hi = Math.max(...ok)
  if (hi - lo < 4) { lo -= 2; hi += 2 }
  const pad = (hi - lo) * 0.12
  lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad)
  const n = valores.length
  const X = (i: number) => L + ((W - L - R) * i) / Math.max(1, n - 1)
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo))
  let d = ''
  valores.forEach((v, i) => { if (v == null) return; d += (d && valores[i - 1] != null ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) })
  const total = (n - 1) * paso
  const cada = total > 600 ? 240 : total > 300 ? 120 : 60
  const ticks: number[] = []
  for (let m = 0; m <= total; m += cada) ticks.push(m)
  const XM = (m: number) => L + ((W - L - R) * m) / Math.max(1, total)
  const vMin = Math.min(...ok), vMax = Math.max(...ok)
  const s = sel != null && valores[sel] != null ? sel : null
  return (
    <div className="oura-grafico">
      <div className="row between small">
        <strong>{titulo}</strong>
        {s != null
          ? <span><b>{fmt(valores[s]!, dec)} {unidad}</b> <span className="muted">· {horaMas(inicio, s * paso)}</span></span>
          : <span className="muted">de {fmt(vMin, dec)} a {fmt(vMax, dec)} {unidad} · toca la curva</span>}
      </div>
      <svg className="oura-svg toque" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}: de ${vMin} a ${vMax} ${unidad}`}
        onPointerMove={(e) => setSel(indiceEn(e, n, L, R))} onPointerDown={(e) => setSel(indiceEn(e, n, L, R))}>
        {zona && zona.hasta > 0 && zona.desde < total && (
          <g>
            <rect x={XM(Math.max(0, zona.desde))} y={T} width={XM(Math.min(total, zona.hasta)) - XM(Math.max(0, zona.desde))} height={H - T - B} fill="var(--resalte)" />
            <text x={XM(Math.max(0, zona.desde)) + 3} y={T + 10} fontSize="9" fill="var(--muted)">{zona.texto}</text>
          </g>
        )}
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 4} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{v}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {s != null && (
          <g>
            <line x1={X(s)} x2={X(s)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 3" />
            <circle cx={X(s)} cy={Y(valores[s]!)} r="4" fill={color} stroke="var(--card)" strokeWidth="2" />
          </g>
        )}
        {ticks.map((m) => <text key={m} x={XM(m)} y={H - 5} textAnchor="middle" fontSize="9" fill="var(--muted)">{horaMas(inicio, m)}</text>)}
      </svg>
    </div>
  )
}

/* ---------- Barras por días, se pueden tocar ---------- */

export interface PuntoDia { day: string; y: number }

/**
 * Una barra por día. `abajo`: letra del día de la semana (L M X J V S D) o la fecha.
 * `cero`: barras hacia arriba y hacia abajo desde el 0 (temperatura). `lineas`: referencias horizontales.
 * `colorDe`: color de cada barra según su valor.
 */
export function BarrasDias({ titulo, puntos, unidad, dec = 0, abajo = 'semana', cero = false, lineas = [], colorDe, base, marca }: {
  titulo: string
  puntos: PuntoDia[]
  unidad: string
  dec?: number
  abajo?: 'semana' | 'fecha'
  cero?: boolean
  lineas?: { y: number; texto: string }[]
  colorDe?: (y: number) => string
  /** Valor desde el que suben las barras (si no, un poco por debajo del mínimo). */
  base?: number
  /** Día que se marca con una línea vertical (por ejemplo, el inicio de la subida de temperatura). */
  marca?: { day: string; texto: string }
}) {
  const [sel, setSel] = useState<number | null>(null)
  const H = 126, L = 30, R = 6, T = 10, B = 20
  if (!puntos.length) return <p className="muted small">{titulo}: sin datos todavía.</p>
  const ys = puntos.map((p) => p.y)
  let lo: number, hi: number
  if (cero) { const m = Math.max(0.3, ...ys.map(Math.abs)) * 1.15; lo = -m; hi = m }
  else {
    hi = Math.max(...ys, ...lineas.map((l) => l.y))
    lo = base ?? Math.min(...ys, ...lineas.map((l) => l.y))
    const span = hi - lo || 1
    if (base == null) lo -= span * 0.35
    hi += span * 0.08
  }
  const n = puntos.length
  const slot = (W - L - R) / n
  const X = (i: number) => L + slot * i + slot / 2
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo))
  const y0 = cero ? Y(0) : H - B
  const bw = Math.max(2, Math.min(14, slot * 0.66))
  const s = sel ?? n - 1
  const color = (v: number) => colorDe ? colorDe(v) : cero ? (v >= 0 ? 'var(--plato-proteina)' : 'var(--green)') : 'var(--muted)'
  const fechaCada = Math.ceil(n / 6)
  return (
    <div className="oura-grafico">
      <div className="row between small">
        <strong>{titulo}</strong>
        <span><b>{cero && puntos[s].y > 0 ? '+' : ''}{fmt(puntos[s].y, dec)} {unidad}</b> <span className="muted">· {fechaLarga(puntos[s].day)}</span></span>
      </div>
      <svg className="oura-svg toque" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}, ${n} días`}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSel(Math.max(0, Math.min(n - 1, Math.floor((((e.clientX - r.left) / r.width) * W - L) / slot)))) }}
        onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSel(Math.max(0, Math.min(n - 1, Math.floor((((e.clientX - r.left) / r.width) * W - L) / slot)))) }}>
        {abajo === 'semana' && puntos.map((p, i) => finde(p.day) && <rect key={'f' + i} x={L + slot * i} y={T} width={slot} height={H - T - B} fill="var(--line)" opacity=".45" />)}
        {lineas.map((l) => (
          <g key={l.texto}>
            <line x1={L} x2={W - R} y1={Y(l.y)} y2={Y(l.y)} stroke="var(--muted)" strokeDasharray="3 3" strokeWidth=".8" />
            <text x={L - 4} y={Y(l.y) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{l.texto}</text>
          </g>
        ))}
        {cero && <text x={L - 4} y={Y(0) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">0</text>}
        {cero && <text x={L - 4} y={Y(hi * 0.8) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">+</text>}
        {cero && <text x={L - 4} y={Y(lo * 0.8) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">−</text>}
        {puntos.map((p, i) => {
          const yv = Y(p.y), top = Math.min(yv, y0), h = Math.max(1, Math.abs(yv - y0))
          return <rect key={i} x={X(i) - bw / 2} y={top} width={bw} height={h} rx="2" fill={color(p.y)} opacity={i === s ? 1 : 0.7} stroke={i === s ? 'var(--text)' : 'none'} strokeWidth=".8" />
        })}
        <line x1={L} x2={W - R} y1={y0} y2={y0} stroke="var(--muted)" strokeWidth=".8" />
        {marca && (() => { const i = puntos.findIndex((p) => p.day === marca.day); if (i < 0) return null; const x = L + slot * i; return (
          <g><line x1={x} x2={x} y1={T} y2={H - B} stroke="var(--text)" strokeDasharray="2 2" strokeWidth=".9" /><text x={x > W * 0.6 ? x - 3 : x + 3} y={T + 8} textAnchor={x > W * 0.6 ? 'end' : 'start'} fontSize="9" fill="var(--text)">{marca.texto}</text></g>
        ) })()}
        {puntos.map((p, i) => abajo === 'semana'
          ? (
            <g key={'t' + i}>
              <text x={X(i)} y={H - 6} textAnchor="middle" fontSize="8.5" fontWeight={i === s ? 700 : 400} fill={finde(p.day) ? 'var(--text)' : 'var(--muted)'}>{letraDia(p.day)}</text>
            </g>
          )
          : (i % fechaCada === 0 || i === n - 1) && <text key={'t' + i} x={X(i)} y={H - 5} textAnchor="middle" fontSize="9" fill="var(--muted)">{fechaCorta(p.day)}</text>)}
      </svg>
    </div>
  )
}

/** Barras horizontales de los factores de una puntuación (0-100), con su mano. */
export function Factores({ items }: { items: { nombre: string; valor?: number; detalle?: ReactNode }[] }) {
  return (
    <div className="oura-factores">
      {items.map((i) => {
        const v = i.valor
        const n = nivelDe(v)
        return (
          <div key={i.nombre} className={'oura-factor ' + (n ?? '')}>
            <span>{i.nombre}</span>
            <span className="barra"><i className={n === 'regular' ? 'amarillo' : n === 'mal' ? 'rojo' : ''} style={{ width: (v ?? 0) + '%' }} /></span>
            <b>{v ?? '—'}</b>
            <Mano n={n} />
            {i.detalle && <small className="oura-factor-detalle">{i.detalle}</small>}
          </div>
        )
      })}
    </div>
  )
}

/** Observación escrita a partir de los datos (orientativa, no diagnóstica). */
export function Observacion({ children }: { children: ReactNode }) {
  return <div className="oura-observacion"><strong>Observación</strong>{children}</div>
}

const COLOR_CLASE = ['transparent', 'var(--primary-soft)', 'var(--line)', 'var(--amber)', 'var(--plato-proteina)', 'var(--red)']
const NOMBRE_CLASE = ['Sin anillo', 'Descanso', 'Sentada o quieta', 'Actividad baja', 'Actividad media', 'Actividad alta']
/** Movimiento del día cada 5 minutos (class_5_min de Oura: 0 sin anillo, 1 descanso, 2 quieta, 3 baja, 4 media, 5 alta). */
export function TiraDia({ clases }: { clases: string }) {
  const n = clases.length
  if (!n) return null
  const H = 46, L = 4, R = 4
  const w = (W - L - R) / n
  return (
    <div className="oura-grafico">
      <div className="row between small"><strong>Movimiento del día</strong><span className="muted">cada 5 minutos</span></div>
      <svg className="oura-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Movimiento del día cada 5 minutos">
        {[...clases].map((c, i) => <rect key={i} x={L + w * i} y={6} width={w + 0.3} height={22} fill={COLOR_CLASE[Number(c)] ?? 'transparent'} />)}
        {[0, 6, 12, 18, 24].map((h) => <text key={h} x={L + ((W - L - R) * h) / 24} y={H - 4} textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'} fontSize="9" fill="var(--muted)">{String(h % 24).padStart(2, '0')}:00</text>)}
      </svg>
      <div className="oura-leyenda" style={{ marginBottom: '.35rem' }}>
        {[1, 2, 3, 4, 5].map((k) => <span key={k}><i style={{ background: COLOR_CLASE[k] }} />{NOMBRE_CLASE[k]}</span>)}
      </div>
    </div>
  )
}
