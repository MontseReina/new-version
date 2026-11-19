import { useState } from 'react'
import { horaMas, indiceEn, useAncho } from '../oura/graficos'

/** `unir`: para series con pocas lecturas sueltas (p. ej. la variabilidad del reloj), se unen saltando huecos y se marca cada punto. */
export type Serie = { nombre: string; valores: (number | null)[]; color: string; unir?: boolean }

/**
 * Curva de dos (o más) series con la misma escala de tiempo, p. ej. el pulso del día del reloj y el de Oura
 * (una media cada `paso` minutos desde `inicio`). Al tocar sale la hora y el valor de cada serie.
 */
export function CurvaDoble({ series, inicio, paso, unidad, titulo, alto = 90 }: {
  series: Serie[]; inicio: string; paso: number; unidad: string; titulo: string; alto?: number
}) {
  const [sel, setSel] = useState<number | null>(null)
  const [ref, W] = useAncho()
  const conDatos = series.filter((s) => s.valores.some((v) => v != null))
  const ok = conDatos.flatMap((s) => s.valores.filter((v): v is number => v != null))
  if (!ok.length) return null
  const H = alto, L = 26, R = 6, T = 8, B = 6
  let lo = Math.min(...ok), hi = Math.max(...ok)
  if (hi - lo < 4) { lo -= 2; hi += 2 }
  const pad = (hi - lo) * 0.12
  lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad)
  const n = Math.max(...conDatos.map((s) => s.valores.length))
  const X = (i: number) => L + ((W - L - R) * i) / Math.max(1, n - 1)
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo))
  const camino = (vs: (number | null)[], unir?: boolean) => {
    let d = ''
    vs.forEach((v, i) => { if (v == null) return; d += (d && (unir || vs[i - 1] != null) ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) })
    return d
  }
  return (
    <div className="oura-grafico" ref={ref}>
      <div className="row between small">
        <strong>{titulo}</strong>
        {sel != null
          ? <span className="muted">{horaMas(inicio, sel * paso)}</span>
          : <span className="muted">toca la curva</span>}
      </div>
      <div className="curva-leyenda small">
        {conDatos.map((s) => (
          <span key={s.nombre}><i style={{ background: s.color }} aria-hidden="true" />{s.nombre}{sel != null && <b> {s.valores[sel] ?? '—'}{s.valores[sel] != null ? ` ${unidad}` : ''}</b>}</span>
        ))}
      </div>
      <svg className="oura-svg toque" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}: ${conDatos.map((s) => s.nombre).join(' y ')}`}
        onPointerMove={(e) => setSel(indiceEn(e, n, L, R, W))} onPointerDown={(e) => setSel(indiceEn(e, n, L, R, W))}>
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 4} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{v}</text>
          </g>
        ))}
        {conDatos.map((s) => <path key={s.nombre} d={camino(s.valores, s.unir)} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />)}
        {conDatos.filter((s) => s.unir).map((s) => s.valores.map((v, i) => v != null && <circle key={s.nombre + i} cx={X(i)} cy={Y(v)} r="2.6" fill={s.color} />))}
        {sel != null && (
          <g>
            <line x1={X(sel)} x2={X(sel)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 3" />
            {conDatos.map((s) => s.valores[sel] != null && <circle key={s.nombre} cx={X(sel)} cy={Y(s.valores[sel]!)} r="4" fill={s.color} stroke="var(--card)" strokeWidth="2" />)}
          </g>
        )}
      </svg>
    </div>
  )
}
