import { addDays, diffDays } from '../../lib/dates'
import type { Fase } from '../ciclo/logica'
import { fechaLarga, horaMas, hm, letraDia } from './graficos'
import { FACTORES_DISPOSICION, type FactorDisposicion, type OuraDia } from './tipos'

/**
 * Lecturas escritas a partir de los datos de Oura: comparaciones con su propia media y patrones.
 * Son orientativas: describen lo que se ve en los números, no diagnostican.
 */

type Fila = { day: string; value: OuraDia }
const num = (v: number, dec = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const sg = (v: number, dec = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), dec)
function media(xs: (number | null | undefined)[]) {
  const ok = xs.filter((x): x is number => x != null)
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null
}
/** Valores de los `dias` anteriores a `date` (sin contarlo). */
function antes(porDia: Record<string, OuraDia>, date: string, dias: number, f: (d: OuraDia) => number | null | undefined) {
  const r: number[] = []
  for (let i = 1; i <= dias; i++) { const v = porDia[addDays(date, -i)]; const y = v && f(v); if (y != null) r.push(y) }
  return r
}
const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`)

/** Minuto (desde que se durmió) en el que el pulso de la noche llega a su punto más bajo. */
export function minutoFcMinima(d: OuraDia) {
  const fc = d.noche?.fc5
  if (!fc?.length) return null
  let iMin = -1, vMin = Infinity
  fc.forEach((v, i) => { if (v != null && v < vMin) { vMin = v; iMin = i } })
  return iMin < 0 ? null : { min: iMin * 5, total: (fc.length - 1) * 5 }
}

/** El dato real que hay detrás de cada factor de la disposición, con su media de la última semana. */
export function detallesDisposicion(porDia: Record<string, OuraDia>, date: string): Partial<Record<FactorDisposicion, string>> {
  const d = porDia[date] ?? {}
  const n = d.noche ?? {}
  const m7 = (f: (x: OuraDia) => number | null | undefined) => media(antes(porDia, date, 7, f))
  const m14 = (f: (x: OuraDia) => number | null | undefined) => media([f(d), ...antes(porDia, date, 13, f)])
  const out: Partial<Record<FactorDisposicion, string>> = {}
  const vfc7 = m7((x) => x.noche?.vfc_media), fc7 = m7((x) => x.noche?.fc_min), t7 = m7((x) => x.disposicion?.temp_desv), h7 = m7((x) => x.noche?.total_min)
  if (n.vfc_media != null) out.vfc = `Hoy ${num(n.vfc_media)} ms${vfc7 != null ? ` · media de la última semana ${num(vfc7)} ms` : ''}`
  if (n.fc_min != null) out.fc_reposo = `Hoy ${num(n.fc_min)} lpm${fc7 != null ? ` · media de la última semana ${num(fc7)} lpm` : ''}`
  if (d.disposicion?.temp_desv != null) out.temperatura = `Hoy ${sg(d.disposicion.temp_desv, 2)} °C${t7 != null ? ` · media de la última semana ${sg(t7, 2)} °C` : ''}`
  const r = minutoFcMinima(d)
  if (r && n.dormir) out.recuperacion = `Tu pulso llegó a su mínimo a las ${horaMas(n.dormir, r.min)}, ${hm(r.min)} después de dormirte (${r.min <= r.total / 2 ? 'en la primera mitad de la noche, lo deseable' : 'en la segunda mitad: tardó en bajar'})`
  if (n.total_min != null) out.noche_anterior = `Dormiste ${hm(n.total_min)}${h7 != null ? ` · media de la última semana ${hm(h7)}` : ''}`
  const h14 = m14((x) => x.noche?.total_min)
  if (h14 != null) out.equilibrio_sueno = `Media de las dos últimas semanas: ${hm(h14)} por noche`
  const ayer = porDia[addDays(date, -1)]?.actividad
  if (ayer?.pasos != null) out.actividad_anterior = `Ayer: ${num(ayer.pasos)} pasos${ayer.sentada_min != null ? ` y ${hm(ayer.sentada_min)} sentada` : ''}`
  const p14 = m14((x) => x.actividad?.pasos)
  if (p14 != null) out.equilibrio_actividad = `Media de las dos últimas semanas: ${num(Math.round(p14))} pasos al día`
  return out
}

const CONSEJO: Record<FactorDisposicion, string> = {
  vfc: 'La variabilidad viene baja: tu sistema nervioso sigue en modo alerta. Ayudan las cenas tempranas, evitar el alcohol, la respiración lenta antes de dormir y no acumular dobletes sin descanso.',
  fc_reposo: 'El pulso en reposo está por encima de lo tuyo: suele pasar con estrés, falta de sueño, cenas tardías o copiosas, deshidratación o el inicio de una infección.',
  temperatura: 'La temperatura se sale de tu rango: mira si coincide con la fase lútea; si no, puede anunciar una infección.',
  recuperacion: 'Tu pulso tarda en bajar por la noche: cenar antes y más ligero, evitar pantallas y ejercicio intenso a última hora ayuda a que baje antes.',
  noche_anterior: 'Las últimas noches han sido flojas: es el factor que más pesa en la disposición del día siguiente.',
  equilibrio_sueno: 'Arrastras falta de sueño de las dos últimas semanas: adelantar la hora de acostarte unos días ayuda a recuperarla.',
  actividad_anterior: 'El día anterior pesa: mucho tiempo sentada o un esfuerzo grande bajan la disposición del día siguiente.',
  equilibrio_actividad: 'La carga de actividad de las dos últimas semanas no está equilibrada con el descanso.',
}

/** Observación sobre la disposición de la última semana frente a las semanas anteriores. */
export function observacionDisposicion(filas: Fila[], date: string, fase: Fase | null) {
  const sem = filas.filter((r) => r.day > addDays(date, -7) && r.day <= date && r.value.disposicion?.puntuacion != null)
  const prev = filas.filter((r) => r.day > addDays(date, -30) && r.day <= addDays(date, -7) && r.value.disposicion?.puntuacion != null)
  if (sem.length < 3) return null
  const mSem = media(sem.map((r) => r.value.disposicion!.puntuacion))!
  const mPrev = media(prev.map((r) => r.value.disposicion!.puntuacion))
  const bajos = sem.filter((r) => r.value.disposicion!.puntuacion! < 70).length
  const texto: string[] = []
  const nivel = mSem >= 85 ? 'óptima' : mSem >= 70 ? 'buena' : 'baja, por debajo de 70'
  texto.push(`En la última semana tu disposición media es de ${num(mSem)}: ${nivel}${mPrev != null ? `, ${Math.abs(mSem - mPrev) < 2 ? 'parecida a' : mSem > mPrev ? `${num(mSem - mPrev)} puntos por encima de` : `${num(mPrev - mSem)} puntos por debajo de`} las semanas anteriores (${num(mPrev)})` : ''}. ${bajos ? `${dias(bajos)} de 7 estuvo por debajo de 70.` : 'Ningún día bajó de 70.'}`)
  // Los dos factores más bajos de la semana.
  const medias = FACTORES_DISPOSICION.map(([k, t]) => ({ k, t, v: media(sem.map((r) => r.value.disposicion?.factores?.[k])) }))
    .filter((x): x is { k: FactorDisposicion; t: string; v: number } => x.v != null).sort((a, b) => a.v - b.v)
  const flojos = medias.filter((x) => x.v < 80).slice(0, 2)
  if (flojos.length) texto.push(`Lo que más la está bajando: ${flojos.map((x) => `${x.t.toLowerCase()} (${num(x.v)})`).join(' y ')}.`)
  const consejos = flojos.map((x) => CONSEJO[x.k])
  if (fase === 'lutea' || fase === 'menstrual') consejos.push('Estás en fase lútea o con la regla: es habitual que la variabilidad baje y el pulso y la temperatura suban, así que la disposición suele bajar unos puntos. Compárala con la misma fase de otros ciclos.')
  if (mSem < 70) consejos.push('Con la disposición por debajo de 70 varios días seguidos, conviene priorizar el descanso y bajar la intensidad del ejercicio hasta que se recupere.')
  return { texto, consejos }
}

/** Subida de temperatura: noches seguidas por encima de la media hasta el día que se mira. */
export function subidaTemperatura(filas: Fila[], date: string, ovulacion: string | null, fase: Fase | null) {
  const UMBRAL = 0.15
  const serie = filas.filter((r) => r.day <= date && r.value.disposicion?.temp_desv != null)
  let i = serie.length - 1
  while (i >= 0 && serie[i].value.disposicion!.temp_desv! >= UMBRAL) i--
  const noches = serie.length - 1 - i
  if (noches < 3) {
    if (fase === 'lutea' && ovulacion && diffDays(date, ovulacion) >= 4) {
      return { inicio: null, texto: [`Estás en fase lútea, pero la temperatura todavía no se mantiene por encima de tu media. Puede que la ovulación haya llegado más tarde de lo calculado o que este ciclo no haya habido ovulación; mira cómo sigue los próximos días.`] }
    }
    return { inicio: null, texto: [noches ? `La temperatura lleva ${dias(noches)} por encima de tu media: aún es pronto para hablar de subida (se necesitan al menos 3 noches seguidas).` : 'La temperatura está en tu media o por debajo: es lo esperable en la fase folicular.'] }
  }
  const inicio = serie[i + 1].day
  const texto = [`La temperatura empezó a subir el ${fechaLarga(inicio)} y lleva ${dias(noches)} seguidas por encima de tu media.`]
  if (ovulacion) {
    const tras = diffDays(inicio, ovulacion)
    if (tras >= -1 && tras <= 4) texto.push(`Coincide con la ovulación (prevista el ${fechaLarga(ovulacion)}): la subida llegó ${tras <= 0 ? 'el mismo día' : `${dias(tras)} después`}, lo que confirma la ovulación. Llevas ${dias(diffDays(date, ovulacion))} desde que ovulaste; lo normal es que siga alta hasta la regla.`)
    else texto.push(`No coincide con la ovulación prevista (${fechaLarga(ovulacion)}). Si no hay otra explicación, mira si puede deberse a una infección, alcohol, cenas tardías o noches de calor.`)
  }
  return { inicio, texto }
}

/** Valoración de la variabilidad de una noche. */
export function valoracionVfcNoche(porDia: Record<string, OuraDia>, date: string) {
  const d = porDia[date]
  const n = d?.noche
  if (!n?.vfc_media) return []
  const m7 = media(antes(porDia, date, 7, (x) => x.noche?.vfc_media))
  const m30 = media(antes(porDia, date, 30, (x) => x.noche?.vfc_media))
  const out: string[] = []
  if (m7 != null && m30 != null) {
    const p = Math.round((100 * (n.vfc_media - m30)) / m30)
    out.push(`Esta noche tu variabilidad media fue de ${num(n.vfc_media)} ms, ${Math.abs(p) < 5 ? 'en tu rango habitual' : p > 0 ? `un ${p} % por encima de tu media de 30 días` : `un ${-p} % por debajo de tu media de 30 días`} (${num(m30)} ms; la de la última semana, ${num(m7)} ms).`)
  }
  const v = n.vfc5?.filter((x): x is number => x != null) ?? []
  if (v.length > 12) {
    const mitad = Math.floor(v.length / 2)
    const a = media(v.slice(0, mitad))!, b = media(v.slice(mitad))!
    const iMax = n.vfc5!.indexOf(Math.max(...v))
    out.push(`Fue más alta en la ${a >= b ? 'primera' : 'segunda'} mitad de la noche (${num(a)} frente a ${num(b)} ms) y llegó a su máximo hacia las ${horaMas(n.dormir!, iMax * 5)}. Suele ser más alta en el sueño profundo, que se concentra al principio; si se queda baja toda la noche o cae de madrugada, el cuerpo ha seguido en modo alerta.`)
  }
  const r = minutoFcMinima(d)
  if (r) out.push(r.min <= r.total / 2 ? 'El pulso llegó a su mínimo en la primera mitad de la noche: buena señal de recuperación.' : 'El pulso tardó en llegar a su mínimo (segunda mitad de la noche): la recuperación empezó tarde, algo que suele pasar con cenas tardías, alcohol, estrés o en la fase lútea.')
  return out
}

/** Valoración de la variabilidad de los últimos 30 días: tendencia, días bajos, día de la semana y fase del ciclo. */
export function valoracionVfc30(filas: Fila[], date: string, faseDe: (day: string) => Fase | null) {
  const s = filas.filter((r) => r.day > addDays(date, -30) && r.day <= date && r.value.noche?.vfc_media != null).map((r) => ({ day: r.day, y: r.value.noche!.vfc_media! }))
  if (s.length < 10) return []
  const m = media(s.map((p) => p.y))!
  const sd = Math.sqrt(media(s.map((p) => (p.y - m) ** 2))!)
  const sem = media(s.slice(-7).map((p) => p.y))!
  const out: string[] = []
  const dif = Math.round((100 * (sem - m)) / m)
  out.push(`Tu media de 30 días es de ${num(m)} ms. La última semana va ${Math.abs(dif) < 5 ? 'en esa línea' : dif > 0 ? `un ${dif} % por encima: te estás recuperando mejor` : `un ${-dif} % por debajo: tu cuerpo está más cargado que de costumbre`} (${num(sem)} ms).`)
  const bajos = s.filter((p) => p.y < m - sd)
  if (bajos.length) out.push(`${dias(bajos.length)} de 30 tuviste la variabilidad claramente baja (por debajo de ${num(m - sd)} ms): ${bajos.length > 4 ? 'las últimas, ' : ''}${bajos.slice(-4).map((p) => fechaLarga(p.day)).join(', ')}.`)
  // Día de la semana con la variabilidad más baja.
  const porLetra: Record<string, number[]> = {}
  s.forEach((p) => { (porLetra[letraDia(p.day)] ??= []).push(p.y) })
  const NOMBRE: Record<string, string> = { L: 'lunes', M: 'martes', X: 'miércoles', J: 'jueves', V: 'viernes', S: 'sábados', D: 'domingos' }
  const ranking = Object.entries(porLetra).map(([k, ys]) => ({ k, v: media(ys)! })).sort((a, b) => a.v - b.v)
  if (ranking.length >= 5 && m - ranking[0].v > 2) out.push(`Los días que despiertas en ${NOMBRE[ranking[0].k]}${ranking[1] && m - ranking[1].v > 2 ? ` y ${NOMBRE[ranking[1].k]}` : ''} tu variabilidad es más baja (${num(ranking[0].v)} ms): mira qué pasa el día anterior (turnos, doblete, cenas, ejercicio).`)
  // Fase del ciclo.
  const fol = media(s.filter((p) => { const f = faseDe(p.day); return f === 'folicular' || f === 'ovulatoria' }).map((p) => p.y))
  const lut = media(s.filter((p) => { const f = faseDe(p.day); return f === 'lutea' || f === 'menstrual' }).map((p) => p.y))
  if (fol != null && lut != null) out.push(`En la fase folicular tu media es de ${num(fol)} ms y en la lútea y la regla, de ${num(lut)} ms. ${lut < fol - 2 ? 'Es habitual que baje después de ovular, por la progesterona: por eso conviene comparar cada noche con la misma fase de otros ciclos.' : 'En tu caso apenas cambia con el ciclo.'}`)
  out.push('Cuando haya episodios registrados en Disautonomía, aquí se compararán tus noches anteriores a cada episodio con tu media de la misma fase.')
  return out
}
