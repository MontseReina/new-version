import { todayStr, nowHM } from '../../lib/dates'
import type { ReactNode } from 'react'
import { HIDRATACIONES, POSICIONES, TIPOS_MEDIDA, avisosMedida, type CampoMedida, type Medida, type SintDia } from './logica'

const num = (v: string) => (v === '' ? null : Number(v))

/** Constantes del día: cada «Registrar» abre una toma nueva con la hora de ahora (en el registro de hoy). */
export function Constantes({ d, set, date }: { d: SintDia; set: (patch: SintDia) => void; date: string }) {
  const xs = d.constantes ?? []
  const poner = (i: number, patch: Medida) => set({ constantes: xs.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const nueva = () => set({ constantes: [...xs, date === todayStr() ? { hora: nowHM() } : {}] })
  /** Un campo con su casilla «No se puede medir»: marcada, se borra el valor y se oculta la casilla de número.
   *  La tensión tiene además «No la capta (muy baja)», que es un hallazgo y se resalta. */
  const campo = (x: Medida, i: number, c: CampoMedida, label: string, input: ReactNode) => {
    const no = (x.no_medible ?? []).includes(c)
    const noCapta = c === 'ta' && !!x.ta_no_capta
    const vacio: Medida = c === 'ta' ? { pas: null, pad: null } : { [c]: null }
    const sinEsta = (x.no_medible ?? []).filter((y) => y !== c)
    return (
      <div className="field">
        <span>{label}</span>
        {noCapta ? <div className="medida-no medida-no-capta small">No la capta: tensión muy baja</div>
          : no ? <div className="medida-no small">No se puede medir</div> : input}
        {noCapta || no
          ? <button type="button" className="linkbtn small" onClick={() => poner(i, { no_medible: sinEsta, ...(c === 'ta' ? { ta_no_capta: null } : {}) })}>Anotar valor</button>
          : <div className="medida-botones">
              {c === 'ta' && <button type="button" className="linkbtn small" onClick={() => poner(i, { ...vacio, no_medible: sinEsta, ta_no_capta: true })}>No la capta (muy baja)</button>}
              <button type="button" className="linkbtn small" onClick={() => poner(i, { ...vacio, no_medible: [...sinEsta, c], ...(c === 'ta' ? { ta_no_capta: null } : {}) })}>No se puede medir</button>
            </div>}
      </div>
    )
  }
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
            <div className="chips" style={{ marginTop: '.45rem' }} role="group" aria-label="Tipo de medición">
              {TIPOS_MEDIDA.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.tipo === k ? 'on' : '')} aria-pressed={x.tipo === k} onClick={() => poner(i, { tipo: x.tipo === k ? null : k })}>{l}</button>)}
            </div>
            <div className="medida-campos">
              {campo(x, i, 'fc', 'Frecuencia cardíaca (lpm)', <input type="number" inputMode="numeric" min={20} max={250} value={x.fc ?? ''} onChange={(e) => poner(i, { fc: num(e.target.value) })} />)}
              {campo(x, i, 'ta', 'Tensión arterial (mmHg)', (
                <div className="medida-ta">
                  <input type="number" inputMode="numeric" min={40} max={250} aria-label="Tensión sistólica (alta)" placeholder="Alta" value={x.pas ?? ''} onChange={(e) => poner(i, { pas: num(e.target.value) })} />
                  <span aria-hidden="true">/</span>
                  <input type="number" inputMode="numeric" min={20} max={150} aria-label="Tensión diastólica (baja)" placeholder="Baja" value={x.pad ?? ''} onChange={(e) => poner(i, { pad: num(e.target.value) })} />
                </div>
              ))}
              {campo(x, i, 'glucosa', 'Glucosa (mg/dl)', <input type="number" inputMode="numeric" min={20} max={600} value={x.glucosa ?? ''} onChange={(e) => poner(i, { glucosa: num(e.target.value) })} />)}
              {campo(x, i, 'spo2', 'Saturación de O₂ (%)', <input type="number" inputMode="numeric" min={50} max={100} value={x.spo2 ?? ''} onChange={(e) => poner(i, { spo2: num(e.target.value) })} />)}
            </div>
            <div className="medida-eje small muted">Posición</div>
            <div className="chips" role="group" aria-label="Posición al medir">
              {POSICIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.posicion === k ? 'on' : '')} aria-pressed={x.posicion === k} onClick={() => poner(i, { posicion: x.posicion === k ? null : k })}>{l}</button>)}
            </div>
            <div className="medida-eje small muted">Hidratación</div>
            <div className="chips" role="group" aria-label="Hidratación antes de medir">
              {HIDRATACIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.hidratacion === k ? 'on' : '')} aria-pressed={x.hidratacion === k} onClick={() => poner(i, { hidratacion: x.hidratacion === k ? null : k })}>{l}</button>)}
            </div>
            {x.nota && <div className="muted small" style={{ marginTop: '.4rem' }}>Nota: {x.nota}</div>}
            {avisos.length > 0 && <div className="medida-avisos">{avisos.map((a) => <span key={a} className="medida-aviso">{a}</span>)}</div>}
          </div>
        )
      })}
    </div>
  )
}
