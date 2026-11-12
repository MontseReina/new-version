import { useEffect, useMemo, useState } from 'react'
import { addDays, fmtDate, todayStr, weekStart } from '../../lib/dates'
import { listDaily } from '../../store/repo'
import { useAncho } from '../oura/graficos'
import { CONTEXTO_FC, type OuraDia } from '../oura/tipos'
import { HIDRATACIONES, POSICIONES, TIPOS_MEDIDA, type Medida, type SintDia } from '../sintomas/logica'

/**
 * Evaluaciones · Constantes por días: gráficos y tabla de las tomas de Disautonomía (y, si se quiere, de los ratos
 * de 100 lpm o más del anillo Oura) semana a semana (de lunes a domingo), para imprimir o guardar en PDF y llevar a la consulta.
 * Las franjas sombreadas son los rangos de referencia generales del adulto (los mismos que resaltan las tomas).
 */

type Toma = Medida & { day: string; hora: string; origen: 'mia' | 'oura'; min?: number; contexto?: string }

const etiqueta = (pares: [string, string][], k?: string | null) => (k ? pares.find(([c]) => c === k)?.[1] ?? '' : '')
const minDe = (hora: string) => { const [h, m] = hora.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const ddmm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`

function dias(desde: string, hasta: string): string[] {
  const out: string[] = []
  for (let d = desde; d <= hasta && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}

type Punto = { day: string; hora: string; y: number; y2?: number; hueco?: boolean; marca?: boolean }

/** Puntos por día: cada toma en su día y a su hora dentro del día. Franja sombreada = rango de referencia. */
function PuntosPorDia({ titulo, unidad, ds, puntos, rango, nota }: {
  titulo: string; unidad: string; ds: string[]; puntos: Punto[]; rango: [number, number]; nota?: string
}) {
  const [ref, W] = useAncho()
  const H = 130, L = 30, R = 6, T = 8, B = 18
  const ys = puntos.flatMap((p) => (p.marca ? [] : p.y2 != null ? [p.y, p.y2] : [p.y]))
  let lo = Math.min(rango[0], ...ys), hi = Math.max(rango[1], ...ys)
  const pad = (hi - lo) * 0.1 || 5
  lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad)
  const n = ds.length
  const slot = (W - L - R) / Math.max(1, n)
  const idx = new Map(ds.map((d, i) => [d, i]))
  const X = (p: { day: string; hora: string }) => L + slot * ((idx.get(p.day) ?? 0) + Math.min(0.92, Math.max(0.08, minDe(p.hora) / 1440)))
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo))
  const cada = Math.max(1, Math.ceil(n / Math.max(4, Math.floor((W - L - R) / 44))))
  const sinDatos = !puntos.length
  return (
    <div className="oura-grafico informe-grafico" ref={ref}>
      <div className="row between small">
        <strong>{titulo}</strong>
        <span className="muted">{sinDatos ? 'sin tomas' : `${puntos.length} ${puntos.length === 1 ? 'toma' : 'tomas'}`} · referencia {rango[0]}–{rango[1]} {unidad}</span>
      </div>
      <svg className="oura-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo} por días`}>
        <rect x={L} y={Y(rango[1])} width={W - L - R} height={Y(rango[0]) - Y(rango[1])} fill="var(--resalte)" />
        {/* Rango de referencia siempre; los extremos del eje, solo si no se montan encima. */}
        {[rango[0], rango[1], ...[lo, hi].filter((v) => Math.abs(Y(v) - Y(rango[0])) > 10 && Math.abs(Y(v) - Y(rango[1])) > 10)].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth=".8" />
            <text x={L - 4} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{v}</text>
          </g>
        ))}
        {ds.map((d, i) => (i % cada === 0 ? (
          <g key={d}>
            <line x1={L + slot * i} x2={L + slot * i} y1={T} y2={H - B} stroke="var(--line)" strokeWidth=".5" />
            <text x={L + slot * i + slot / 2} y={H - 5} textAnchor="middle" fontSize="9" fill="var(--muted)">{SEMANA[(new Date(d + 'T12:00:00').getDay() + 6) % 7]} {ddmm(d)}</text>
          </g>
        ) : null))}
        {puntos.map((p, k) => {
          const x = X(p)
          if (p.marca) return <text key={k} x={x} y={H - B - 3} textAnchor="middle" fontSize="11" fill="var(--red)">▼</text>
          if (p.y2 != null) return (
            <g key={k}>
              <line x1={x} x2={x} y1={Y(p.y)} y2={Y(p.y2)} stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
              <circle cx={x} cy={Y(p.y)} r="2.4" fill="var(--red)" /><circle cx={x} cy={Y(p.y2)} r="2.4" fill="var(--red)" />
            </g>
          )
          return <circle key={k} cx={x} cy={Y(p.y)} r="3" fill={p.hueco ? 'var(--card)' : 'var(--red)'} stroke="var(--red)" strokeWidth="1.4" />
        })}
      </svg>
      {nota && <div className="muted small" style={{ marginBottom: '.35rem' }}>{nota}</div>}
    </div>
  )
}

