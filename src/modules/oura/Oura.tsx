import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plegable } from '../../components/ui'
import { addDays, fmtDate, todayStr } from '../../lib/dates'
import { DEMO, listDaily } from '../../store/repo'
import { FASES, infoDia } from '../ciclo/logica'
import { useCiclo } from '../ciclo/useCiclo'
import {
  BarraFases, BarrasDias, ciclosDe, Curva, Explica, Factores, finde, Hipnograma, hm, LeyendaManos, Mano, nivelDe,
  Observacion, profundoPrimeraMitad, TiraDia, type Nivel, type PuntoDia,
} from './graficos'
import { detallesDisposicion, observacionDisposicion, subidaTemperatura, valoracionVfc30, valoracionVfcNoche } from './analisis'
import { FACTORES_DISPOSICION, FACTORES_SUENO, NIVELES, RESUMEN_ESTRES, type OuraDia } from './tipos'
import { useOura } from './conexion'
import { TarjetaOura } from './Tarjeta'

/** Días que se ven en las gráficas y con los que se calcula tu media. */
const DIAS = 30

const num = (v?: number | null, dec = 0) => (v == null ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }))
const signo = (v?: number | null, dec = 1) => (v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), dec))
function media(xs: (number | null | undefined)[]) {
  const ok = xs.filter((x): x is number => x != null)
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null
}
function serie(filas: { day: string; value: OuraDia }[], f: (d: OuraDia) => number | null | undefined): PuntoDia[] {
  return filas.flatMap((r) => { const y = f(r.value); return y == null ? [] : [{ day: r.day, y }] })
}
const colorNivel = (n: Nivel | null) => n === 'bien' ? 'var(--green)' : n === 'regular' ? 'var(--amber)' : n === 'mal' ? 'var(--red)' : 'var(--muted)'

/** Cifra con su nombre debajo, su mano y, si la hay, la comparación con tu media. */
function Dato({ v, u, t, n, comp }: { v: string; u?: string; t: string; n?: Nivel | null; comp?: ReactNode }) {
  return (
    <div className="oura-dato">
      <strong>{v}{u && <small> {u}</small>} {n !== undefined && <Mano n={n} />}</strong>
      <span>{t}</span>
      {comp && <em>{comp}</em>}
    </div>
  )
}

/** Fila de la evaluación de la noche: qué tuviste, qué es lo habitual y su mano. */
function Eval({ t, v, nota: r, n }: { t: string; v: ReactNode; nota: ReactNode; n: Nivel | null }) {
  return (
    <div className="oura-eval">
      <span>{n ? <Mano n={n} /> : '·'}</span>
      <div><strong>{t}: {v}</strong><span>{r}</span></div>
    </div>
  )
}

/** Diferencia con tu media de los últimos 30 días. */
function frente(v: number | null | undefined, m: number | null, u: string, dec = 0) {
  if (v == null || m == null) return null
  const d = v - m
  if (Math.abs(d) < (dec ? 0.1 : 1)) return <>igual que tu media ({num(m, dec)})</>
  return <>{signo(d, dec)} {u} frente a tu media ({num(m, dec)})</>
}

