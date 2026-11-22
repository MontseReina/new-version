import { todayStr, nowHM } from '../../lib/dates'
import { useState, type ReactNode } from 'react'
import type { FcAlta } from '../oura/tipos'
import type { RelojDia, TaReloj } from '../reloj/tipos'
import { TestDePie, ahoraHMS, programarPitidos } from './TestDePie'
import { HIDRATACIONES, MIN_COMIDA, MOMENTOS, MOMENTOS_DIA, POSICIONES, SINTOMAS_TEST, TIPOS_MEDIDA, alternarTipo, avisosMedida, etiquetaMinComida, medidaConDatos, tiposDe, porDefectoMomento, subtomasDe, type CampoMedida, type Medida, type Momento, type SintDia } from './logica'

const num = (v: string) => (v === '' ? null : Number(v))

/**
 * Constantes del día. Arriba, las ocho mediciones fijas (al levantarme, poslevantarme… antes de irme a la cama), plegadas:
 * al abrir una se rellena igual que cualquier toma («Poslevantarme» lleva el test de pie, con tomas a los 5 y 10 minutos; su reloj empieza al anotar «Al levantarme») y la toma se crea con la hora de ahora al anotar el primer dato.
 * Debajo, las esporádicas: cada «Registrar» abre una toma nueva con la hora de ahora (en el registro de hoy).
 * Las tensiones que llegaron del reloj: con un toque se guardan en la medición fija que corresponda o en cualquier otro momento
 * del día (si ese momento ya tiene toma, queda como esporádica de ese momento), con el pulso del reloj si lo había.
 * Desde la 0.27.0 los ratos de pulso alto (reloj y Oura) y «Siento taquicardia ahora» van en la hoja FC del día, no aquí.
 */
