import { useState } from 'react'
import { horaMas, indiceEn, useAncho } from '../oura/graficos'

/**
 * Una serie de la curva.
 * - `unir`: para series con lecturas sueltas (p. ej. cada medición del reloj), se unen saltando huecos.
 * - `hueco`: con `unir`, huecos de más de estas casillas cortan la línea (p. ej. horas sin reloj).
 * - `puntos`: marca cada lectura con un punto (por defecto, sí cuando `unir`).
 * - `picos`: valores máximos que se marcan aparte (p. ej. ratos a 100 lpm o más), en la misma casilla.
 * - `cerca`: al tocar, se busca la lectura más próxima de la serie a esta distancia en casillas.
 */
export type Serie = {
  nombre: string; valores: (number | null)[]; color: string
  unir?: boolean; hueco?: number; puntos?: boolean; picos?: (number | null)[]; cerca?: number
}

/** Índice con dato más próximo a `i` (como mucho a `cerca` casillas), o null. */
function proximo(vs: (number | null)[], i: number, cerca: number): number | null {
  if (vs[i] != null) return i
  for (let d = 1; d <= cerca; d++) {
    if (vs[i - d] != null) return i - d
    if (vs[i + d] != null) return i + d
  }
  return null
}

/**
 * Curva de dos (o más) series con la misma escala de tiempo, p. ej. el pulso del día del reloj y el de Oura
 * (un valor cada `paso` minutos desde `inicio`). Al tocar sale la hora y el valor de cada serie.
 */
/** Tramo visible de la curva: `casillas` desde el principio; con varias opciones se elige con botones. */
export type Ventana = { etiqueta: string; casillas: number }

