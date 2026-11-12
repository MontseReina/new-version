/** Ciclo: forma de los datos y cálculos. Sin datos personales: las reglas de cada usuaria son
 *  registros diarios y sus ajustes (fase lútea, ventana crítica) viven en su cuenta. */
import { addDays, diffDays } from '../../lib/dates'

export const FLUJOS = [
  ['ligero', 'Ligero'],
  ['moderado', 'Moderado'],
  ['fuerte', 'Fuerte'],
  ['intenso', 'Intenso'],
] as const
export const MANCHADOS = [
  ['rojo', 'Rojo'],
  ['marron', 'Marrón'],
] as const

/** 'si' = hubo regla, sin detallar la cantidad (reglas pasadas añadidas por fechas). */
export type Flujo = (typeof FLUJOS)[number][0] | 'si'
export type Manchado = (typeof MANCHADOS)[number][0]
export type CicloDia = {
  regla?: Flujo | null
  manchado?: Manchado | null
  coagulos?: boolean | null
  /** Ovulación marcada a mano (solo días anteriores a la 0.21.0; desde entonces la confirma la temperatura de Oura).
   *  Se usa en los ciclos sin subida de temperatura detectada. */
  ovulacion?: boolean | null
}
export type Mapa = { [day: string]: CicloDia }

export type CicloCfg = {
  /** Días entre la ovulación y la regla siguiente. */
  lutea_dias?: number
  /** Ventana crítica premenstrual: cuántos días antes de la regla empieza. 0 = no se marca; sin valor, 7. */
  critica_dias?: number
  /** Duración del ciclo mientras no haya dos reglas registradas. */
  duracion_defecto?: number
}

export const LUTEA_POR_DEFECTO = 14
export const CICLO_POR_DEFECTO = 28
export const REGLA_POR_DEFECTO = 5
/** Ventana crítica premenstrual: días antes de la regla, salvo que los ajustes digan otra cosa. */
export const CRITICA_POR_DEFECTO = 7
/** Días fértiles antes de la ovulación (la ventana incluye el día de la ovulación). */
const FERTIL_ANTES = 5
/** Más de estos días sin regla entre dos días con regla = empieza un ciclo nuevo. */
const SALTO = 9
/** Ciclos fuera de este intervalo no entran en la media (suele ser una regla sin registrar). */
const MIN_CICLO = 15, MAX_CICLO = 45
/** Cuántos ciclos recientes cuentan para la media. */
const ULTIMOS = 6

export interface Regla { inicio: string; fin: string }
export interface Modelo {
  hoy: string
  reglas: Regla[]
  /** Duración de cada ciclo completo, en el mismo orden que `reglas` (uno menos). */
  duraciones: number[]
  /** Duración media del ciclo y cuántos ciclos la sustentan (0 = valor por defecto). */
  media: number
  nMedia: number
  mediaRegla: number
  lutea: number
  critica: number
  /** Días con la ovulación marcada a mano, en orden. */
  ovus: string[]
  /** Días de ovulación confirmados por la subida de temperatura de Oura, en orden. */
  ovusOura: string[]
}

/** Temperatura de una noche (desviación frente a la media, °C); la noche cuenta como el día en que se despierta. */
export type Temp = { day: string; t: number | null }

/** Subida de temperatura (adaptación de la regla «3 por encima de 6» del método sintotérmico):
 *  una noche que supera en 0,05 °C o más a la más alta de las 6 noches anteriores del mismo ciclo,
 *  seguida de dos noches más por encima de esa línea, y la tercera al menos 0,2 °C por encima
 *  (o, si no llega, una cuarta noche por encima). Las noches sin anillo se saltan.
 *  La ovulación real se fecha en la primera noche alta. */
const MARGEN = 5, SUBIDA = 20 // centésimas de grado
const PREVIAS = 6, MIN_PREVIAS = 3, VENTANA_SUBIDA = 7
export function ovulacionesOura(temps: Temp[], reglas: Regla[], hoy: string): string[] {
  const serie = temps.filter((x): x is { day: string; t: number } => typeof x.t === 'number').sort((a, b) => a.day.localeCompare(b.day))
  const out: string[] = []
  reglas.forEach((r, i) => {
    const fin = reglas[i + 1]?.inicio ?? addDays(hoy, 1)
    const xs = serie.filter((p) => p.day >= r.inicio && p.day < fin)
    // La subida no puede empezar con la regla: desde el día siguiente al último de regla y no antes del día 6.
    const desde = addDays(r.fin, 1) > addDays(r.inicio, 5) ? addDays(r.fin, 1) : addDays(r.inicio, 5)
    for (let j = 0; j < xs.length; j++) {
      if (xs[j].day < desde) continue
      const prev = xs.slice(Math.max(0, j - PREVIAS), j)
      if (prev.length < MIN_PREVIAS) continue
      const linea = Math.max(...prev.map((p) => p.t))
      const sobre = (k: number) => Math.round((xs[k].t - linea) * 100)
      const cerca = (k: number) => k < xs.length && diffDays(xs[k].day, xs[j].day) <= VENTANA_SUBIDA
      if (!cerca(j + 2) || sobre(j) < MARGEN || sobre(j + 1) < MARGEN || sobre(j + 2) < MARGEN) continue
      if (sobre(j + 2) >= SUBIDA || (cerca(j + 3) && sobre(j + 3) >= MARGEN)) { out.push(xs[j].day); break }
    }
  })
  return out
}