export function Constantes({ d, set, date, relojDia = null, momentos, esporadicas: conEsporadicas = true, titulo = '🩺 Constantes', intro }: {
  d: SintDia; set: (patch: SintDia) => void; date: string; /** Ya no se usa aquí (ratos de Oura en FC del día). */ oura?: FcAlta[]; relojDia?: RelojDia | null
  /** Mediciones fijas que se enseñan aquí (por defecto, todas). Con «Al levantarme» va también el arranque del test de pie. */
  momentos?: Momento[]
  /** ¿Se enseñan las esporádicas? */
  esporadicas?: boolean
  titulo?: string
  intro?: string
}) {
  const xs = d.constantes ?? []
  const MOMS = momentos ? MOMENTOS.filter(([k]) => momentos.includes(k)) : MOMENTOS
  const conTest = MOMS.some(([k]) => k === 'levantarme' || k === 'poslevantarme')
  const tp = d.test_pie ?? {}
  const reloj = relojDia?.ta ?? []
  const [abierta, setAbierta] = useState<Momento | null>(null)
  const [otraDe, setOtraDe] = useState<string | null>(null)
  /** Esporádica desplegada (índice en `constantes`); las demás salen plegadas en una línea. */
  const [espAbierta, setEspAbierta] = useState<number | null>(null)
  const horaAhora = () => (date === todayStr() ? { hora: nowHM() } : {})
  /** i = -1: medición fija todavía sin toma; se crea al anotar el primer dato. */
  const poner = (i: number, patch: Medida, base?: Medida) => {
    if (i < 0 && base) {
      const nueva = { ...horaAhora(), ...base, ...patch }
      // Al anotar la toma de «Al levantarme» (hoy) empieza solo el reloj del test de pie.
      if (base.momento === 'levantarme' && date === todayStr()) {
        programarPitidos()
        return set({ constantes: [...xs, nueva], test_pie: { ...tp, inicio: ahoraHMS(), sentada: null } })
      }
      return set({ constantes: [...xs, nueva] })
    }
    set({ constantes: xs.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  }
  const quitar = (i: number) => set({ constantes: xs.filter((_, k) => k !== i) })
  const nueva = () => { setEspAbierta(xs.length); set({ constantes: [...xs, horaAhora()] }) }
  // Al plegar una medición fija, se borran sus tomas sin nada anotado.
  const plegar = (m: Momento | null) => {
    const vacias = xs.filter((x) => abierta && x.momento === abierta && !medidaConDatos(x))
    if (vacias.length) set({ constantes: xs.filter((x) => !vacias.includes(x)) })
    setAbierta(m)
  }
  const indiceDe = (k: Momento, sub: number | null) => xs.findIndex((x) => x.momento === k && (x.min_de_pie ?? null) === sub)
  /** Un campo con su casilla «No se puede medir»: marcada, se borra el valor y se oculta la casilla de número.
   *  La tensión tiene además «No la capta (muy baja)», que es un hallazgo y se resalta. */
  const campo = (x: Medida, i: number, c: CampoMedida, label: string, input: ReactNode, base?: Medida) => {
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
          ? <button type="button" className="linkbtn small" onClick={() => poner(i, { no_medible: sinEsta, ...(c === 'ta' ? { ta_no_capta: null } : {}) }, base)}>Anotar valor</button>
          : <div className="medida-botones">
              {c === 'ta' && <button type="button" className="linkbtn small" onClick={() => poner(i, { ...vacio, no_medible: sinEsta, ta_no_capta: true }, base)}>No la capta (muy baja)</button>}
              <button type="button" className="linkbtn small" onClick={() => poner(i, { ...vacio, no_medible: [...sinEsta, c], ...(c === 'ta' ? { ta_no_capta: null } : {}) }, base)}>No se puede medir</button>
            </div>}
      </div>
    )
  }
  const formulario = (x: Medida, i: number, base?: Medida, titulo?: string) => {
    const avisos = avisosMedida(x)
    const tipos = tiposDe(x)
    return (
      <div className={'medida' + (base ? ' medida-fija-form' : '')} key={i < 0 ? 'nueva-' + (titulo ?? '') : i}>
        {titulo && <div className="medida-sub">{titulo}</div>}
        <div className="row between">
          <label className="row small" style={{ gap: '.4rem' }}>
            <span className="muted">Hora</span>
            <input type="time" aria-label="Hora de la toma" style={{ width: '7.5rem' }} value={x.hora ?? ''} onChange={(e) => poner(i, { hora: e.target.value || null }, base)} />
          </label>
          {i >= 0 && <button type="button" className="linkbtn" onClick={() => quitar(i)}>{base ? 'Borrar esta toma' : 'Quitar'}</button>}
        </div>
        {i < 0 && date === todayStr() && <div className="muted small">La hora se pone sola al anotar el primer dato.</div>}
        <div className="medida-eje small muted">Tipo de medición <span className="medida-pista">· puedes marcar más de uno</span></div>
        <div className="chips" role="group" aria-label="Tipo de medición">
          {TIPOS_MEDIDA.map(([k, l]) => <button type="button" key={k} className={'chip ' + (tipos.includes(k) ? 'on' : '')} aria-pressed={tipos.includes(k)} onClick={() => poner(i, alternarTipo(x, k), base)}>{l}</button>)}
        </div>
        {tipos.includes('postprandial') && <>
          <div className="medida-eje small muted">Tiempo desde que terminé de comer</div>
          <div className="chips" role="group" aria-label="Tiempo desde que terminé de comer">
            {MIN_COMIDA.map((n) => <button type="button" key={n} className={'chip ' + (x.min_comida === n ? 'on' : '')} aria-pressed={x.min_comida === n} onClick={() => poner(i, { min_comida: x.min_comida === n ? null : n }, base)}>{etiquetaMinComida(n)}</button>)}
          </div>
        </>}
        <div className="medida-campos">
          {campo(x, i, 'fc', 'Frecuencia cardíaca (lpm)', <input type="number" inputMode="numeric" min={20} max={250} value={x.fc ?? ''} onChange={(e) => poner(i, { fc: num(e.target.value) }, base)} />, base)}
          {campo(x, i, 'ta', 'Tensión arterial (mmHg)', (
            <div className="medida-ta">
              <input type="number" inputMode="numeric" min={40} max={250} aria-label="Tensión sistólica (alta)" placeholder="Alta" value={x.pas ?? ''} onChange={(e) => poner(i, { pas: num(e.target.value) }, base)} />
              <span aria-hidden="true">/</span>
              <input type="number" inputMode="numeric" min={20} max={150} aria-label="Tensión diastólica (baja)" placeholder="Baja" value={x.pad ?? ''} onChange={(e) => poner(i, { pad: num(e.target.value) }, base)} />
            </div>
          ), base)}
          {campo(x, i, 'glucosa', 'Glucosa (mg/dl)', <input type="number" inputMode="numeric" min={20} max={600} value={x.glucosa ?? ''} onChange={(e) => poner(i, { glucosa: num(e.target.value) }, base)} />, base)}
          {campo(x, i, 'spo2', 'Saturación de O₂ (%)', <input type="number" inputMode="numeric" min={50} max={100} value={x.spo2 ?? ''} onChange={(e) => poner(i, { spo2: num(e.target.value) }, base)} />, base)}
        </div>
        <div className="medida-eje small muted">Posición</div>
        <div className="chips" role="group" aria-label="Posición al medir">
          {POSICIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.posicion === k ? 'on' : '')} aria-pressed={x.posicion === k} onClick={() => poner(i, { posicion: x.posicion === k ? null : k }, base)}>{l}</button>)}
        </div>
        {(x.momento === 'levantarme' || x.momento === 'poslevantarme') && <>
          <div className="medida-eje small muted">¿Qué notas ahora?</div>
          <div className="chips" role="group" aria-label="Qué notas al medir">
            {SINTOMAS_TEST.map((n) => {
              const on = (x.sintomas ?? []).includes(n)
              const nuevos = on ? (x.sintomas ?? []).filter((y) => y !== n) : n === 'Nada' ? ['Nada'] : [...(x.sintomas ?? []).filter((y) => y !== 'Nada'), n]
              return <button type="button" key={n} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => poner(i, { sintomas: nuevos.length ? nuevos : null }, base)}>{n}</button>
            })}
          </div>
        </>}
        {!base && !x.momento && <>
          <div className="medida-eje small muted">Momento del día</div>
          <div className="chips" role="group" aria-label="Momento del día de esta toma">
            {MOMENTOS.filter(([k]) => MOMENTOS_DIA.includes(k)).map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.cuando === k ? 'on' : '')} aria-pressed={x.cuando === k} onClick={() => poner(i, { cuando: x.cuando === k ? null : k })}>{l}</button>)}
          </div>
        </>}
        <div className="medida-eje small muted">Hidratación</div>
        <div className="chips" role="group" aria-label="Hidratación antes de medir">
          {HIDRATACIONES.map(([k, l]) => <button type="button" key={k} className={'chip ' + (x.hidratacion === k ? 'on' : '')} aria-pressed={x.hidratacion === k} onClick={() => poner(i, { hidratacion: x.hidratacion === k ? null : k }, base)}>{l}</button>)}
        </div>
        {x.taquicardia && <div className="small" style={{ marginTop: '.4rem' }}>❤️ <b>Sentí taquicardia</b>{x.fc_de_reloj ? <span className="muted"> · pulso puesto por el reloj</span> : x.fc == null ? <span className="muted"> · el pulso del reloj se pondrá solo cuando llegue</span> : null}</div>}
        {x.de_reloj && <div className="muted small" style={{ marginTop: '.4rem' }}>{x.pas != null ? 'Tensión' : 'Pulso'} del reloj de las {x.de_reloj}.</div>}
        {x.de_oura && <div className="muted small" style={{ marginTop: '.4rem' }}>Empezó como pulso alto del anillo Oura.</div>}
        <label className="medida-nota">
          <span className="medida-eje small muted">Notas de esta toma</span>
          <textarea rows={2} placeholder="Qué estaba pasando, qué había comido y cuándo, cómo me encontraba…" value={x.nota ?? ''} onChange={(e) => poner(i, { nota: e.target.value || null }, base)} />
        </label>
        {avisos.length > 0 && <div className="medida-avisos">{avisos.map((a) => <span key={a} className="medida-aviso">{a}</span>)}</div>}
      </div>
    )
  }
  // Tensiones del reloj que aún no están en ninguna toma (ni guardadas desde aquí ni tecleadas a mano a la misma hora con la misma cifra).
  const minDe = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
  const yaEsta = (t: TaReloj) => xs.some((x) => x.de_reloj === t.hora || (x.hora && x.pas === t.pas && x.pad === t.pad && Math.abs(minDe(x.hora) - minDe(t.hora)) <= 5))
  // En la hoja del día (sin el test), las tensiones del rato del test de pie se quedan en la hoja POTS.
  const iniTest = tp.inicio ? minDe(tp.inicio) : null
  const delTest = (t: TaReloj) => iniTest != null && minDe(t.hora) >= iniTest - 20 && minDe(t.hora) <= iniTest + 15
  const deReloj = reloj.filter((t) => !yaEsta(t) && (conTest || !delTest(t)))
  /** Guarda la tensión del reloj en una medición fija (k, sub) o, sin k, como esporádica. Si la fija ya tenía toma, se completa. */
  const asignarReloj = (t: TaReloj, k: Momento | null, sub: number | null) => {
    const datos: Medida = { pas: t.pas, pad: t.pad, de_reloj: t.hora, ...(t.fc != null ? { fc: t.fc } : {}) }
    // Como esporádica: se guarda y se despliega para añadir qué pasó (tipo, posición, notas…).
    if (!k) { setEspAbierta(xs.length); return set({ constantes: [...xs, { hora: t.hora, ...datos }] }) }
    const i = indiceDe(k, sub)
    // Momento que ya tiene tensión: esporádica de ese momento (no pisa la toma que ya está).
    if (i >= 0 && (xs[i].pas != null || xs[i].pad != null || xs[i].ta_no_capta)) {
      setEspAbierta(xs.length)
      return set({ constantes: [...xs, { hora: t.hora, ...datos, cuando: k, tipos: porDefectoMomento(k, null).tipos }] })
    }
    if (i >= 0) return set({ constantes: xs.map((x, n) => (n === i ? { ...x, ...datos, fc: x.fc ?? datos.fc ?? null, hora: x.hora ?? t.hora } : x)) })
    set({ constantes: [...xs, { ...porDefectoMomento(k, sub), hora: t.hora, ...datos }] })
  }
  // Momentos que se ofrecen para una tensión del reloj: todos los de la hoja. Los que ya tienen tensión la guardan como esporádica.
  const destinos = MOMS.flatMap(([k, l]) => subtomasDe(k).map((sub) => {
    const i = indiceDe(k, sub)
    const x = i >= 0 ? xs[i] : undefined
    return { k, sub, l: sub ? `${l} ${sub}′` : l, libre: !x || (x.pas == null && x.pad == null && !x.ta_no_capta) }
  }))
  // En el test, cada minuto es una toma: solo los huecos libres. En el día, cualquier momento.
  const opciones = conTest ? destinos.filter((h) => h.libre) : destinos
  const huecos = destinos.filter((h) => h.libre)
  // Momento que se sugiere para cada tensión del reloj, por la hora y en orden: la primera de la mañana va a «Al levantarme»,
  // las siguientes a «Poslevantarme» 5′ y 10′; después, por franjas. Es solo una sugerencia: se puede elegir otro.
  // Antes de las 5:00 (madrugada) no se sugiere ninguna fija: se ofrece como esporádica.
  const FRANJAS: [number, Momento[]][] = [[5 * 60, []], [10 * 60, ['levantarme', 'poslevantarme', 'antes_desayunar', 'despues_desayunar']], [12 * 60 + 30, ['despues_desayunar', 'media_manana']], [14 * 60 + 30, ['antes_comer']], [16 * 60 + 30, ['despues_comer']], [20 * 60, ['media_tarde']], [21 * 60, ['antes_cenar']], [22 * 60 + 30, ['despues_cenar']], [24 * 60, ['antes_cama']]]
  const sugerida = new Map<string, (typeof huecos)[number]>()
  {
    const libres = [...huecos]
    // Hora de «Al levantarme» (la ya guardada o la sugerida) para elegir «Poslevantarme» 5′ o 10′ según los minutos pasados.
    const lev = xs.find((x) => x.momento === 'levantarme' && x.hora)?.hora
    let tLev: number | null = lev ? minDe(lev) : null
    for (const t of [...deReloj].sort((p, q) => p.hora.localeCompare(q.hora))) {
      const tm = minDe(t.hora)
      const franja = FRANJAS.find(([fin]) => tm < fin)?.[1] ?? []
      let n = libres.findIndex((h) => franja.includes(h.k))
      if (n >= 0 && libres[n].k === 'poslevantarme' && tLev != null && tm - tLev >= 8) {
        const diez = libres.findIndex((h) => h.k === 'poslevantarme' && h.sub === 10)
        if (diez >= 0) n = diez
      }
      if (n >= 0) {
        if (libres[n].k === 'levantarme') tLev = tm
        sugerida.set(t.hora, libres[n]); libres.splice(n, 1)
      }
    }
  }
  // Sin esporádicas (hoja POTS), solo las tensiones del reloj que encajan en una de sus fijas.
  const deRelojVer = conEsporadicas ? deReloj : deReloj.filter((t) => sugerida.has(t.hora))
  // Esporádicas: se enseñan de la más reciente a la más antigua; se guardan en el orden en que se anotan.
  // Las de «Siento taquicardia» van en la hoja FC del día.
  type Fila = { hora: string; x: Medida; i: number }
  const orden: Fila[] = xs.map((x, i) => ({ hora: x.hora ?? '', x, i })).filter(({ x }) => !x.momento && !x.taquicardia)
    .sort((p, q) => q.hora.localeCompare(p.hora))

  const tarjetaReloj = (t: TaReloj) => {
    const avisosT = avisosMedida({ pas: t.pas, pad: t.pad, fc: t.fc })
    const sug = sugerida.get(t.hora)
    const otra = otraDe === t.hora
    return (
      <div className="medida medida-oura medida-reloj" key={'reloj-' + t.hora}>
        <div className="row between">
          <span className="small"><span className="muted">Hora</span> <b>{t.hora}</b></span>
          <span className="tag">Reloj · automático</span>
        </div>
        <div className="medida-oura-fc">Tensión arterial <b>{t.pas}/{t.pad} mmHg</b>{t.fc != null && <> · pulso <b>{t.fc} lpm</b></>}</div>
        {avisosT.length > 0 && <div className="medida-avisos">{avisosT.map((v) => <span key={v} className="medida-aviso">{v}</span>)}</div>}
        <div className="row" style={{ gap: '.5rem', flexWrap: 'wrap', marginTop: '.3rem' }}>
          {sug && <button type="button" className="btn sm" onClick={() => asignarReloj(t, sug.k, sug.sub)}>Guardar en «{sug.l}»</button>}
          <button type="button" className={'btn sm' + (sug ? ' secondary' : '')} onClick={() => asignarReloj(t, null, null)}>Guardar como esporádica</button>
          <button type="button" className="linkbtn small" aria-expanded={otra} onClick={() => setOtraDe(otra ? null : t.hora)}>{sug ? 'Es otro momento' : 'Elegir el momento'} {otra ? '▴' : '▾'}</button>
        </div>
        {otra && !conTest && opciones.some((h) => !h.libre) && <p className="small muted" style={{ margin: '.3rem 0 0' }}>«+»: ese momento ya tiene toma; esta se guarda como esporádica de ese momento.</p>}
        {otra && <div className="chips" role="group" aria-label="Guardar la tensión del reloj en" style={{ marginTop: '.3rem' }}>
          {opciones.map((h) => <button type="button" key={h.k + (h.sub ?? '')} className="chip" title={h.libre ? undefined : 'Ya tiene toma: se guarda como esporádica de este momento'} onClick={() => { setOtraDe(null); asignarReloj(t, h.k, h.sub) }}>{h.l}{h.libre ? '' : ' +'}</button>)}
          <button type="button" className="chip" onClick={() => { setOtraDe(null); asignarReloj(t, null, null) }}>Esporádica</button>
        </div>}
      </div>
    )
  }
  const resumenDe = (x: Medida) => [
    x.fc != null && `FC ${x.fc}`,
    x.pas != null || x.pad != null ? `TA ${x.pas ?? '—'}/${x.pad ?? '—'}` : x.ta_no_capta && 'TA no la capta',
    x.glucosa != null && `Glu ${x.glucosa}`,
    x.spo2 != null && `Sat ${x.spo2} %`,
  ].filter(Boolean).join(' · ') || 'Anotada'
  const fijas = MOMS.map(([k, l]) => {
    const subs = subtomasDe(k).map((sub) => { const i = indiceDe(k, sub); return { sub, i, x: i >= 0 ? xs[i] : undefined } })
    const con = subs.filter((s) => s.x && medidaConDatos(s.x))
    return { k, l, subs, con, hecha: con.length === subs.length }
  })
  const hechas = fijas.filter((f) => f.hecha).length
  const esporadicas = orden.length

  return (
    <div className="card sint-grupo">
      <div className="row between">
        <h3 style={{ margin: 0 }}>{titulo}</h3>
        <span className="muted small">{hechas} de {MOMS.length} fijas</span>
      </div>
      <p className="muted small" style={{ margin: '.2rem 0 .3rem' }}>{intro ?? 'Frecuencia cardíaca, tensión arterial, glucosa y saturación. Toca un momento para rellenarlo.'}</p>
      {conTest && <TestDePie modo="banner" inicio={tp.inicio ?? null} sentadaMin={tp.sentada?.min ?? null} hoy={date === todayStr()} reiniciar={(h) => set({ test_pie: { ...tp, inicio: h, sentada: null } })} />}
      {conTest && date === todayStr() && !tp.inicio && (
        <div className="levantarme-ya">
          <button type="button" className="btn" onClick={() => { programarPitidos(); set({ test_pie: { ...tp, inicio: ahoraHMS(), sentada: null } }) }}>🌅 Me acabo de levantar</button>
          <p className="small muted" style={{ margin: '.3rem 0 0' }}>Tómate antes la tensión tumbada con el reloj y toca al ponerte de pie: suena en cada toma (1, 3, 5 y 10 minutos). Las tensiones del reloj se guardan después en su momento.</p>
        </div>
      )}
      {deRelojVer.length > 0 && (
        <div className="reloj-pendientes">
          <div className="medida-eje small"><b>⌚ Del reloj</b> <span className="muted">· comprueba el momento y guárdala con un toque</span></div>
          {[...deRelojVer].sort((p, q) => p.hora.localeCompare(q.hora)).map(tarjetaReloj)}
        </div>
      )}
      <div className="fijas">
        {fijas.map(({ k, l, subs, con, hecha }) => {
          const abiertaEsta = abierta === k
          const av = con.flatMap((s) => avisosMedida(s.x!))
          return (
            <div key={k} className={'fija' + (hecha ? ' hecha' : con.length ? ' a-medias' : '') + (abiertaEsta ? ' abierta' : '')}>
              <button type="button" className="fija-cab" aria-expanded={abiertaEsta} onClick={() => plegar(abiertaEsta ? null : k)}>
                <span className="fija-marca" aria-hidden="true">{hecha ? '✓' : con.length ? `${con.length}/${subs.length}` : ''}</span>
                <span className="fija-nombre">{l}</span>
                <span className="fija-resumen small">
                  {con.length ? con.map((s, n) => (
                    <span key={n} className="fija-linea">{s.sub ? <span className="muted">{s.sub}′ </span> : null}{s.x!.hora && <b>{s.x!.hora}</b>} {resumenDe(s.x!)}</span>
                  )) : <span className="muted">Sin registrar</span>}
                  {av.length > 0 && <span className="fija-aviso" title={av.join(' · ')}> ⚠</span>}
                </span>
                <span className="fija-flecha" aria-hidden="true">{abiertaEsta ? '▴' : '▾'}</span>
              </button>
              {abiertaEsta && <>
                {k === 'poslevantarme' && <TestDePie modo="ficha" inicio={tp.inicio ?? null} sentadaMin={tp.sentada?.min ?? null} hoy={date === todayStr()} reiniciar={(h) => set({ test_pie: { ...tp, inicio: h, sentada: null } })} />}
                {subs.map(({ sub, i, x }) => formulario(x ?? porDefectoMomento(k, sub), i, porDefectoMomento(k, sub), sub ? `A los ${sub} minutos de pie` : undefined))}
                <button type="button" className="linkbtn small" style={{ margin: '.2rem .6rem .5rem' }} onClick={() => plegar(null)}>Plegar ▴</button>
              </>}
            </div>
          )
        })}
      </div>

      {conEsporadicas && <>
      <div className="row between" style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: 0 }}>Esporádicas</h4>
        <div className="row" style={{ gap: '.4rem' }}>
          <button type="button" className="btn sm" onClick={nueva}>+ Registrar</button>
        </div>
      </div>
      {esporadicas === 0 && <p className="muted small" style={{ marginBottom: 0 }}>Para tomas fuera de las fijas: durante un episodio, después de un esfuerzo… Cada una lleva su hora.</p>}
      {orden.map(({ x, i }) => {
        const abiertaE = espAbierta === i
        const avE = avisosMedida(x)
        return (
          <div key={'esp-' + i} className={'fija esporadica' + (abiertaE ? ' abierta' : '')}>
            <button type="button" className="fija-cab" aria-expanded={abiertaE} onClick={() => setEspAbierta(abiertaE ? null : i)}>
              <span className="fija-marca" aria-hidden="true">{x.taquicardia ? '❤️' : x.de_reloj ? '⌚' : ''}</span>
              <span className="fija-nombre">{x.hora ?? 'Sin hora'}{x.cuando && <span className="muted small"> · {MOMENTOS.find(([k]) => k === x.cuando)?.[1]}</span>}</span>
              <span className="fija-resumen small">{resumenDe(x)}{avE.length > 0 && <span className="fija-aviso"> ⚠</span>}</span>
              <span className="fija-flecha" aria-hidden="true">{abiertaE ? '▴' : '▾'}</span>
            </button>
            {abiertaE && <>
              {formulario(x, i)}
              <button type="button" className="linkbtn small" style={{ margin: '.2rem .6rem .5rem' }} onClick={() => setEspAbierta(null)}>Plegar ▴</button>
            </>}
          </div>
        )
      })}
      </>}
    </div>
  )
}
