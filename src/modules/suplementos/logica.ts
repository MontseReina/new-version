/** Suplementos: forma de los datos y cálculos. La lista de cada usuaria vive en sus ajustes
 *  (base de datos), nunca en el código. */
import { addDays, diffDays } from '../../lib/dates'

export const MOMENTOS = [
  ['ayunas', 'Ayunas'],
  ['desayuno', 'Desayuno'],
  ['media_manana', 'Media mañana'],
  ['comida', 'Comida'],
  ['media_tarde', 'Media tarde'],
  ['cena', 'Cena'],
  ['noche', 'Después de cenar'],
] as const

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
export const VIAS = ['Oral', 'Sublingual', 'Tópica', 'Endovenosa', 'Intramuscular', 'Otra'] as const

export type Producto = {
  id: string
  nombre: string
  marca?: string
  composicion?: string
  dosis?: string
  pautado_por?: string
  nota?: string
  /** Momentos del día en que se toma. Vacío junto con `cada_dias` = toma periódica. */
  momentos?: string[]
  /** Días de la semana (0 = lunes … 6 = domingo). Vacío = todos. */
  dias?: number[]
  via?: string
  inicio?: string
  /** Si no es diario: cada cuántos días toca. */
  cada_dias?: number
  /** Fecha desde la que deja de aparecer. No se borra: el historial se conserva. */
  retirado?: string
  /** Por qué se dejó de tomar (cajón «Suplementos out»). */
  motivo_retirada?: string
  /** Administración en fechas concretas, puestas a mano (sueroterapia, inyecciones…).
   *  Si existe la lista, aunque esté vacía, el producto no cuenta en las tomas diarias. */
  fechas?: string[]
  /** Pautas anteriores: cada una valió para los días anteriores a `hasta`. */
  historial?: Pauta[]
}
export type Pauta = { hasta: string; momentos?: string[]; dias?: number[]; dosis?: string }
export type SuplCfg = { lista?: Producto[] }

export type Toma = 'si' | 'no' | 'np'
/** Claves: `<id>:<momento>` para las tomas del día, `<id>` para las periódicas. */
export type SuplDia = { tomas?: { [clave: string]: Toma } }

const diaSemana = (date: string) => (new Date(date + 'T12:00:00').getDay() + 6) % 7

export const vigente = (p: Producto, date: string) => (!p.retirado || date < p.retirado) && (!p.inicio || date >= p.inicio)
export const esAgendado = (p: Producto) => Array.isArray(p.fechas)
export const esPeriodico = (p: Producto) => !!p.cada_dias && !esAgendado(p)

/** El producto con la pauta (momentos, días y dosis) que tenía en una fecha. */
export function enFecha(p: Producto, date: string): Producto {
  const v = (p.historial ?? []).filter((h) => h.hasta > date).sort((a, b) => a.hasta.localeCompare(b.hasta))[0]
  return v ? { ...p, momentos: v.momentos, dias: v.dias, dosis: v.dosis } : p
}
const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const lista = <T,>(x?: T[]) => (x?.length ? [...x].sort() : null)
export const mismaPauta = (a: Producto, b: Producto) =>
  igual(lista(a.momentos), lista(b.momentos)) && igual(lista(a.dias), lista(b.dias)) && (a.dosis ?? '') === (b.dosis ?? '')
/** Guarda un cambio de pauta que vale desde `desde`: los días anteriores conservan la que tenían.
 *  Sin `desde` el cambio vale para todos los días (corrección de un error). */
export function conCambio(antes: Producto, ahora: Producto, desde?: string): Producto {
  if (!desde) { const { historial: _h, ...resto } = ahora; return resto }
  const previas = (antes.historial ?? []).filter((h) => h.hasta <= desde)
  if (!previas.some((h) => h.hasta === desde)) {
    const v = enFecha(antes, addDays(desde, -1))
    previas.push({ hasta: desde, ...(v.momentos?.length ? { momentos: v.momentos } : {}), ...(v.dias?.length ? { dias: v.dias } : {}), ...(v.dosis ? { dosis: v.dosis } : {}) })
  }
  return { ...ahora, historial: previas }
}