export function InformeConstantes() {
  const hoy = todayStr()
  const [desde, setDesde] = useState(weekStart(hoy))
  const hasta = addDays(desde, 6)
  const [conOura, setConOura] = useState(true)
  const [filas, setFilas] = useState<{ sint: { day: string; value: SintDia }[]; oura: { day: string; value: OuraDia }[] } | null>(null)

  useEffect(() => {
    let alive = true
    setFilas(null)
    Promise.all([
      listDaily<SintDia>('sintomas', desde, hasta).catch(() => []),
      listDaily<OuraDia>('oura', desde, hasta).catch(() => []),
    ]).then(([sint, oura]) => alive && setFilas({ sint, oura }))
    return () => { alive = false }
  }, [desde, hasta])

  const ds = useMemo(() => dias(desde, hasta), [desde, hasta])
  const tomas: Toma[] = useMemo(() => {
    if (!filas) return []
    const mias = filas.sint.flatMap((r) => (r.value.constantes ?? []).map((m) => ({ ...m, day: r.day, hora: m.hora ?? '', origen: 'mia' as const })))
    const completadas = new Set(mias.filter((m) => m.de_oura).map((m) => m.day + m.hora))
    const anillo = conOura
      ? filas.oura.flatMap((r) => (r.value.fc_altas ?? [])
        .filter((a) => !completadas.has(r.day + a.hora))
        .map((a) => ({ day: r.day, hora: a.hora, fc: a.fc, min: a.min, contexto: a.contexto, origen: 'oura' as const })))
      : []
    return [...mias, ...anillo].sort((a, b) => (a.day + a.hora).localeCompare(b.day + b.hora))
  }, [filas, conOura])

  const fc = tomas.filter((t) => t.fc != null).map((t) => ({ day: t.day, hora: t.hora, y: t.fc!, hueco: t.origen === 'oura' }))
  const ta = [
    ...tomas.filter((t) => t.pas != null && t.pad != null).map((t) => ({ day: t.day, hora: t.hora, y: t.pas!, y2: t.pad! })),
    ...tomas.filter((t) => t.ta_no_capta).map((t) => ({ day: t.day, hora: t.hora, y: 0, marca: true })),
  ]
  const glu = tomas.filter((t) => t.glucosa != null).map((t) => ({ day: t.day, hora: t.hora, y: t.glucosa! }))
  const sat = tomas.filter((t) => t.spo2 != null).map((t) => ({ day: t.day, hora: t.hora, y: t.spo2! }))
  const noMedible = (t: Toma, c: 'fc' | 'ta' | 'glucosa' | 'spo2') => (t.no_medible ?? []).includes(c)
  const celda = (t: Toma, c: 'fc' | 'ta' | 'glucosa' | 'spo2') => {
    if (c === 'fc' && t.fc != null) return String(t.fc)
    if (c === 'ta' && (t.pas != null || t.pad != null)) return `${t.pas ?? '—'}/${t.pad ?? '—'}`
    if (c === 'ta' && t.ta_no_capta) return 'No la capta (muy baja)'
    if (c === 'glucosa' && t.glucosa != null) return String(t.glucosa)
    if (c === 'spo2' && t.spo2 != null) return String(t.spo2)
    // En las tomas del anillo, lo que no es el pulso no se pudo medir en ese momento.
    if (t.origen === 'oura') return 'No se puede medir'
    return noMedible(t, c) ? 'No se puede medir' : ''
  }

  return (
    <section className="card informe-constantes oura">
      <h2 style={{ marginTop: 0 }} className="no-print">Constantes por días</h2>
      <div className="solo-print"><h1>Registro de constantes</h1></div>
      <div className="row between no-print" style={{ margin: '.2rem 0 .5rem' }}>
        <button type="button" className="btn sm ghost" aria-label="Semana anterior" onClick={() => setDesde(addDays(desde, -7))}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <strong>{desde === weekStart(hoy) ? 'Esta semana' : 'Semana'}</strong>
          <div className="muted small">del {fmtDate(desde)} al {fmtDate(hasta)}</div>
        </div>
        <button type="button" className="btn sm ghost" aria-label="Semana siguiente" disabled={addDays(desde, 7) > hoy} onClick={() => setDesde(addDays(desde, 7))}>›</button>
      </div>
      <p className="small solo-print">Semana del <b>{fmtDate(desde)}</b> al <b>{fmtDate(hasta)}</b></p>
      <p className="small" style={{ marginTop: 0 }}>{tomas.length} {tomas.length === 1 ? 'toma' : 'tomas'} en la semana</p>

      <div className="no-print">
        <label className="row small" style={{ gap: '.4rem', margin: '.2rem 0 .5rem' }}>
          <input type="checkbox" checked={conOura} onChange={(e) => setConOura(e.target.checked)} /> Incluir el pulso de 100 lpm o más del anillo Oura
        </label>
        <button type="button" className="btn sm secondary" onClick={() => window.print()}>Imprimir / PDF</button>
      </div>

      {!filas ? <p className="muted">Cargando…</p> : (
        <>
          <PuntosPorDia titulo="Frecuencia cardíaca" unidad="lpm" ds={ds} puntos={fc} rango={[50, 100]}
            nota={conOura ? '● medida por mí · ○ anillo Oura (pulso máximo del rato con 100 lpm o más)' : undefined} />
          <PuntosPorDia titulo="Tensión arterial" unidad="mmHg" ds={ds} puntos={ta} rango={[60, 140]}
            nota="Cada línea va de la tensión baja (diastólica) a la alta (sistólica). ▼ el tensiómetro no la capta porque está muy baja. Referencia: alta 90–139, baja 60 o más." />
          <PuntosPorDia titulo="Glucosa" unidad="mg/dl" ds={ds} puntos={glu} rango={[70, 140]} />
          <PuntosPorDia titulo="Saturación de oxígeno" unidad="%" ds={ds} puntos={sat} rango={[95, 100]} />

          <h3>Tomas</h3>
          {tomas.length === 0 ? <p className="muted small">No hay tomas en estas fechas.</p> : (
            <div className="informe-tabla">
              <table className="table">
                <thead>
                  <tr><th>Fecha</th><th>Hora</th><th>FC (lpm)</th><th>TA (mmHg)</th><th>Glucosa (mg/dl)</th><th>SatO₂ (%)</th><th>Situación</th></tr>
                </thead>
                <tbody>
                  {tomas.map((t, k) => (
                    <tr key={k} className={t.origen === 'oura' ? 'fila-oura' : ''}>
                      <td>{ddmm(t.day)}</td>
                      <td>{t.hora || '—'}</td>
                      <td>{celda(t, 'fc')}</td>
                      <td>{celda(t, 'ta')}</td>
                      <td>{celda(t, 'glucosa')}</td>
                      <td>{celda(t, 'spo2')}</td>
                      <td>{t.origen === 'oura'
                        ? ['Anillo Oura', `máx. durante ${t.min} min`, t.contexto && CONTEXTO_FC[t.contexto]].filter(Boolean).join(' · ')
                        : [etiqueta(TIPOS_MEDIDA, t.tipo), etiqueta(POSICIONES, t.posicion).toLowerCase(), etiqueta(HIDRATACIONES, t.hidratacion).toLowerCase()].filter(Boolean).join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small">Rangos de referencia generales del adulto; no son un diagnóstico. Las tomas «Anillo Oura» son el pulso de 100 lpm o más que midió el anillo; la tensión, la glucosa y la saturación no se pudieron medir en ese momento.</p>
        </>
      )}
    </section>
  )
}
