import { useEffect, useState } from 'react'
import { nowHM, todayStr } from '../../lib/dates'
import type { RelojDia } from '../reloj/tipos'
import type { Medida, SintDia } from './logica'

const minDe = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const num = (v: string) => (v === '' ? null : Number(v))

/**
 * «Siento taquicardia ahora» (hoja FC del día, desde la 0.27.0; antes estaba en las esporádicas de Constantes).
 * Cada aviso es una toma de `constantes` con `taquicardia: true`: hora, pulso y notas. Cuando llega el pulso del reloj
 * de ese momento (±5 min), se pone solo el más alto; también se puede escribir a mano.
 */
export function Taquicardias({ d, set, date, reloj }: { d: SintDia; set: (patch: SintDia) => void; date: string; reloj: RelojDia | null }) {
  const xs = d.constantes ?? []
  const [abierta, setAbierta] = useState<number | null>(null)
  useEffect(() => {
    const puntos = reloj?.fc_puntos ?? []
    if (!puntos.length) return
    let cambia = false
    const nuevas = xs.map((x) => {
      if (!x.taquicardia || x.fc != null || !x.hora) return x
      const cerca = puntos.filter(([h]) => Math.abs(minDe(h) - minDe(x.hora!)) <= 5)
      if (!cerca.length) return x
      cambia = true
      return { ...x, fc: Math.max(...cerca.map((p) => p[2])), fc_de_reloj: true }
    })
    if (cambia) set({ constantes: nuevas })
  }, [reloj, xs, set])

  const lista = xs.map((x, i) => ({ x, i })).filter(({ x }) => x.taquicardia).sort((a, b) => (b.x.hora ?? '').localeCompare(a.x.hora ?? ''))
  const poner = (i: number, patch: Medida) => set({ constantes: xs.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const nueva = () => { setAbierta(xs.length); set({ constantes: [...xs, { hora: date === todayStr() ? nowHM() : null, taquicardia: true }] }) }

  return (
    <div className="card sint-grupo">
      <div className="row between">
        <h3 style={{ margin: 0 }}>❤️ Taquicardias que noto</h3>
        <button type="button" className="btn sm" onClick={nueva}>{date === todayStr() ? 'Siento taquicardia ahora' : '+ Anotar'}</button>
      </div>
      <p className="muted small" style={{ margin: '.2rem 0 .3rem' }}>Se guarda la hora. El pulso se pone solo cuando llega el del reloj de ese momento; también puedes escribirlo.</p>
      {!lista.length && <p className="muted small" style={{ margin: 0 }}>Ninguna anotada este día.</p>}
      {lista.map(({ x, i }) => {
        const ab = abierta === i
        return (
          <div key={i} className={'fija esporadica' + (ab ? ' abierta' : '')}>
            <button type="button" className="fija-cab" aria-expanded={ab} onClick={() => setAbierta(ab ? null : i)}>
              <span className="fija-marca" aria-hidden="true">❤️</span>
              <span className="fija-nombre">{x.hora ?? 'Sin hora'}</span>
              <span className="fija-resumen small">{x.fc != null ? <>FC <b>{x.fc}</b>{x.fc_de_reloj ? <span className="muted"> · reloj</span> : null}</> : <span className="muted">Esperando el pulso del reloj</span>}</span>
              <span className="fija-flecha" aria-hidden="true">{ab ? '▴' : '▾'}</span>
            </button>
            {ab && (
              <div className="medida medida-fija-form">
                <div className="row between">
                  <label className="row small" style={{ gap: '.4rem' }}>
                    <span className="muted">Hora</span>
                    <input type="time" aria-label="Hora de la taquicardia" style={{ width: '7.5rem' }} value={x.hora ?? ''} onChange={(e) => poner(i, { hora: e.target.value || null })} />
                  </label>
                  <button type="button" className="linkbtn" onClick={() => { setAbierta(null); set({ constantes: xs.filter((_, k) => k !== i) }) }}>Quitar</button>
                </div>
                <label className="field">
                  <span>Frecuencia cardíaca (lpm)</span>
                  <input type="number" inputMode="numeric" min={20} max={250} value={x.fc ?? ''} onChange={(e) => poner(i, { fc: num(e.target.value), fc_de_reloj: null })} />
                </label>
                <label className="medida-nota">
                  <span className="medida-eje small muted">Notas</span>
                  <textarea rows={2} placeholder="Qué estaba haciendo, postura, si había comido…" value={x.nota ?? ''} onChange={(e) => poner(i, { nota: e.target.value || null })} />
                </label>
                <button type="button" className="linkbtn small" onClick={() => setAbierta(null)}>Plegar ▴</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