const orden = (p: Producto) => {
  const idx = MOMENTOS.map(([k], i) => (p.momentos?.includes(k) ? i : -1)).filter((i) => i >= 0)
  return idx.length ? idx : [MOMENTOS.length]
}
/** De ayunas a después de cenar, por el primer momento de cada producto; «a demanda», al final. */
export function porMomento(l: Producto[]): Producto[] {
  return l.map((p, i) => ({ p, i, o: orden(p) })).sort((a, b) => {
    for (let k = 0; k < Math.max(a.o.length, b.o.length); k++) {
      const d = (a.o[k] ?? -1) - (b.o[k] ?? -1)
      if (d) return d
    }
    return a.i - b.i
  }).map((x) => x.p)
}

/** Productos con tomas pautadas ese día, con la pauta de ese día y ordenados por momento. */
export const delDia = (l: Producto[], date: string) =>
  porMomento(l.filter((p) => vigente(p, date) && !esPeriodico(p) && !esAgendado(p)).map((p) => enFecha(p, date)).filter((p) => !p.dias?.length || p.dias.includes(diaSemana(date))))
const sinRetirar = (p: Producto, date: string) => !p.retirado || date < p.retirado
/** Terapia endovenosa: lo que va en fechas puestas a mano y lo endovenoso «cada cierto número de días».
 *  Sale aunque su inicio sea futuro: así se ve cuándo empieza. */
export const enTerapia = (p: Producto) => esAgendado(p) || (esPeriodico(p) && p.via === 'Endovenosa')
export const terapia = (l: Producto[], date: string) => l.filter((p) => sinRetirar(p, date) && enTerapia(p))
/** Lo demás que va cada cierto número de días (también con inicio futuro). */
/** Lo diario que ya está dado de alta pero empieza más adelante: por fecha de inicio. */
export const futuros = (l: Producto[], date: string) =>
  porMomento(l.filter((p) => sinRetirar(p, date) && !esPeriodico(p) && !esAgendado(p) && !!p.inicio && p.inicio > date)).sort((a, b) => a.inicio!.localeCompare(b.inicio!))
/** «Suplementos out»: lo retirado hasta esa fecha, lo último retirado primero. */
export const retirados = (l: Producto[], date: string) =>
  l.filter((p) => !!p.retirado && p.retirado <= date).sort((a, b) => b.retirado!.localeCompare(a.retirado!) || a.nombre.localeCompare(b.nombre))
export const periodicos = (l: Producto[], date: string) => l.filter((p) => sinRetirar(p, date) && esPeriodico(p) && !enTerapia(p))
/** Con cuántos días de antelación se avisa de la terapia endovenosa. */
export const AVISO_DIAS = 7
/** Último día marcado como hecho de cada producto que no es diario. */
export type Ultimas = { [id: string]: string | undefined }
export function ultimasDe(historia: { day: string; value: SuplDia }[], d: SuplDia, date: string): Ultimas {
  const out: Ultimas = {}
  for (const r of historia) if (r.day < date) for (const [k, v] of Object.entries(r.value.tomas ?? {})) if (v === 'si' && !k.includes(':')) out[k] = r.day
  for (const [k, v] of Object.entries(d.tomas ?? {})) if (v === 'si' && !k.includes(':')) out[k] = date
  return out
}
/** Próxima vez que toca desde `date`: la fecha puesta o, si va cada N días, la última hecha + N
 *  (sin ninguna hecha, el inicio). Si ya tocaba, `date`. */
