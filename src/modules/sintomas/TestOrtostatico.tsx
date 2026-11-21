import type { ReactNode } from 'react'
import { nowHM, todayStr } from '../../lib/dates'
import type { RelojDia } from '../reloj/tipos'
import { pararPitidos } from './TestDePie'
import { ANTES_TEST, SINTOMAS_TEST, caidaHO, resultadoTest, type LecturaTest, type ResultadoTest, type SintDia, type TestPie } from './logica'

const num = (v: string) => (v === '' ? null : Number(v))
const conSigno = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')
/** Caída de tensión como cambio: una caída de 6 se enseña «−6»; una subida, «+4». */
const cambio = (caida: number | null) => (caida == null ? '—' : conSigno(-caida))
const minDia = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) + (h.length > 5 ? Number(h.slice(6, 8)) / 60 : 0)

type Nivel = 'ok' | 'aviso' | 'nada'
function Linea({ nivel, children }: { nivel: Nivel; children: ReactNode }) {
  return (
    <div className={'test-res test-res-' + nivel}>
      <span className="test-res-marca" aria-hidden="true">{nivel === 'ok' ? '✓' : nivel === 'aviso' ? '!' : '·'}</span>
      <span>{children}</span>
    </div>
  )
}

/** Gráfica del test: FC (con el pulso del reloj) o tensión alta por minuto de pie. */
function Grafica({ r, vista }: { r: ResultadoTest; vista: 'pots' | 'hipotension' }) {
  const W = 320, H = 170, L = 30, R = 8, T = 14, B = 22
  const ls = r.lecturas.filter((l) => (vista === 'pots' ? l.fc != null : l.pas != null && l.de !== 'reloj'))
  if (ls.length < 2) return null
  const xMax = Math.max(11, ...ls.map((l) => l.min + 0.5))
  const X = (m: number) => L + ((m + 2) / (xMax + 2)) * (W - L - R)
  const vals = ls.map((l) => (vista === 'pots' ? l.fc! : l.pas!))
  const base = vista === 'pots' ? r.basal?.fc : r.basal?.pas
  const umbral = base == null ? null : vista === 'pots' ? base + 30 : base - 20
  const extra = vista === 'hipotension' ? [90] : []
  const lo = Math.min(...vals, ...(umbral != null ? [umbral] : []), ...extra) - 6
  const hi = Math.max(...vals, ...(umbral != null ? [umbral] : []), ...extra) + 6
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const reloj = ls.filter((l) => l.de === 'reloj')
  const tomas = ls.filter((l) => l.de !== 'reloj')
  const linea = (xs: LecturaTest[]) => xs.map((l) => `${X(l.min).toFixed(1)},${Y(vista === 'pots' ? l.fc! : l.pas!).toFixed(1)}`).join(' ')
  const sentada = r.sentada?.min
  const etiqueta = vista === 'pots' ? 'Frecuencia cardíaca del test' : 'Tensión alta del test'
  return (
    <figure className="test-graf">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${etiqueta}: ${tomas.map((l) => `${l.etiqueta} ${vista === 'pots' ? l.fc : l.pas}`).join(', ')}`}>
        <rect x={X(0)} y={T} width={X(Math.min(sentada ?? 10, 10)) - X(0)} height={H - T - B} className="test-graf-pie" />
        {vista === 'hipotension' && <rect x={X(0)} y={T} width={X(3) - X(0)} height={H - T - B} className="test-graf-3" />}
        {base != null && <><line x1={L} x2={W - R} y1={Y(base)} y2={Y(base)} className="test-graf-base" /><text x={W - R} y={Y(base) - 3} textAnchor="end" className="test-graf-txt">basal {base}</text></>}
        {umbral != null && <><line x1={L} x2={W - R} y1={Y(umbral)} y2={Y(umbral)} className="test-graf-umbral" /><text x={L + 2} y={Y(umbral) - 3} className="test-graf-txt umbral">{vista === 'pots' ? `basal +30 = ${umbral}` : `basal −20 = ${umbral}`}</text></>}
        {vista === 'hipotension' && <><line x1={L} x2={W - R} y1={Y(90)} y2={Y(90)} className="test-graf-90" /><text x={W - R} y={Y(90) + 11} textAnchor="end" className="test-graf-txt rojo">90</text></>}
        {sentada != null && <><line x1={X(sentada)} x2={X(sentada)} y1={T} y2={H - B} className="test-graf-sentada" /><text x={X(sentada) + 3} y={T + 10} className="test-graf-txt rojo">me senté</text></>}
        {reloj.length > 1 && <polyline points={linea(reloj)} className="test-graf-reloj" />}
        {tomas.length > 1 && <polyline points={linea(tomas)} className="test-graf-tomas" />}
        {tomas.map((l, k) => <circle key={k} cx={X(l.min)} cy={Y(vista === 'pots' ? l.fc! : l.pas!)} r="4.5" className="test-graf-punto" />)}
        {[[-1, 'tumb.'], [1, '1′'], [3, '3′'], [5, '5′'], [10, '10′']].map(([m, t]) => <text key={t} x={X(m as number)} y={H - 6} textAnchor="middle" className="test-graf-txt">{t}</text>)}
      </svg>
      <figcaption className="small muted">{vista === 'pots' ? 'Puntos: tus tomas · línea fina: pulso del reloj · fondo: de pie.' : 'Puntos: tus tomas · zona más oscura: los 3 primeros minutos.'}</figcaption>
    </figure>
  )
}

/**
 * Test de pie (desde la 0.26.0). En la hoja POTS: lo hecho antes del test, el botón «Me he sentado / tumbado», la tabla y la gráfica
 * de la frecuencia cardíaca y el resultado (subida de FC). En la hoja Hipotensión: la tabla y la gráfica de la tensión y el resultado
 * (caída en los 3 primeros minutos y después). Las tomas se anotan en las mediciones fijas «Al levantarme» y «Poslevantarme».
 */
export function TestOrtostatico({ d, set, date, reloj, vista }: { d: SintDia; set: (patch: SintDia) => void; date: string; reloj: RelojDia | null; vista: 'pots' | 'hipotension' }) {
  const tp: TestPie = d.test_pie ?? {}
  const poner = (patch: Partial<TestPie>) => set({ test_pie: { ...tp, ...patch } })
  const r = resultadoTest(d, reloj?.fc_puntos ?? [])
  const hoy = date === todayStr()
  const seg = tp.inicio && hoy ? (minDia(nowHM() + ':' + String(new Date().getSeconds()).padStart(2, '0')) - minDia(tp.inicio)) * 60 : null
  const enMarcha = seg != null && seg >= 0 && seg < 12 * 60
  const sentarse = () => {
    pararPitidos()
    const min = seg != null && seg >= 0 ? Math.max(1, Math.round(seg / 60)) : 10
    poner({ sentada: { min: Math.min(min, 10), hora: nowHM() } })
  }
  const sen = tp.sentada
  const ponerSentada = (patch: Partial<NonNullable<TestPie['sentada']>>) => sen && poner({ sentada: { ...sen, ...patch } })
  const tomas = r.lecturas.filter((l) => l.de !== 'reloj')
  const b = r.basal
  const ho = caidaHO(r.caida3) || caidaHO(r.caidaTarde) || (r.pasMin != null && r.pasMin < 90)
  const hayTest = !!b || tomas.length > 0

  return (
    <div className="card sint-grupo test-orto">
      {vista === 'pots' ? (
        <>
          <h3 style={{ margin: 0 }}>🧍 POTS · frecuencia cardíaca de pie</h3>
          <p className="muted small" style={{ margin: '.2rem 0 .5rem' }}>Tumbada al menos 5 minutos y luego 10 minutos de pie, quieta. Tomas tumbada («Al levantarme») y al 1, 3, 5 y 10 minutos («Poslevantarme»). Con el mismo test se rellena la hoja Hipotensión: no hay que repetirlo.</p>

          <div className="medida-eje small"><b>Antes del test</b> <span className="muted">· lo que puede cambiar la respuesta</span></div>
          <div className="chips" role="group" aria-label="Antes del test">
            {ANTES_TEST.map((n) => {
              const on = (tp.antes ?? []).includes(n)
              return <button type="button" key={n} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => poner({ antes: on ? (tp.antes ?? []).filter((y) => y !== n) : [...(tp.antes ?? []), n] })}>{n}</button>
            })}
          </div>

          {!sen && (tp.inicio || hayTest) && (
            <div className="test-sentarse">
              <button type="button" className={'btn block ' + (enMarcha ? 'danger' : 'secondary')} onClick={sentarse}>Me he sentado / tumbado</button>
              <p className="small muted" style={{ margin: '.3rem 0 0' }}>Si notas que te vas, siéntate o túmbate: el test cortado también cuenta. Se guarda el minuto y paran los pitidos.</p>
            </div>
          )}
          {sen && (
            <div className="test-sentada">
              <div className="row between">
                <b className="small">Me senté o me tumbé</b>
                <button type="button" className="linkbtn small" onClick={() => poner({ sentada: null })}>Deshacer</button>
              </div>
              <label className="row small" style={{ gap: '.4rem', marginTop: '.3rem' }}>
                <span className="muted">En el minuto</span>
                <input type="number" inputMode="numeric" min={0} max={10} style={{ width: '4.5rem' }} value={sen.min} onChange={(e) => ponerSentada({ min: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} />
                <span className="muted">· {sen.hora}</span>
              </label>
              <div className="medida-eje small muted">Por qué</div>
              <div className="chips" role="group" aria-label="Por qué me senté">
                {SINTOMAS_TEST.filter((n) => n !== 'Nada').map((n) => {
                  const on = (sen.motivo ?? []).includes(n)
                  return <button type="button" key={n} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => ponerSentada({ motivo: on ? (sen.motivo ?? []).filter((y) => y !== n) : [...(sen.motivo ?? []), n] })}>{n}</button>
                })}
              </div>
              <div className="medida-eje small muted">Toma ya sentada</div>
              <div className="medida-campos">
                <label className="field"><span>FC (lpm)</span><input type="number" inputMode="numeric" value={sen.fc ?? ''} onChange={(e) => ponerSentada({ fc: num(e.target.value) })} /></label>
                <div className="field"><span>Tensión (mmHg)</span>
                  <div className="medida-ta">
                    <input type="number" inputMode="numeric" aria-label="Tensión alta sentada" placeholder="Alta" value={sen.pas ?? ''} onChange={(e) => ponerSentada({ pas: num(e.target.value) })} />
                    <span aria-hidden="true">/</span>
                    <input type="number" inputMode="numeric" aria-label="Tensión baja sentada" placeholder="Baja" value={sen.pad ?? ''} onChange={(e) => ponerSentada({ pad: num(e.target.value) })} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <h3 style={{ margin: 0 }}>📉 Hipotensión · test de pie</h3>
          <p className="muted small" style={{ margin: '.2rem 0 .5rem' }}>Usa las tensiones del mismo test de pie (hoja POTS). Clásica: en los 3 primeros minutos. Tardía: pasados los 3 minutos.</p>
          <div className="medida-eje small"><b>Al ponerte de pie, en los primeros segundos</b></div>
          <p className="small" style={{ margin: '.1rem 0 .3rem' }}>¿Te mareaste al incorporarte y se te pasó en menos de 1 minuto?</p>
          <div className="chips" role="group" aria-label="Mareo al incorporarme">
            {([[true, 'Sí'], [false, 'No']] as const).map(([v, l]) => <button type="button" key={l} className={'chip ' + (tp.mareo_inicial === v ? 'on' : '')} aria-pressed={tp.mareo_inicial === v} onClick={() => poner({ mareo_inicial: tp.mareo_inicial === v ? null : v })}>{l}</button>)}
          </div>
          <p className="small muted" style={{ margin: '.3rem 0 .5rem' }}>Orienta a hipotensión ortostática inicial. Es demasiado rápida para el tensiómetro: queda como síntoma para tu médico.</p>
        </>
      )}

      {hayTest ? (
        <>
          <table className="test-tabla small">
            <thead>
              <tr><th>Momento</th>{vista === 'pots' ? <><th>FC</th><th>ΔFC</th></> : <><th>TA</th><th>ΔTA</th></>}<th>Notaba</th></tr>
            </thead>
            <tbody>
              {tomas.map((l, k) => {
                const dFc = l.fc != null && b?.fc != null && l.min > -1 ? l.fc - b.fc : null
                const alto = vista === 'pots' && dFc != null && dFc >= 30 && l.de !== 'sentada'
                const dP = l.pas != null && b?.pas != null && l.min > -1 ? l.pas - b.pas : null
                const dD = l.pad != null && b?.pad != null && l.min > -1 ? l.pad - b.pad : null
                const bajo = vista === 'hipotension' && l.de !== 'sentada' && ((dP != null && dP <= -20) || (dD != null && dD <= -10) || (l.pas != null && l.pas < 90 && l.min > -1))
                return (
                  <tr key={k} className={(alto || bajo ? 'alto' : '') + (l.de === 'sentada' ? ' sentada' : '')}>
                    <th scope="row">{l.etiqueta}{vista === 'hipotension' && l.min > 0 && l.de !== 'sentada' && <span className="muted"> · {l.min <= 3 ? 'clásica' : 'tardía'}</span>}</th>
                    {vista === 'pots'
                      ? <><td>{l.fc ?? '—'}</td><td>{dFc != null ? conSigno(dFc) : '—'}</td></>
                      : <><td>{l.pas != null || l.pad != null ? `${l.pas ?? '—'}/${l.pad ?? '—'}` : '—'}</td><td>{dP != null || dD != null ? `${dP != null ? conSigno(dP) : '—'}/${dD != null ? conSigno(dD) : '—'}` : '—'}</td></>}
                    <td>{(l.sintomas ?? []).join(', ') || '—'}</td>
                  </tr>
                )
              })}
              {sen && <tr className="sentada"><th scope="row">Me senté</th><td colSpan={3} className="muted">minuto {sen.min} · {sen.hora}{r.fcMax != null && vista === 'pots' ? ` · FC de pie máxima ${r.fcMax}` : ''}</td></tr>}
            </tbody>
          </table>
          <Grafica r={r} vista={vista} />
          <div className="test-resultado">
            <h4 style={{ margin: '0 0 .4rem' }}>Resultado de este test</h4>
            {!b && <Linea nivel="nada">Falta la toma tumbada («Al levantarme»): sin ella no se puede calcular {vista === 'pots' ? 'la subida' : 'la caída'}.</Linea>}
            {vista === 'pots' && b && <>
              {r.dFc == null ? <Linea nivel="nada">Faltan tomas de pie con frecuencia cardíaca.</Linea>
                : r.dFc >= 30 ? <Linea nivel="aviso"><b>Subida de FC de {conSigno(r.dFc)} lpm</b>{r.n30 >= 2 ? `, sostenida (${r.n30} lecturas de pie a +30 o más).` : ', pero solo en una lectura: no se puede decir que sea sostenida.'}</Linea>
                : <Linea nivel="ok"><b>Subida de FC de {conSigno(r.dFc)} lpm</b>: no llega a +30.</Linea>}
              <Linea nivel={ho ? 'aviso' : 'ok'}>{ho ? <><b>Hay hipotensión</b> en este test (mira la hoja Hipotensión). Con hipotensión no se habla de POTS.</> : <><b>Sin hipotensión</b> en este test (necesario para hablar de POTS).</>}</Linea>
              {r.fcMax != null && <Linea nivel={r.fcMax >= 120 ? 'aviso' : 'nada'}><b>FC de pie máxima {r.fcMax}</b>{r.fcMax >= 120 ? ' (120 o más).' : ' (no llega a 120).'}</Linea>}
            </>}
            {vista === 'hipotension' && b && <>
              <Linea nivel={caidaHO(r.caida3) ? 'aviso' : r.caida3.pas == null && r.caida3.pad == null ? 'nada' : 'ok'}><b>Clásica (≤3′):</b> {r.caida3.pas == null && r.caida3.pad == null ? 'faltan las tomas del minuto 1 o 3.' : `${cambio(r.caida3.pas)}/${cambio(r.caida3.pad)} mmHg${caidaHO(r.caida3) ? ': llega a −20/−10.' : ': no llega a −20/−10.'}`}</Linea>
              <Linea nivel={caidaHO(r.caidaTarde) ? 'aviso' : r.caidaTarde.pas == null && r.caidaTarde.pad == null ? 'nada' : 'ok'}><b>Tardía (&gt;3′):</b> {r.caidaTarde.pas == null && r.caidaTarde.pad == null ? 'faltan las tomas del minuto 5 o 10.' : `${cambio(r.caidaTarde.pas)}/${cambio(r.caidaTarde.pad)} mmHg${caidaHO(r.caidaTarde) ? ': llega a −20/−10.' : ': no llega a −20/−10.'}`}</Linea>
              {r.pasMin != null && <Linea nivel={r.pasMin < 90 ? 'aviso' : 'ok'}><b>Tensión alta de pie por debajo de 90:</b> {r.pasMin < 90 ? `sí (mínima ${r.pasMin}).` : `no (mínima ${r.pasMin}).`}</Linea>}
              {tp.mareo_inicial && <Linea nivel="aviso"><b>Mareo al incorporarte</b> que se pasa en menos de 1 minuto.</Linea>}
            </>}
            {sen && <Linea nivel="aviso"><b>Test cortado en el minuto {sen.min}</b>{(sen.motivo ?? []).length ? ` (${sen.motivo!.join(', ').toLowerCase()})` : ''}. Un test cortado por síntomas también es información para tu médico.</Linea>}
            {(tp.antes ?? []).some((a) => a !== 'Sin beber aún') && <Linea nivel="nada">Antes del test: {(tp.antes ?? []).join(', ').toLowerCase()}. Puede bajar la respuesta.</Linea>}
            <p className="small muted" style={{ margin: '.4rem 0 0' }}>{vista === 'pots'
              ? 'Patrón a valorar por tu médico, no un diagnóstico. Criterio de POTS (consenso HRS 2015 y NIH 2019): subida de FC de 30 lpm o más en los 10 minutos de pie, sostenida, sin hipotensión ortostática y con síntomas desde hace 6 meses o más. Un test solo no basta: cuenta cuántas mañanas se repite.'
              : 'Patrón a valorar por tu médico, no un diagnóstico. Criterio (guía ESC 2018 de síncope, consenso HRS 2015): caída de 20 mmHg o más de la alta o de 10 o más de la baja, o tensión alta por debajo de 90 que reproduce los síntomas.'}</p>
          </div>
        </>
      ) : (
        <p className="small muted" style={{ margin: '.6rem 0 0' }}>{hoy ? 'Aún no hay tomas del test de hoy. Anótalas abajo, en «Al levantarme» y «Poslevantarme».' : 'Sin test de pie este día.'}</p>
      )}
    </div>
  )
}