/** Agrupa los días con regla en reglas. El manchado no abre ciclo. */
export function reglasDe(m: Mapa): Regla[] {
  const out: Regla[] = []
  for (const d of Object.keys(m).filter((k) => m[k]?.regla).sort()) {
    const u = out[out.length - 1]
    if (u && diffDays(d, u.fin) <= SALTO) u.fin = d
    else out.push({ inicio: d, fin: d })
  }
  return out
}

const mediaDe = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)

export function crearModelo(m: Mapa, cfg: CicloCfg, hoy: string, temps: Temp[] = []): Modelo {
  const reglas = reglasDe(m)
  const duraciones = reglas.slice(1).map((r, i) => diffDays(r.inicio, reglas[i].inicio))
  const validas = duraciones.filter((n) => n >= MIN_CICLO && n <= MAX_CICLO).slice(-ULTIMOS)
  // No cuentan para la duración media de la regla ni la que está en curso ni las que solo tienen
  // anotado un día (suele ser solo el inicio).
  const cerradas = reglas.filter((r) => diffDays(hoy, r.fin) > 1 && r.fin > r.inicio).slice(-ULTIMOS)
  return {
    hoy,
    reglas,
    duraciones,
    media: validas.length ? mediaDe(validas) : cfg.duracion_defecto || CICLO_POR_DEFECTO,
    nMedia: validas.length,
    mediaRegla: cerradas.length ? mediaDe(cerradas.map((r) => diffDays(r.fin, r.inicio) + 1)) : REGLA_POR_DEFECTO,
    lutea: cfg.lutea_dias || LUTEA_POR_DEFECTO,
    critica: cfg.critica_dias ?? CRITICA_POR_DEFECTO,
    ovus: Object.keys(m).filter((k) => m[k]?.ovulacion).sort(),
    ovusOura: ovulacionesOura(temps, reglas, hoy),
  }
}

/** Ovulación real entre `desde` (incluido) y `hasta` (sin incluir): la de la temperatura de Oura y,
 *  en los ciclos sin ella, la marcada a mano. */
function ovuEntre(mo: Modelo, desde: string, hasta?: string) {
  const en = (xs: string[]) => xs.filter((d) => d >= desde && (!hasta || d < hasta)).pop()
  return en(mo.ovusOura) ?? en(mo.ovus)
}

/** Regla siguiente esperada para el último ciclo registrado: inicio + duración media.
 *  La ovulación real se enseña al lado, pero no mueve la previsión. */
function siguienteEsperada(mo: Modelo, r: Regla) {
  return addDays(r.inicio, mo.media)
}

export interface Ciclo {
  inicio: string
  /** Primer día del ciclo siguiente (real si ya está registrado, previsto si no). */
  siguiente: string
  finRegla: string
  /** Ovulación con la que se cuentan las fases: la real si la hay; si no, la aproximada. */
  ovulacion: string
  /** Hay ovulación real (subida de temperatura de Oura). */
  ovuConfirmada: boolean
  /** Ovulación aproximada (proyección): regla siguiente − fase lútea. */
  ovuAprox: string
  /** Ovulación real, por la subida de temperatura de Oura. */
  ovuReal: string | null
  /** El ciclo entero es una previsión: su regla de inicio aún no ha llegado. */
  previsto: boolean
  /** El inicio del ciclo siguiente es una previsión. */
  siguientePrevisto: boolean
}

/** Días de retraso de la regla respecto a la previsión (0 si no hay retraso). */
export function retraso(mo: Modelo): number {
  const u = mo.reglas[mo.reglas.length - 1]
  return u ? Math.max(0, diffDays(mo.hoy, siguienteEsperada(mo, u))) : 0
}

