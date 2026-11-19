import { todayStr, nowHM } from '../../lib/dates'
import { useState, type ReactNode } from 'react'
import { CONTEXTO_FC, type FcAlta } from '../oura/tipos'
import { HIDRATACIONES, MIN_COMIDA, MOMENTOS, POSICIONES, TIPOS_MEDIDA, alternarTipo, avisosMedida, etiquetaMinComida, medidaConDatos, tiposDe, tiposDeMomento, type CampoMedida, type Medida, type Momento, type SintDia } from './logica'

const num = (v: string) => (v === '' ? null : Number(v))

/**
 * Constantes del día. Arriba, las ocho mediciones fijas (al levantarme, poslevantarme… antes de irme a la cama), plegadas:
 * al abrir una se rellena igual que cualquier toma y la toma se crea con la hora de ahora al anotar el primer dato.
 * Debajo, las esporádicas: cada «Registrar» abre una toma nueva con la hora de ahora (en el registro de hoy).
 * Debajo, mezclados por hora, los ratos en que el anillo Oura midió el pulso a 100 lpm o más (solo lectura;
 * «Completar» los convierte en una toma propia para añadir tensión, glucosa, saturación o posición).
 */
export function Constantes({ d, set, date, oura = [] }: { d: SintDia; set: (patch: SintDia) => void; date: string; oura?: FcAlta[] }) {
  const xs = d.constantes ?? []
  const [abierta, setAbierta] = useState<Momento | null>(null)
  const horaAhora = () => (date === todayStr() ? { hora: nowHM() } : {})
  /** i = -1: medición fija todavía sin toma; se crea al anotar el primer dato. */
  const poner = (i: number, patch: Medida, momento?: Momento) => {
    if (i < 0 && momento) return set({ constantes: [...xs, { ...horaAhora(), momento, tipos: tiposDeMomento(momento), ...patch }] })
    set({ constantes: xs.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  }
  const quitar = (i: number) => set({ constantes: xs.filter((_, k) => k !== i) })
  const nueva = () => set({ constantes: [...xs, horaAhora()] })
  // Al plegar una medición fija sin nada anotado, se borra la toma vacía.
  const plegar = (m: Momento | null) => {
    const prev = abierta && xs.findIndex((x) => x.momento === abierta)
    if (prev != null && prev >= 0 && !medidaConDatos(xs[prev])) quitar(prev)
    setAbierta(m)
  }
  /** Un campo con su casilla «No se puede medir»: marcada, se borra el valor y se oculta la casilla de número.
   *  La tensión tiene además «No la capta (muy baja)», que es un hallazgo y se resalta. */
  const campo = (x: Medida, i: number, c: CampoMedida, label: string, input: ReactNode, momento?: Momento) => {
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
          ? <button type="button" className="linkbtn small" onClick={() => poner(i, { no_medible: sinEsta, ...(c === 'ta' ? { ta_no_capta: null } : {}) }, momento)}>Anotar valor</button>
          : <div className="medida-botones">
              {c === 'ta' && <button type="button" className="linkbtn small" onClick={() => poner(i, { ...vacio, no_medible: sinEsta, ta_no_capta: true }, momento)}>No la capta (muy baja)</button>}
              <button type="button" className="linkbtn small" onClick={() => poner(i, { ...vacio, no_medible: [...sinEsta, c], ...(c === 'ta' ? { ta_no_capta: null } : {}) }, momento)}>No se puede medir</button>
            </div>}
      </div>
    )
  }
  const formulario = (x: Medida, i: number, momento?: Momento) => {
    const avisos = avisosMedida(x)
    const tipos = tiposDe(x)
    return (
      <div className={'medida' + (momento ? ' medida-fija-form' : '')} key={i}>
        <div className="row between">
          <label className="row small" style={{ gap: '.4rem' }}>
            <span className="muted">Hora</span>
            <input type="time" aria-label="Hora de la toma" style={{ width: '7.5rem' }} value={x.hora ?? ''} onChange={(e) => poner(i, { hora: e.target.value || null }, momento)} />
          </label>
          {i >= 0 && <button type="button" className="linkbtn" onClick={() => { quitar(i); if (momento) setAbierta(null) }}>{momento ? 'Borrar esta toma' : 'Quitar'}</button>}
        </div>
        {i < 0 && date === todayStr() && <div className="muted small">La hora se pone sola al anotar el primer dato.</div>}
        <div className="medida-eje small muted">Tipo de medición <span className="medida-pista">· puedes marcar más de uno</span></div>
        <div className="chips" role="group" aria-label="Tipo de medición">
          {TIPOS_MEDIDA.map(([k, l]) => <button type="button" key={k} className={'chip ' + (tipos.includes(k) ? 'on' : '')} aria-pressed={tipos.includes(k)} onClick={() => poner(i, alternarTipo(x, k), momento)}>{l}</button>)}
        </div>
        {tipos.includes('postprandial') && <>
          <div className="medida-eje small muted">Tiempo desde que terminé de comer</div>
          <div className="chips" role="group" aria-label="Tiempo desde que terminé de comer">
            {MIN_COMIDA.map((n) => <button type="button" key={n} className={'chip ' + (x.min_comida === n ? 'on' : '')} aria-pressed={x.min_comida === n} onClick={() => poner(i, { min_comida: x.min_comida === n ? null : n }, momento)}>{etiquetaMinComida(n)}</button>)}
          </div>
        </>}
        <div className="medida-campos">
          {campo(x, i, 'fc', 'Frecuencia cardíaca (lpm)', <input type="number" inputMode="numeric" min={20} max={250} value={x.fc ?? ''} onChange={(e) => poner(i, { fc: num(e.target.value) }, momento)} />, momento)}
          {campo(x, i, 'ta', 'Tensión arterial (mmHg)', (
            <div className="medida-ta">
              <input type="number" inputMode="numeric" min={40} max={250} aria-label="Tensión sistólica (alta)" placeholder="Alta" value={x.pas ?? ''} onChange={(e) => poner(i, { pas: num(e.target.value) }, momento)} />
              <span aria-hidden="true">/</span>
              <input type="number" inputMode="numeric" min={20} max={150} aria-label="Tensión diastólica (baja)" placeholder="Baja" value={x.pad ?? ''} onChange={(e) => poner(i, { pad: num(e.target.value) }, momento)} />
            </div>
          ), momento)}
          {campo(x, i, 'glucosa', 'Glucosa (mg/dl)', <input type="number" inputMode="numeric" min={20} max={600} value={x.glucosa ?? ''} onChange={(e) => poner(i, { glucosa: num(e.target.value) }, momento)} />, momento)}
          {campo(x, i, 'spo2', 'Saturación de O₂ (%)', <input type="number" inputMode="numeric" min={50} max={100} value={x.spo2 ?? ''} onChange={(e) => poner(i, { spo2: num(e.target.value) }, momento)} />, momento)}
        </div>
        <div className="medida-eje small muted">Posición</div>
        <div className="chips" role="group" aria-label="Posición al medir">
          {POSICIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.posicion === k ? 'on' : '')} aria-pressed={x.posicion === k} onClick={() => poner(i, { posicion: x.posicion === k ? null : k }, momento)}>{l}</button>)}
        </div>
        <div className="medida-eje small muted">Hidratación</div>
        <div className="chips" role="group" aria-label="Hidratación antes de medir">
          {HIDRATACIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.hidratacion === k ? 'on' : '')} aria-pressed={x.hidratacion === k} onClick={() => poner(i, { hidratacion: x.hidratacion === k ? null : k }, momento)}>{l}</button>)}
        </div>
        {x.de_oura && <div className="muted small" style={{ marginTop: '.4rem' }}>Empezó como pulso alto del anillo Oura.</div>}
        <label className="medida-nota">
          <span className="medida-eje small muted">Notas de esta toma</span>
          <textarea rows={2} placeholder="Qué estaba pasando, qué había comido y cuándo, cómo me encontraba…" value={x.nota ?? ''} onChange={(e) => poner(i, { nota: e.target.value || null }, momento)} />
        </label>
        {avisos.length > 0 && <div className="medida-avisos">{avisos.map((a) => <span key={a} className="medida-aviso">{a}</span>)}</div>}
      </div>
    )
  }
  // Ratos de Oura que no se han completado ya a mano.
  const completados = new Set(xs.filter((x) => x.de_oura && x.hora).map((x) => x.hora))
  const deOura = oura.filter((a) => !completados.has(a.hora))
  const completar = (a: FcAlta) => set({ constantes: [...xs, { hora: a.hora, fc: a.fc, de_oura: true }] })
  // Esporádicas: se enseñan de la más reciente a la más antigua; se guardan en el orden en que se anotan.
  type Fila = { hora: string; x?: Medida; i?: number; a?: FcAlta }
  const orden: Fila[] = [
    ...xs.map((x, i) => ({ hora: x.hora ?? '', x, i })).filter(({ x }) => !x.momento),
    ...deOura.map((a) => ({ hora: a.hora, a })),
  ].sort((p, q) => q.hora.localeCompare(p.hora))

  const fijas = MOMENTOS.map(([k, l]) => { const i = xs.findIndex((x) => x.momento === k); return { k, l, i, x: i >= 0 ? xs[i] : undefined } })
  const hechas = fijas.filter((f) => f.x && medidaConDatos(f.x)).length
  const esporadicas = orden.length

  return (
    <div className="card sint-grupo">
      <div className="row between">
        <h3 style={{ margin: 0 }}>🩺 Constantes</h3>
        <span className="muted small">{hechas} de {MOMENTOS.length} fijas</span>
      </div>
      <p className="muted small" style={{ margin: '.2rem 0 .3rem' }}>Frecuencia cardíaca, tensión arterial, glucosa y saturación. Toca un momento para rellenarlo.</p>
      <div className="fijas">
        {fijas.map(({ k, l, i, x }) => {
          const abiertaEsta = abierta === k
          const con = !!x && medidaConDatos(x)
          const av = x ? avisosMedida(x) : []
          const resumen = x && con ? [
            x.fc != null && `FC ${x.fc}`,
            x.pas != null || x.pad != null ? `TA ${x.pas ?? '—'}/${x.pad ?? '—'}` : x.ta_no_capta && 'TA no la capta',
            x.glucosa != null && `Glu ${x.glucosa}`,
            x.spo2 != null && `Sat ${x.spo2} %`,
          ].filter(Boolean).join(' · ') : ''
          return (
            <div key={k} className={'fija' + (con ? ' hecha' : '') + (abiertaEsta ? ' abierta' : '')}>
              <button type="button" className="fija-cab" aria-expanded={abiertaEsta} onClick={() => plegar(abiertaEsta ? null : k)}>
                <span className="fija-marca" aria-hidden="true">{con ? '✓' : ''}</span>
                <span className="fija-nombre">{l}</span>
                <span className="fija-resumen small">
                  {con ? <>{x!.hora && <b>{x!.hora}</b>} {resumen || 'Anotada'}</> : <span className="muted">Sin registrar</span>}
                  {av.length > 0 && <span className="fija-aviso" title={av.join(' · ')}> ⚠</span>}
                </span>
                <span className="fija-flecha" aria-hidden="true">{abiertaEsta ? '▴' : '▾'}</span>
              </button>
              {abiertaEsta && formulario(x ?? { momento: k, tipos: tiposDeMomento(k) }, i, k)}
            </div>
          )
        })}
      </div>

      <div className="row between" style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: 0 }}>Esporádicas</h4>
        <button type="button" className="btn sm" onClick={nueva}>+ Registrar</button>
      </div>
      {esporadicas === 0 && <p className="muted small" style={{ marginBottom: 0 }}>Para tomas fuera de las fijas: durante un episodio, después de un esfuerzo… Cada una lleva su hora.</p>}
      {orden.map(({ x, i, a }) => {
        if (a) {
          const avisosA = avisosMedida({ fc: a.fc })
          return (
            <div className="medida medida-oura" key={'oura-' + a.hora}>
              <div className="row between">
                <span className="small"><span className="muted">Hora</span> <b>{a.hora}</b></span>
                <span className="tag">Oura · automático</span>
              </div>
              <div className="medida-oura-fc">Frecuencia cardíaca <b>{a.fc} lpm</b> <span className="muted small">máximo durante {a.min} min{a.contexto ? ` · ${CONTEXTO_FC[a.contexto]}` : ''}</span></div>
              <div className="small muted">Tensión arterial, glucosa y saturación: no se puede medir.</div>
              {avisosA.length > 0 && <div className="medida-avisos">{avisosA.map((t) => <span key={t} className="medida-aviso">{t}</span>)}</div>}
              <button type="button" className="linkbtn small" onClick={() => completar(a)}>Completar con mis constantes</button>
            </div>
          )
        }
        if (!x || i == null) return null
        return formulario(x, i)
      })}
    </div>
  )
}