export function CurvaDoble({ series: todas, inicio: inicio0, paso, unidad, titulo, alto = 90, ventanas }: {
  series: Serie[]; inicio: string; paso: number; unidad: string; titulo: string; alto?: number
  /** Si se da, la curva enseña un tramo cada vez (la primera opción de entrada) con flechas para ir hacia atrás y hacia delante. */
  ventanas?: Ventana[]
}) {
  const [sel, setSel] = useState<number | null>(null)
  const [ref, W] = useAncho()
  const [vIdx, setVIdx] = useState(0)
  const [ini, setIni] = useState<number | null>(null)
  const conTodas = todas.filter((s) => s.valores.some((v) => v != null))
  // La escala es la de todo el día, para que al pasar de tramo los valores se puedan comparar.
  const ok = conTodas.flatMap((s) => [...s.valores, ...(s.picos ?? [])].filter((v): v is number => v != null))
  if (!ok.length) return null
  const H = alto, L = 26, R = 6, T = 8, B = 6
  let lo = Math.min(...ok), hi = Math.max(...ok)
  if (hi - lo < 4) { lo -= 2; hi += 2 }
  const pad = (hi - lo) * 0.12
  lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad)
  const total = Math.max(...conTodas.map((s) => s.valores.length))
  // Tramo visible. De entrada, el que tiene la última lectura de la primera serie con datos.
  const v = ventanas?.length ? Math.min(total, ventanas[Math.min(vIdx, ventanas.length - 1)].casillas) : total
  const ultima = (() => { const vs = conTodas[0].valores; for (let i = vs.length - 1; i >= 0; i--) if (vs[i] != null) return i; return 0 })()
  const maxIni = Math.max(0, Math.ceil(total / v) * v - v)
  const desde = Math.min(maxIni, ini ?? Math.floor(ultima / v) * v)
  const hasta = Math.min(total, desde + v)
  const mover = (d: number) => { setSel(null); setIni(Math.max(0, Math.min(maxIni, desde + d * v))) }
  const cambiarVentana = (k: number) => {
    if (!ventanas) return
    const nv = Math.min(total, ventanas[k].casillas)
    const centro = sel != null ? desde + sel : desde + Math.floor((hasta - desde) / 2)
    setSel(null); setVIdx(k); setIni(Math.floor(Math.min(centro, total - 1) / nv) * nv)
  }
  const series = conTodas.map((s) => ({ ...s, valores: s.valores.slice(desde, hasta), picos: s.picos?.slice(desde, hasta) }))
  const conDatos = series
  const inicio = horaMas(inicio0, desde * paso)
  const n = Math.max(1, hasta - desde)
  const enTramo = v < total
  const finHm = horaMas(inicio0, hasta * paso)
  const fin = finHm === inicio0 && hasta >= total ? (inicio0 === '00:00' ? '24:00' : finHm) : finHm
  const X = (i: number) => L + ((W - L - R) * i) / Math.max(1, n - 1)
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo))
  const camino = (s: Serie) => {
    let d = '', prev = -Infinity
    s.valores.forEach((v, i) => {
      if (v == null) return
      const sigue = s.unir ? i - prev <= (s.hueco ?? Infinity) : i - prev === 1
      d += (d && sigue ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)
      prev = i
    })
    return d
  }
  // Lectura más próxima de cada serie a donde se toca.
  const elegidos = sel == null ? [] : conDatos.map((s) => proximo(s.valores, sel, s.cerca ?? 0))
  const iHora = sel == null ? null : (elegidos.find((j) => j != null) ?? sel)
  return (
    <div className="oura-grafico" ref={ref}>
      <div className="row between small">
        <strong>{titulo}</strong>
        {iHora != null
          ? <span className="muted">{horaMas(inicio, iHora * paso)}</span>
          : <span className="muted">toca la curva</span>}
      </div>
      <div className="curva-leyenda small">
        {conDatos.map((s, k) => {
          const j = elegidos[k]
          const v = j != null ? s.valores[j] : null
          const pico = j != null ? s.picos?.[j] : null
          return (
            <span key={s.nombre}><i style={{ background: s.color }} aria-hidden="true" />{s.nombre}
              {sel != null && <b> {v ?? '—'}{v != null ? ` ${unidad}` : ''}{pico != null && pico !== v ? ` · máx ${pico}` : ''}</b>}
            </span>
          )
        })}
      </div>
      {ventanas && ventanas.length > 0 && (
        <div className="curva-tramo small">
          <button type="button" className="chip" onClick={() => mover(-1)} disabled={!enTramo || desde <= 0} aria-label="Horas anteriores">◀</button>
          <span className="curva-tramo-horas">{enTramo ? `${inicio} – ${fin}` : 'Todo el día'}</span>
          <button type="button" className="chip" onClick={() => mover(1)} disabled={!enTramo || desde >= maxIni} aria-label="Horas siguientes">▶</button>
          {ventanas.length > 1 && (
            <span className="chips curva-tramo-zoom">
              {ventanas.map((w, k) => (
                <button key={w.etiqueta} type="button" className={'chip' + (k === vIdx ? ' on' : '')} onClick={() => cambiarVentana(k)}>{w.etiqueta}</button>
              ))}
            </span>
          )}
        </div>
      )}
      <svg className="oura-svg toque" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}: ${conDatos.map((s) => s.nombre).join(' y ')}`}
        onPointerMove={(e) => setSel(indiceEn(e, n, L, R, W))} onPointerDown={(e) => setSel(indiceEn(e, n, L, R, W))}>
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={L - 4} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{v}</text>
          </g>
        ))}
        {conDatos.map((s) => <path key={s.nombre} d={camino(s)} fill="none" stroke={s.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />)}
        {conDatos.filter((s) => s.puntos ?? s.unir).map((s) => s.valores.map((v, i) => v != null && <circle key={s.nombre + i} cx={X(i)} cy={Y(v)} r={enTramo ? 2.6 : 1.8} fill={s.color} />))}
        {conDatos.map((s) => s.picos?.map((p, i) => p != null && (
          <circle key={s.nombre + 'p' + i} cx={X(i)} cy={Y(p)} r="3.2" fill="var(--card)" stroke={s.color} strokeWidth="1.8" />
        )))}
        {sel != null && (
          <g>
            <line x1={X(iHora!)} x2={X(iHora!)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 3" />
            {conDatos.map((s, k) => {
              const j = elegidos[k]
              return j != null && s.valores[j] != null && <circle key={s.nombre} cx={X(j)} cy={Y(s.valores[j]!)} r="4" fill={s.color} stroke="var(--card)" strokeWidth="2" />
            })}
          </g>
        )}
      </svg>
    </div>
  )
}