/** Ciclo al que pertenece una fecha. `null` si es anterior a la primera regla registrada. */
export function cicloDe(mo: Modelo, date: string): Ciclo | null {
  const { reglas, media, mediaRegla, lutea, hoy } = mo
  if (!reglas.length || date < reglas[0].inicio) return null
  let i = reglas.length - 1
  while (reglas[i].inicio > date) i--
  const r = reglas[i]
  const con = (c: Omit<Ciclo, 'ovulacion' | 'ovuConfirmada' | 'ovuAprox' | 'ovuReal'>): Ciclo => {
    const ov = c.previsto ? undefined : ovuEntre(mo, c.inicio, c.siguientePrevisto ? undefined : c.siguiente)
    const aprox = addDays(c.siguiente, -lutea)
    return { ...c, ovulacion: ov ?? aprox, ovuConfirmada: !!ov, ovuAprox: aprox, ovuReal: ov ?? null }
  }
  if (i < reglas.length - 1) return con({ inicio: r.inicio, siguiente: reglas[i + 1].inicio, finRegla: r.fin, previsto: false, siguientePrevisto: false })
  // Último ciclo real: si la regla prevista ya debería haber llegado, se espera para hoy.
  let sig = siguienteEsperada(mo, r)
  if (sig < hoy) sig = hoy
  if (date < sig) {
    const enCurso = diffDays(hoy, r.fin) <= 1
    const finPrevisto = addDays(r.inicio, mediaRegla - 1)
    return con({ inicio: r.inicio, siguiente: sig, finRegla: enCurso && finPrevisto > r.fin ? finPrevisto : r.fin, previsto: false, siguientePrevisto: true })
  }
  let s = sig
  while (date >= addDays(s, media)) s = addDays(s, media)
  return con({ inicio: s, siguiente: addDays(s, media), finRegla: addDays(s, mediaRegla - 1), previsto: true, siguientePrevisto: true })
}

export type Fase = 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea'
export const FASES: { [k in Fase]: string } = { menstrual: 'Fase menstrual', folicular: 'Fase folicular', ovulatoria: 'Fase ovulatoria', lutea: 'Fase lútea' }

export interface InfoDia {
  ciclo: Ciclo
  /** Día del ciclo, empezando en 1. */
  dia: number
  fase: Fase
  /** Regla esperada y todavía no registrada. */
  reglaPrevista: boolean
  fertil: boolean
  /** Día de la ovulación con la que se cuentan las fases (real o, sin ella, aproximada). */
  ovulacion: boolean
  /** Día de la ovulación aproximada (punto blanco) y de la real (punto negro). */
  ovuAprox: boolean
  ovuReal: boolean
  critica: boolean
}

export function infoDia(mo: Modelo, m: Mapa, date: string): InfoDia | null {
  const c = cicloDe(mo, date)
  if (!c) return null
  const fertilDesde = addDays(c.ovulacion, -FERTIL_ANTES)
  const enRegla = date <= c.finRegla
  const fase: Fase = enRegla ? 'menstrual' : date < fertilDesde ? 'folicular' : date <= c.ovulacion ? 'ovulatoria' : 'lutea'
  return {
    ciclo: c,
    dia: diffDays(date, c.inicio) + 1,
    fase,
    reglaPrevista: enRegla && !m[date]?.regla && date >= mo.hoy,
    fertil: fase === 'ovulatoria',
    ovulacion: date === c.ovulacion,
    ovuAprox: date === c.ovuAprox,
    ovuReal: date === c.ovuReal,
    critica: mo.critica > 0 && date >= addDays(c.siguiente, -mo.critica) && date < c.siguiente,
  }
}

/** Días del mes `AAAA-MM` en semanas de lunes a domingo; `null` = hueco. */
export function semanasDelMes(mes: string): (string | null)[] {
  const primero = mes + '-01'
  const hueco = (new Date(primero + 'T12:00:00').getDay() + 6) % 7
  const out: (string | null)[] = Array(hueco).fill(null)
  for (let d = primero; d.slice(0, 7) === mes; d = addDays(d, 1)) out.push(d)
  while (out.length % 7) out.push(null)
  return out
}
export function sumaMeses(mes: string, n: number) {
  const d = new Date(mes + '-15T12:00:00')
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** Evaluación de los ciclos completos: duración media, más corto y más largo, variación respecto a la media
 *  (cuánto se acorta o se alarga) y duración promedio de la menstruación. */
export function evaluacion(mo: Modelo) {
  const validos = mo.duraciones.filter((n) => n >= MIN_CICLO && n <= MAX_CICLO)
  const corto = validos.length ? Math.min(...validos) : null
  const largo = validos.length ? Math.max(...validos) : null
  return {
    validos,
    corto,
    largo,
    /** Días que el ciclo más corto se adelanta a la media y días que el más largo se retrasa. */
    adelanto: corto != null && mo.nMedia ? Math.max(0, mo.media - corto) : null,
    retrasoMax: largo != null && mo.nMedia ? Math.max(0, largo - mo.media) : null,
  }
}
export const nombreMes = (mes: string) => new Date(mes + '-15T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
/** Todos los días de `desde` a `hasta`, ambos incluidos. */
export function rango(desde: string, hasta: string) {
  const out: string[] = []
  for (let d = desde; d <= hasta; d = addDays(d, 1)) out.push(d)
  return out
}
