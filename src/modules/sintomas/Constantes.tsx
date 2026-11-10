import { todayStr, nowHM } from '../../lib/dates'
import { POSICIONES, avisosMedida, type Medida, type SintDia } from './logica'

const num = (v: string) => (v === '' ? null : Number(v))

/** Constantes del día: cada «Registrar» abre una toma nueva con la hora de ahora (en el registro de hoy). */
export function Constantes({ d, set, date }: { d: SintDia; set: (patch: SintDia) => void; date: string }) {
  const xs = d.constantes ?? []
  const poner = (i: number, patch: Medida) => set({ constantes: xs.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const nueva = () => set({ constantes: [...xs, date === todayStr() ? { hora: nowHM() } : {}] })
  // Se enseñan de la más reciente a la más antigua; se guardan en el orden en que se anotan.
  const orden = xs.map((x, i) => [x, i] as const).sort(([a], [b]) => (b.hora ?? '').localeCompare(a.hora ?? ''))

  return (
    <div className="card sint-grupo">
      <div className="row between">
        <h3 style={{ margin: 0 }}>🩺 Constantes</h3>
        <button type="button" className="btn sm" onClick={nueva}>+ Registrar</button>
      </div>
      {xs.length === 0 && <p className="muted small" style={{ marginBottom: 0 }}>Frecuencia cardíaca, tensión arterial, glucosa y saturación. Cada registro lleva su hora.</p>}
      {orden.map(([x, i]) => {
        const avisos = avisosMedida(x)
        return (
          <div className="medida" key={i}>
            <div className="row between">
              <label className="row small" style={{ gap: '.4rem' }}>
                <span className="muted">Hora</span>
                <input type="time" aria-label="Hora de la toma" style={{ width: '7.5rem' }} value={x.hora ?? ''} onChange={(e) => poner(i, { hora: e.target.value || null })} />
              </label>
              <button type="button" className="linkbtn" onClick={() => set({ constantes: xs.filter((_, k) => k !== i) })}>Quitar</button>
            </div>
            <div className="medida-campos">
              <label className="field"><span>Frecuencia cardíaca (lpm)</span><input type="number" inputMode="numeric" min={20} max={250} value={x.fc ?? ''} onChange={(e) => poner(i, { fc: num(e.target.value) })} /></label>
              <div className="field">
                <span>Tensión arterial (mmHg)</span>
                <div className="medida-ta">
                  <input type="number" inputMode="numeric" min={40} max={250} aria-label="Tensión sistólica (alta)" placeholder="Alta" value={x.pas ?? ''} onChange={(e) => poner(i, { pas: num(e.target.value) })} />
                  <span aria-hidden="true">/</span>
                  <input type="number" inputMode="numeric" min={20} max={150} aria-label="Tensión diastólica (baja)" placeholder="Baja" value={x.pad ?? ''} onChange={(e) => poner(i, { pad: num(e.target.value) })} />
                </div>
              </div>
              <label className="field"><span>Glucosa (mg/dl)</span><input type="number" inputMode="numeric" min={20} max={600} value={x.glucosa ?? ''} onChange={(e) => poner(i, { glucosa: num(e.target.value) })} /></label>
              <label className="field"><span>Saturación de O₂ (%)</span><input type="number" inputMode="numeric" min={50} max={100} value={x.spo2 ?? ''} onChange={(e) => poner(i, { spo2: num(e.target.value) })} /></label>
            </div>
            <div className="chips" style={{ marginTop: '.5rem' }} role="group" aria-label="Posición al medir">
              {POSICIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.posicion === k ? 'on' : '')} aria-pressed={x.posicion === k} onClick={() => poner(i, { posicion: x.posicion === k ? null : k })}>{l}</button>)}
            </div>
            <input type="text" aria-label="Nota de la toma" placeholder="Nota (p. ej. en reposo, tras comer, durante el episodio)" style={{ width: '100%', marginTop: '.45rem' }} value={x.nota ?? ''} onChange={(e) => poner(i, { nota: e.target.value || null })} />
            {avisos.length > 0 && <div className="medida-avisos">{avisos.map((a) => <span key={a} className="medida-aviso">{a}</span>)}</div>}
          </div>
        )
      })}
    </div>
  )
}