export default function Oura() {
  const hoy = todayStr()
  const [date, setDate] = useState(hoy)
  const [filas, setFilas] = useState<{ day: string; value: OuraDia }[] | null>(null)
  const [aviso, setAviso] = useState('')

  const o = useOura()

  // Se vuelve a leer cada vez que la sincronización trae datos nuevos.
  useEffect(() => {
    let alive = true
    listDaily<OuraDia>('oura', addDays(hoy, -DIAS - 30), hoy).then((r) => alive && setFilas(r), () => alive && setFilas([]))
    return () => { alive = false }
  }, [hoy, o.vuelta])

  const { modelo, mapa } = useCiclo()
  const info = useMemo(() => infoDia(modelo, mapa, date), [modelo, mapa, date])
  const faseDe = (day: string) => infoDia(modelo, mapa, day)?.fase ?? null

  if (!filas) return <div><h1>Oura Ring</h1><p className="muted">Cargando…</p></div>
  if (!DEMO && !filas.length) {
    return (
      <div className="oura">
        <h1>Oura Ring</h1>
        <TarjetaOura o={o} onDemo={() => {}} />
        <p className="card muted">
          {o.conectado
            ? (o.sincronizando ? 'Trayendo tus datos de Oura…' : 'Aún no han llegado datos de Oura. Abre la app de Oura en el móvil para que el anillo se sincronice y pulsa «Sincronizar ahora».')
            : 'Cuando conectes tu anillo, aquí verás cada día tu noche, la disposición, la temperatura, el corazón, el estrés, la actividad y la respiración, con lo que significa cada dato.'}
        </p>
      </div>
    )
  }

  const porDia = Object.fromEntries(filas.map((r) => [r.day, r.value]))
  const d: OuraDia = porDia[date] ?? {}
  const ult = filas.filter((r) => r.day > addDays(date, -DIAS) && r.day <= date)
  const previos = filas.filter((r) => r.day >= addDays(date, -DIAS) && r.day < date).map((r) => r.value)
  const m = {
    vfc: media(previos.map((x) => x.noche?.vfc_media)),
    fcMin: media(previos.map((x) => x.noche?.fc_min)),
    resp: media(previos.map((x) => x.noche?.resp)),
    pasos: media(previos.map((x) => x.actividad?.pasos)),
  }
  const n = d.noche ?? {}
  const sinDatos = !Object.keys(d).length
  const demoAviso = () => { setAviso('En la demostración no se conecta con Oura: los datos son de ejemplo.'); setTimeout(() => setAviso(''), 2500) }

  // Evaluación de la noche.
  const total = n.total_min ?? 0
  const ciclos = n.fases ? ciclosDe(n.fases) : null
  const remPct = total && n.rem_min != null ? Math.round((100 * n.rem_min) / total) : null
  const profPct = total && n.profundo_min != null ? Math.round((100 * n.profundo_min) / total) : null
  const profAntes = n.fases ? profundoPrimeraMitad(n.fases) : null
  const nCiclos: Nivel | null = ciclos == null ? null : ciclos >= 4 ? 'bien' : ciclos === 3 ? 'regular' : 'mal'
  const nRem: Nivel | null = n.rem_min == null ? null : n.rem_min >= 90 && (remPct ?? 0) >= 20 ? 'bien' : n.rem_min >= 60 ? 'regular' : 'mal'
  const nTotal: Nivel | null = !total ? null : total >= 480 ? 'bien' : total >= 420 ? 'regular' : 'mal'
  const nEfic: Nivel | null = n.eficiencia == null ? null : n.eficiencia >= 85 ? 'bien' : n.eficiencia >= 75 ? 'regular' : 'mal'
  const lat = n.latencia_min
  const nLat: Nivel | null = lat == null ? null : lat >= 10 && lat <= 20 ? 'bien' : lat >= 5 && lat <= 30 ? 'regular' : 'mal'

  // Entre semana y fin de semana (la noche cuenta como el día en que te despiertas).
  const horas = serie(ult, (x) => x.noche?.total_min != null ? x.noche.total_min / 60 : null)
  const hSemana = media(horas.filter((p) => !finde(p.day)).map((p) => p.y))
  const hFinde = media(horas.filter((p) => finde(p.day)).map((p) => p.y))

  // Corazón frente a tu media: la FC mínima, mejor más baja; la variabilidad, mejor más alta.
  const nFc: Nivel | null = n.fc_min == null || m.fcMin == null ? null : n.fc_min - m.fcMin <= -1 ? 'bien' : n.fc_min - m.fcMin >= 3 ? 'mal' : 'regular'
  const nVfc: Nivel | null = n.vfc_media == null || m.vfc == null ? null : n.vfc_media - m.vfc >= 2 ? 'bien' : n.vfc_media - m.vfc <= -5 ? 'mal' : 'regular'

  // Lecturas escritas.
  const detDisp = detallesDisposicion(porDia, date)
  const obsDisp = observacionDisposicion(filas, date, info?.fase ?? null)
  const subida = subidaTemperatura(filas, date, info?.ciclo.ovulacion ?? null, info?.fase ?? null)
  const vfcNoche = valoracionVfcNoche(porDia, date)
  const vfc30 = valoracionVfc30(filas, date, faseDe)

  return (
    <div className="oura">
      <h1>Oura Ring</h1>

      <TarjetaOura o={o} onDemo={demoAviso} />
      {DEMO && <p className="muted small">Demostración con datos inventados, no son los tuyos.</p>}
      {aviso && <div className="toast">{aviso}</div>}

      <div className="row between" style={{ margin: '.4rem 0 .4rem' }}>
        <button className="btn sm ghost" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <strong>{date === hoy ? 'Hoy' : fmtDate(date)}</strong>
          {info && <div className="muted small">Día {info.dia} del ciclo · {FASES[info.fase]}</div>}
        </div>
        <button className="btn sm ghost" disabled={date >= hoy} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>
      <LeyendaManos />

      {sinDatos ? <p className="card muted">Oura no tiene datos de este día.</p> : (
        <>
          {d.modo_descanso && <div className="card tight oura-descanso">🛌 <strong>Modo descanso</strong> activo este día.</div>}

          {/* ---------- Tu noche ---------- */}
          <div className="card accent">
            <div className="row between"><h2 style={{ margin: 0 }}>Tu noche</h2>{n.dormir && <span className="small">{n.dormir} → {n.despertar}</span>}</div>
            <div className="oura-kpis">
              <Dato v={hm(n.total_min).replace(/ min$/, '')} t="Dormiste" comp={n.total_min != null ? (n.total_min < 480 ? <>te faltan {hm(480 - n.total_min)} para 8 h</> : <>objetivo de 8 h cumplido</>) : null} />
              <Dato v={num(d.sueno?.puntuacion)} t="Sueño" n={nivelDe(d.sueno?.puntuacion)} />
              <Dato v={num(d.disposicion?.puntuacion)} t="Disposición" n={nivelDe(d.disposicion?.puntuacion)} />
            </div>
            <div className="oura-pildoras">
              <span>Variabilidad <b>{num(n.vfc_media)} ms</b></span>
              <span>FC mínima <b>{num(n.fc_min)} lpm</b></span>
              <span>Temperatura <b>{signo(d.disposicion?.temp_desv)} °C</b></span>
              <span>Respiración <b>{num(n.resp, 1)}/min</b></span>
            </div>
          </div>

          {/* ---------- Sueño ---------- */}
          <Plegable id="oura-sueno" title={`😴 Sueño · ${num(d.sueno?.puntuacion)}`} abierto>
            <p className="small oura-lead"><strong>Puntuación de sueño {num(d.sueno?.puntuacion)}</strong> <Mano n={nivelDe(d.sueno?.puntuacion)} /> Resume cómo dormiste esta noche, de 0 a 100, a partir de los siete factores de más abajo.</p>
            {n.fases && <Hipnograma fases={n.fases} dormir={n.dormir} />}
            <BarraFases profundo={n.profundo_min} rem={n.rem_min} ligero={n.ligero_min} despierta={n.despierta_min} />

            <h3>Cómo fue la noche</h3>
            <div className="oura-evals">
              <Eval t="Horas dormidas" v={hm(total)} nota="Los adultos necesitan entre 7 y 9 horas; tu objetivo es dormir 8." n={nTotal} />
              <Eval t="Ciclos de sueño" v={ciclos ?? '—'} nota="Cada ciclo dura unos 90 minutos y pasa por ligero, profundo y REM. Lo habitual son entre 4 y 6 por noche." n={nCiclos} />
              <Eval t="Sueño REM" v={<>{hm(n.rem_min)} ({remPct ?? '—'} %)</>} nota="Lo habitual es un 20–25 % de la noche y al menos 90 minutos. Se concentra en la segunda mitad: si te despiertas pronto o duermes poco, es lo primero que se pierde." n={nRem} />
              <Eval t="Sueño profundo" v={<>{hm(n.profundo_min)} ({profPct ?? '—'} %)</>} nota={<>Es el más reparador y se concentra al principio de la noche{profAntes != null ? <>: esta noche, el {profAntes} % fue en la primera mitad</> : null}. Oura toma como referencia unos 90 minutos en adultos jóvenes y 45 en mayores.</>} n={nivelDe(d.sueno?.factores?.profundo)} />
              <Eval t="Eficiencia" v={`${num(n.eficiencia)} %`} nota="Parte del tiempo en la cama que estuviste dormida. Se recomienda más del 85 %." n={nEfic} />
              <Eval t="Tiempo en dormirte" v={hm(lat)} nota="Lo ideal son 15–20 minutos. Menos de 5 puede indicar que te acuestas tarde o con demasiado cansancio." n={nLat} />
              <Eval t="Despierta durante la noche" v={hm(n.despierta_min)} nota="Despertares breves son normales; muchos o largos bajan la eficiencia y el descanso." n={null} />
              {d.recomendada?.desde && <Eval t="Hora de acostarte que te recomienda Oura" v={`${d.recomendada.desde}–${d.recomendada.hasta}`} nota={n.dormir ? `Esta noche te acostaste a las ${n.dormir}.` : ''} n={null} />}
            </div>

            <h3>Los siete factores de la puntuación</h3>
            <Factores items={FACTORES_SUENO.map(([k, t]) => ({ nombre: t, valor: d.sueno?.factores?.[k] }))} />
            <Explica>
              <p>Cada factor va de 0 a 100 y mide una parte de la noche frente a lo recomendable y frente a tus noches anteriores.</p>
              <ul>
                <li><b>Sueño total</b>: si dormiste lo suficiente (7–9 horas en adultos).</li>
                <li><b>Eficiencia</b>: qué parte del tiempo en la cama pasaste dormida (mejor por encima del 85 %).</li>
                <li><b>Descanso</b>: cuánto te moviste y despertaste; moverse un poco es normal, mucho baja este factor.</li>
                <li><b>Sueño REM</b>: la fase de los sueños, ligada a la memoria y a las emociones; lo habitual es un 20–25 % de la noche.</li>
                <li><b>Sueño profundo</b>: la fase más reparadora para el cuerpo; se concentra al principio de la noche.</li>
                <li><b>Tiempo en dormirte</b>: lo ideal son 15–20 minutos.</li>
                <li><b>Regularidad del horario</b>: si duermes a horas parecidas y alineadas con tu reloj interno; lo óptimo es que la mitad de la noche caiga entre las 00 y las 03 h.</li>
              </ul>
            </Explica>

            <h3>Horas dormidas, 30 días</h3>
            <BarrasDias titulo="Horas dormidas" puntos={horas} unidad="h" dec={1} base={0} lineas={[{ y: 8, texto: '8 h' }]}
              colorDe={(y) => y >= 7 ? 'var(--green)' : y >= 6 ? 'var(--amber)' : 'var(--red)'} />
            <div className="oura-semana small">
              <span>Entre semana <b>{num(hSemana, 1)} h</b></span>
              <span>Fin de semana <b>{num(hFinde, 1)} h</b></span>
            </div>
            <p className="muted small">Los fines de semana van sombreados. Cada noche cuenta como el día en que te despiertas: la del viernes al sábado es la del sábado.</p>
          </Plegable>

          {/* ---------- Disposición ---------- */}
          <Plegable id="oura-disposicion" title={`🔋 Disposición · ${num(d.disposicion?.puntuacion)}`}>
            <p className="small oura-lead"><strong>Disposición {num(d.disposicion?.puntuacion)}</strong> <Mano n={nivelDe(d.disposicion?.puntuacion)} /> Indica, de 0 a 100, cuánto se ha recuperado tu cuerpo y cuánto le puedes exigir hoy.</p>
            <div className="oura-rangos small">
              <span><Mano n="bien" /> <b>85 o más</b>: recuperada; puedes exigirte más.</span>
              <span><Mano n="regular" /> <b>70–84</b>: recuperada lo suficiente para un día normal.</span>
              <span><Mano n="mal" /> <b>Menos de 70</b>: tu cuerpo no se ha recuperado del todo; mejor descansar o bajar la intensidad.</span>
            </div>
            <h3>Los ocho factores</h3>
            <Factores items={FACTORES_DISPOSICION.map(([k, t]) => ({ nombre: t, valor: d.disposicion?.factores?.[k], detalle: detDisp[k] }))} />
            <Explica>
              <ul>
                <li><b>Equilibrio de la variabilidad</b>: tu variabilidad de los últimos días frente a tu media de más tiempo. Si baja, el cuerpo está más cargado.</li>
                <li><b>Frecuencia en reposo</b>: si tu pulso más bajo de la noche está por encima o por debajo de lo habitual en ti. Más alta de lo normal suele indicar carga.</li>
                <li><b>Temperatura corporal</b>: si la temperatura de la noche se sale de tu rango normal; la fase lútea, una infección o el estrés la suben.</li>
                <li><b>Índice de recuperación</b>: lo rápido que tu pulso llega a su punto más bajo durante la noche. Cuanto antes, mejor te recuperas.</li>
                <li><b>Noche anterior</b>: cómo dormiste anoche comparado con tus noches habituales.</li>
                <li><b>Equilibrio del sueño</b>: si has dormido lo suficiente en las dos últimas semanas.</li>
                <li><b>Actividad del día anterior</b>: si ayer equilibraste movimiento, ratos sentada y descanso.</li>
                <li><b>Equilibrio de actividad</b>: cuánta carga ha supuesto tu actividad de las dos últimas semanas.</li>
              </ul>
            </Explica>
            <h3>Disposición, 30 días</h3>
            <BarrasDias titulo="Disposición" puntos={serie(ult, (x) => x.disposicion?.puntuacion)} unidad="" base={40}
              lineas={[{ y: 85, texto: '85' }, { y: 70, texto: '70' }]} colorDe={(y) => colorNivel(nivelDe(y))} />
            {obsDisp && (
              <Observacion>
                {obsDisp.texto.map((t, i) => <p key={i}>{t}</p>)}
                {obsDisp.consejos.length > 0 && <ul>{obsDisp.consejos.map((t, i) => <li key={i}>{t}</li>)}</ul>}
              </Observacion>
            )}
          </Plegable>

          {/* ---------- Temperatura ---------- */}
          <Plegable id="oura-temperatura" title={`🌡️ Temperatura · ${signo(d.disposicion?.temp_desv)} °C`}>
            <div className="oura-kpis">
              <Dato v={`${signo(d.disposicion?.temp_desv)} °C`} t="Esta noche, frente a tu media" />
              <Dato v={`${signo(d.disposicion?.temp_tend)} °C`} t="Tendencia de varios días" />
              <Dato v={info ? `Día ${info.dia}` : '—'} t={info ? FASES[info.fase] : 'Fase del ciclo'} />
            </div>
            <BarrasDias titulo="Temperatura de cada noche" puntos={serie(ult, (x) => x.disposicion?.temp_desv)} unidad="°C" dec={2} cero abajo="fecha" />
            <p className="muted small">Hacia arriba, noches por encima de tu media; hacia abajo, por debajo.</p>
            <Observacion>{subida.texto.map((t, i) => <p key={i}>{t}</p>)}</Observacion>
            <Explica>
              <ul>
                <li>Es la temperatura de la piel del dedo durante la noche, comparada con tu propia media. No es la temperatura basal ni se lee en grados absolutos.</li>
                <li>En la fase folicular suele estar en tu media o por debajo; después de ovular sube y se mantiene alta hasta la regla.</li>
                <li>La subida llega unos días después de ovular: sirve para confirmar la ovulación, no para predecirla.</li>
                <li>Una subida fuera de la fase lútea puede deberse a una infección, alcohol, cenar tarde o una noche de calor.</li>
              </ul>
            </Explica>
          </Plegable>

          {/* ---------- Corazón ---------- */}
          <Plegable id="oura-corazon" title={`❤️ Corazón · ${num(n.fc_min)} lpm · ${num(n.vfc_media)} ms`}>
            <div className="oura-kpis">
              <Dato v={num(n.fc_min)} u="lpm" t="FC mínima de la noche" n={nFc} comp={frente(n.fc_min, m.fcMin, 'lpm')} />
              <Dato v={num(n.fc_media)} u="lpm" t="FC media de la noche" />
              <Dato v={num(n.vfc_media)} u="ms" t="Variabilidad media" n={nVfc} comp={frente(n.vfc_media, m.vfc, 'ms')} />
            </div>
            {n.fc5 && n.dormir && <Curva titulo="Frecuencia cardíaca de la noche" valores={n.fc5} inicio={n.dormir} paso={5} unidad="lpm" color="var(--red)" zona={madrugada(n.dormir, n.fc5.length)} />}
            <p className="muted small">La frecuencia cardíaca del día está en Disautonomía, encima de las constantes.</p>

            <h3>Variabilidad</h3>
            {n.vfc5 && n.dormir && <Curva titulo="Variabilidad de la noche" valores={n.vfc5} inicio={n.dormir} paso={5} unidad="ms" color="var(--green)" />}
            {vfcNoche.length > 0 && <Observacion>{vfcNoche.map((t, i) => <p key={i}>{t}</p>)}</Observacion>}
            <BarrasDias titulo="Variabilidad media, 30 días" puntos={serie(ult, (x) => x.noche?.vfc_media)} unidad="ms"
              lineas={m.vfc != null ? [{ y: Math.round(m.vfc), texto: 'media' }] : []} colorDe={() => 'var(--green)'} />
            {vfc30.length > 0 && <Observacion>{vfc30.map((t, i) => <p key={i}>{t}</p>)}</Observacion>}
            <Explica titulo="La variabilidad y la disautonomía">
              <ul>
                <li>La variabilidad refleja cómo se reparte el mando entre el sistema nervioso de alerta (simpático) y el de descanso (parasimpático), el mismo sistema que falla en la disautonomía.</li>
                <li>En personas con taquicardia postural (POTS), los estudios encuentran de media una variabilidad más baja que en personas sanas.</li>
                <li>Es un marcador, no la causa: no dice por qué se desregula el sistema, pero sí cuándo está más cargado.</li>
                <li>Lo útil es tu tendencia: si antes de tus episodios la variabilidad baja varias noches seguidas, podrá servir de aviso. Para saberlo hay que comparar tus noches anteriores a cada episodio con tu media de la misma fase del ciclo.</li>
                <li>Oura la mide solo durante el sueño, con el método RMSSD. No se puede comparar con la de otro aparato ni con la de otras personas.</li>
              </ul>
            </Explica>

            <div className="oura-kpis">
              <Dato v={num(d.cardio?.vo2, 1)} u="ml/kg/min" t="VO2 máx (capacidad cardiovascular)" />
              <Dato v={num(d.cardio?.edad_vascular)} u="años" t="Edad cardiovascular" />
            </div>
            <Explica>
              <ul>
                <li><b>Frecuencia cardíaca mínima</b>: lo más bajo que llega tu pulso durante la noche. Más baja que tu media suele indicar que el cuerpo descansa bien; más alta, que está cargado (estrés, infección, cena tardía, alcohol o fase lútea).</li>
                <li><b>Curva de la noche</b>: lo normal es que baje en la primera mitad y suba poco a poco hacia el despertar. Si el punto más bajo llega muy tarde o hay picos de madrugada, la noche ha sido menos reparadora. La franja de 00 a 04 h va marcada.</li>
                <li><b>Frecuencia del día</b>: está en Disautonomía, encima de las constantes. Sube al moverte, ponerte de pie, comer o ante el estrés.</li>
                <li><b>Huecos en las curvas</b>: cada punto es la media de 5 minutos. Cuando el anillo no consigue una lectura fiable, Oura deja ese rato en blanco en vez de inventarlo. Pasa al moverte o despertarte, si el anillo está flojo o girado, con los dedos fríos (llega menos sangre y la señal es débil), con latidos irregulares o con poca batería.</li>
                <li><b>Variabilidad (VFC)</b>: cuánto cambia el tiempo entre un latido y el siguiente, en milisegundos. Refleja el equilibrio del sistema nervioso: más alta, más modo descanso y recuperación; más baja, más modo alerta. Cada persona tiene su rango, así que compárala solo con tu media.</li>
                <li><b>VO2 máx</b>: cuánto oxígeno puede usar tu cuerpo en un esfuerzo; mide tu forma física. Se afina con la prueba de caminar de 6 minutos de la app de Oura.</li>
                <li><b>Edad cardiovascular</b>: la edad que corresponde a la rigidez de tus arterias según Oura.</li>
              </ul>
            </Explica>
          </Plegable>

          {/* ---------- Estrés y resiliencia ---------- */}
          <Plegable id="oura-estres" title={`🌊 Estrés y resiliencia · ${d.resiliencia?.nivel ? NIVELES[d.resiliencia.nivel] : '—'}`}>
            <div className="oura-kpis">
              <Dato v={hm(d.estres?.alto_min)} t="En estrés alto" />
              <Dato v={hm(d.estres?.recuperacion_min)} t="En recuperación" />
              <Dato v={d.estres?.resumen ? RESUMEN_ESTRES[d.estres.resumen] : '—'} t="Resumen del día" />
            </div>
            <p className="small">Oura lo mide cada 15 minutos mientras estás despierta y quieta: no durante el sueño ni mientras caminas o haces ejercicio. Compara tu pulso, tu variabilidad y tu temperatura con tu propia línea base y clasifica cada rato en <b>estrés</b>, <b>activación</b>, <b>calma</b> o <b>recuperación</b>.</p>
            <p className="muted small">¿A qué horas? La conexión de Oura solo comparte el total del día, no los tramos. El gráfico por horas solo se ve en la app de Oura, en «Estrés del día».</p>
            <h3>Resiliencia: {d.resiliencia?.nivel ? NIVELES[d.resiliencia.nivel] : '—'}</h3>
            <Factores items={[
              { nombre: 'Recuperación nocturna', valor: d.resiliencia?.factores?.sueno },
              { nombre: 'Recuperación de día', valor: d.resiliencia?.factores?.dia },
              { nombre: 'Estrés del día', valor: d.resiliencia?.factores?.estres },
            ]} />
            <BarrasDias titulo="Estrés alto, 30 días" puntos={serie(ult, (x) => x.estres?.alto_min)} unidad="min" base={0} colorDe={() => 'var(--amber)'} />
            <Explica>
              <ul>
                <li><b>Estrés alto</b>: la suma de los ratos en estado de estrés, el nivel más alto. Es estrés del cuerpo: no distingue si viene de la mente, del esfuerzo, de la comida o de una infección, ni es lo que sientes. Después de caminar o hacer ejercicio puede salir como «estrés tras la actividad».</li>
                <li><b>Recuperación</b>: la suma de los ratos en calma o recuperación, cuando el cuerpo se recarga. Lo deseable es que no quede muy por debajo del estrés alto.</li>
                <li><b>Resiliencia</b>: cómo toleras y te recuperas del estrés, mirando varios días. Va de menos a más: limitada, suficiente, sólida, fuerte y excepcional.</li>
                <li><b>Recuperación nocturna</b>: lo que te recuperas durmiendo (sueño, pulso en reposo, variabilidad e índice de recuperación).</li>
                <li><b>Recuperación de día</b>: los ratos de calma y quietud durante el día.</li>
                <li><b>Estrés del día</b>: la carga de estrés que acumulaste de día. El factor que esté más bajo es donde conviene poner el foco.</li>
              </ul>
            </Explica>
          </Plegable>

          {/* ---------- Actividad ---------- */}
          <Plegable id="oura-actividad" title={`🚶 Actividad · ${num(d.actividad?.pasos)} pasos`}>
            <div className="oura-kpis">
              <Dato v={num(d.actividad?.pasos)} t="Pasos del día" comp={frente(d.actividad?.pasos, m.pasos, 'pasos')} />
              <Dato v={hm(d.actividad?.sentada_min)} t="Tiempo sentada" />
            </div>
            <div className="oura-kpis">
              <Dato v={hm(d.actividad?.alta_min)} t="Actividad alta" />
              <Dato v={hm(d.actividad?.media_min)} t="Actividad media" />
              <Dato v={hm(d.actividad?.baja_min)} t="Actividad baja" />
            </div>
            {d.actividad?.clase5 && <TiraDia clases={d.actividad.clase5} />}
            <BarrasDias titulo="Pasos, 30 días" puntos={serie(ult, (x) => x.actividad?.pasos)} unidad="pasos" base={0} colorDe={() => 'var(--primary)'} />
            <Explica titulo="¿Cómo clasifica Oura la actividad?">
              <p>Cada 5 minutos, Oura calcula con el movimiento del anillo y tu pulso cuánta energía estás gastando en comparación con estar en reposo, y le pone un nivel:</p>
              <ul>
                <li><b>Actividad baja</b>: moverte por casa, estar de pie, pasear despacio.</li>
                <li><b>Actividad media</b>: lo que te sube el pulso y la respiración pero te deja hablar sin problema; por ejemplo, caminar rápido, la bici suave o la jardinería.</li>
                <li><b>Actividad alta</b>: lo que te deja sin aliento para hablar, como correr.</li>
                <li><b>Tiempo sentada</b>: el tiempo despierta sin moverte, sin contar el sueño. Oura recomienda que no pase de 8 horas al día y moverte al menos 2 minutos cada hora.</li>
              </ul>
              <p>Oura no publica las cifras exactas que separan cada nivel. La franja de «Movimiento del día» te enseña a qué horas te moviste.</p>
            </Explica>
          </Plegable>

          {/* ---------- Respiración ---------- */}
          <Plegable id="oura-respiracion" title={`🫁 Respiración durante el sueño · ${num(d.spo2?.media, 1)} %`}>
            <div className="oura-kpis">
              <Dato v={num(n.resp, 1)} u="/min" t="Respiraciones por minuto mientras duermes" comp={frente(n.resp, m.resp, '/min', 1)} />
              <Dato v={`${num(d.spo2?.media, 1)} %`} t="Oxígeno medio de la noche" />
              <Dato v={num(d.spo2?.alteraciones, 1)} t="Alteraciones de la respiración por hora de sueño" />
            </div>
            <BarrasDias titulo="Oxígeno de la noche, 30 días" puntos={serie(ult, (x) => x.spo2?.media)} unidad="%" dec={1} base={92} lineas={[{ y: 95, texto: '95 %' }]} colorDe={(y) => y >= 95 ? 'var(--green)' : 'var(--amber)'} />
            <Explica>
              <ul>
                <li><b>Respiraciones por minuto</b>: suelen ser muy estables en cada persona. Sube un poco en la fase lútea; una subida clara sin motivo puede anunciar una infección.</li>
                <li><b>Oxígeno de la noche</b>: el porcentaje de oxígeno en la sangre mientras duermes. Lo habitual es 95 % o más.</li>
                <li><b>Alteraciones de la respiración</b>: Oura detecta durante el sueño bajadas del oxígeno que sugieren que la respiración se ha vuelto irregular, y las cuenta por hora de sueño. {d.spo2?.alteraciones != null ? <>«{num(d.spo2.alteraciones, 1)}» quiere decir unas {num(d.spo2.alteraciones, 0)} por cada hora dormida, de media.</> : null}</li>
                <li>Oura las agrupa en pocas, ocasionales o frecuentes, pero no publica las cifras de cada grupo. No equivale al índice de apneas de un estudio del sueño: es una pista. Si salen frecuentes noche tras noche, coméntalo con tu médico.</li>
                <li>Todo lo de este bloque se mide <b>solo por la noche</b>, mientras duermes; de día no se registra.</li>
              </ul>
            </Explica>
          </Plegable>
        </>
      )}
    </div>
  )
}

/** Franja de 00:00 a 04:00, en minutos desde la hora de acostarse. */
function madrugada(dormir: string, n: number) {
  const [h, mi] = dormir.split(':').map(Number)
  const ini = h * 60 + mi
  const desde = ini >= 12 * 60 ? 1440 - ini : -ini
  return { desde, hasta: Math.min(desde + 240, (n - 1) * 5), texto: '00–04 h' }
}