export function proximaDe(p: Producto, date: string, ultima?: string): string | null {
  if (esAgendado(p)) return proxima(p, date)
  if (!p.cada_dias) return null
  const f = ultima ? addDays(ultima, p.cada_dias) : p.inicio ?? date
  return f < date ? date : f
}
/** Terapia endovenosa entre `date` y los días de aviso, sin marcar ese día: producto y días que faltan. */
export function avisosDe(l: Producto[], d: SuplDia, date: string, ultimas: Ultimas = {}) {
  return terapia(l, date).flatMap((p) => {
    const f = proximaDe(p, date, ultimas[p.id])
    const faltan = f ? diffDays(f, date) : null
    return faltan != null && faltan <= AVISO_DIAS && !d.tomas?.[p.id] ? [{ p, faltan }] : []
  })
}
export const enDias = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`)
/** Primera fecha puesta desde `date` (incluida), o `null`. */
export const proxima = (p: Producto, date: string) => [...(p.fechas ?? [])].sort().find((f) => f >= date) ?? null

const y = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1] : xs[0] ?? '')
export const momentosTxt = (p: Producto) => (p.momentos?.length ? y(MOMENTOS.filter(([k]) => p.momentos!.includes(k)).map(([, l]) => l.toLowerCase())) : 'a demanda')
const diasTxt = (p: Producto) => (p.dias?.length && p.dias.length < 7 ? y(p.dias.map((i) => DIAS[i])) : 'todos los días')
export type Cambio = { p: Producto; tipo: 'empieza' | 'cambia' | 'termina'; texto: string }
/** Lo diario que empieza, cambia de dosis, de número de tomas, de momento o de días, o se deja, justo en `date`. */
export function cambiosDe(l: Producto[], date: string): Cambio[] {
  const ayer = addDays(date, -1)
  return l.filter((p) => !esPeriodico(p) && !esAgendado(p)).flatMap((p): Cambio[] => {
    if (p.retirado === date) return [{ p, tipo: 'termina', texto: 'lo dejas desde hoy.' }]
    if (!vigente(p, date)) return []
    const hoy = enFecha(p, date)
    if (p.inicio === date) return [{ p, tipo: 'empieza', texto: `empiezas${hoy.dosis ? `, ${hoy.dosis}` : ''}, en ${momentosTxt(hoy)}.` }]
    const antes = enFecha(p, ayer)
    if (mismaPauta(antes, hoy)) return []
    const partes: string[] = []
    if ((antes.dosis ?? '') !== (hoy.dosis ?? '')) partes.push(`la dosis pasa de ${antes.dosis || 'sin indicar'} a ${hoy.dosis || 'sin indicar'}`)
    const na = momentosDe(antes).length, nh = momentosDe(hoy).length
    if (na !== nh) partes.push(`pasa de ${na} a ${nh} ${nh === 1 ? 'toma' : 'tomas'} al día (${momentosTxt(hoy)})`)
    else if (momentosTxt(antes) !== momentosTxt(hoy)) partes.push(`pasa de ${momentosTxt(antes)} a ${momentosTxt(hoy)}`)
    if (diasTxt(antes) !== diasTxt(hoy)) partes.push(`ahora va ${diasTxt(hoy) === 'todos los días' ? 'todos los días' : 'los ' + diasTxt(hoy)}`)
    return [{ p, tipo: 'cambia', texto: partes.join('; ') + '.' }]
  })
}

export const clave = (p: Producto, momento: string) => p.id + ':' + momento
/** Sin momentos marcados se trata como una sola toma «a demanda». */
export const momentosDe = (p: Producto) => (p.momentos?.length ? p.momentos : ['demanda'])

/** Hechas sobre pautadas; las «no precisa» no cuentan como pautadas. */
export function cumplimiento(lista: Producto[], d: SuplDia, date: string) {
  const t = d.tomas ?? {}
  const claves = delDia(lista, date).flatMap((p) => momentosDe(p).map((m) => clave(p, m)))
  const pautadas = claves.filter((k) => t[k] !== 'np').length
  const hechas = claves.filter((k) => t[k] === 'si').length
  const marcadas = claves.filter((k) => t[k]).length
  return { pautadas, hechas, marcadas, total: claves.length, pct: pautadas ? hechas / pautadas : 0 }
}
export const nivel = (pct: number) => (pct >= 0.9 ? 'verde' : pct >= 0.6 ? 'amarillo' : 'rojo') as 'verde' | 'amarillo' | 'rojo'
export const diasDesde = (date: string, ultima: string | null) => (ultima ? diffDays(date, ultima) : null)
