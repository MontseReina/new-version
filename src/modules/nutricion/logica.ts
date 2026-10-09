/** Nutrición: forma de los datos y cálculos. Sin datos personales: menús, platos, horarios y
 *  objetivos de cada usuaria viven en sus ajustes (base de datos), no en el código. */

import { addDays, diffDays, fmtDate } from '../../lib/dates'
import type { InfoDia } from '../ciclo/logica'
import type { HidraDia } from '../hidratacion/logica'

export type MenuId = 'folicular' | 'luteo'
export const MENUS: { [k in MenuId]: string } = { folicular: 'Menú folicular', luteo: 'Menú lúteo' }

export type TomaDef = {
  id: string
  nombre: string
  /** Hora prevista (HH:MM) y, si es un intervalo, hasta cuándo. */
  hora?: string
  hasta?: string
  /** Comida principal: guarda también la hora de fin y cuenta para la regla del agua. */
  principal?: boolean
  /** Lleva el plato dibujado (verdura, proteína e hidratos). */
  plato?: boolean
  /** Lo que va después del primer plato es postre y se marca aparte: tomado o no tomado. */
  postre?: boolean
}
export type Plato = { nombre: string; kcal?: number; calcio_mg?: number; etiquetas?: string[] }
/** Un plato del menú: su id o, si alterna por semanas del ciclo, el id y la semana (1 o 2). */
export type Ref = string | { id: string; semana?: number }
export type MenuDia = { [toma: string]: Ref[] }
export type Menu = {
  /** `semana`: siete días, de lunes a domingo, que se repiten. `fase`: un día tras otro desde el inicio de la fase. */
  tipo: 'semana' | 'fase'
  dias: MenuDia[]
  nota?: string
}
/** Aviso fijo para ciertos días de la semana (lunes = 0). */
export type Aviso = { dias_semana: number[]; texto: string }

export type NutriCfg = {
  /** Mínimo diario pautado por nutrición clínica. Sin cifra = «sin fijar». */
  kcal_min?: number | null
  cena_fin_max?: string
  ayuno_max_h?: number
  agua_margen?: { antes_min?: number; despues_min?: number }
  tomas?: TomaDef[]
  platos?: { [id: string]: Plato }
  menus?: { [k in MenuId]?: Menu }
  avisos?: Aviso[]
}

export type Estado = 'entera' | 'tres_cuartos' | 'media' | 'no'
export const ESTADOS: [Estado, string][] = [['entera', 'Entera'], ['tres_cuartos', '¾'], ['media', 'Media'], ['no', 'No']]
/** Plato dibujado: cuánto había de cada parte. 0 nada · 1 poca · 2 la parte que toca · 3 (solo hidratos) más de la que toca. */
export type PlatoDia = { veg?: number | null; prot?: number | null; hid?: number | null }

export type TomaDia = {
  estado?: Estado | null
  /** Hora a la que empieza y, en las principales, a la que termina (HH:MM). */
  ini?: string | null
  fin?: string | null
  /** Lo que tocaba al registrarla, para que un cambio de menú no reescriba los días pasados. */
  platos?: string[]
  nombres?: string[]
  /** Lo que ha tomado si no era lo del menú, con sus palabras. */
  otro?: string | null
  plato?: PlatoDia
  /** Postres de la toma, por id de plato: `si` tomado, `no` no tomado. */
  postre?: { [id: string]: 'si' | 'no' | null }
}
export type NutriDia = {
  menu?: MenuId | null
  tomas?: { [id: string]: TomaDia }
}

export const CENA_MAX_POR_DEFECTO = '21:00'
export const AYUNO_MAX_POR_DEFECTO = 12
export const AGUA_ANTES_POR_DEFECTO = 30
export const AGUA_DESPUES_POR_DEFECTO = 60
/** Margen tras la hora prevista antes de dar una toma por pendiente. */
export const GRACIA_MIN = 30

export type Nivel = 'verde' | 'amarillo' | 'rojo'

// ---------- Horas ----------
export const aMin = (h?: string | null): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
export const aHora = (min: number) => {
  const x = ((Math.round(min) % 1440) + 1440) % 1440
  return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0')
}
export const duracion = (min: number) => `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`

// ---------- Menú del día ----------
export interface MenuHoy { id: MenuId; menu: Menu | null; porque: string; indice: number; semana: number }

/** Qué menú toca un día y por qué. Folicular desde la regla hasta la ovulación; lúteo desde la ovulación hasta la regla. */
export function menuDe(cfg: NutriCfg, info: InfoDia | null, date: string): MenuHoy {
  const dow = (new Date(date + 'T12:00:00').getDay() + 6) % 7
  const id: MenuId = info?.fase === 'lutea' ? 'luteo' : 'folicular'
  const menu = cfg.menus?.[id] ?? null
  const semana = info ? (Math.floor((info.dia - 1) / 7) % 2) + 1 : 1
  let porque = 'Sin reglas registradas todavía: se enseña el menú folicular.'
  let desdeFase = 0
  if (info) {
    const c = info.ciclo
    if (id === 'luteo') {
      desdeFase = diffDays(date, c.ovulacion) - 1
      porque = `Día ${info.dia} del ciclo: la ovulación fue hacia el ${fmtDate(c.ovulacion)}. Toca el menú lúteo hasta que venga la regla (${c.siguientePrevisto ? 'prevista el ' : ''}${fmtDate(c.siguiente)}).`
    } else {
      porque = `Día ${info.dia} del ciclo: toca el menú folicular hasta la ovulación (hacia el ${fmtDate(c.ovulacion)}).`
    }
  }
  const n = menu?.dias.length ?? 0
  let indice = 0
  if (menu && n) {
    if (menu.tipo === 'semana') indice = dow % n
    // Si la fase dura más que el menú, se repiten sus últimos siete días.
    else indice = desdeFase < n ? Math.max(0, desdeFase) : n - Math.min(7, n) + ((desdeFase - n) % Math.min(7, n))
  }
  return { id, menu, porque, indice, semana }
}

export interface PlatoHoy { id: string; nombre: string }
/** Platos que tocan en una toma. Los que alternan por semana solo salen en la suya. */
export function platosDe(cfg: NutriCfg, m: MenuHoy, toma: string): PlatoHoy[] {
  const refs = m.menu?.dias[m.indice]?.[toma] ?? []
  return refs
    .filter((r) => typeof r === 'string' || !r.semana || r.semana === m.semana)
    .map((r) => { const id = typeof r === 'string' ? r : r.id; return { id, nombre: cfg.platos?.[id]?.nombre ?? id } })
}

export function avisosDe(cfg: NutriCfg, date: string): string[] {
  const dow = (new Date(date + 'T12:00:00').getDay() + 6) % 7
  return (cfg.avisos ?? []).filter((a) => a.dias_semana?.includes(dow)).map((a) => a.texto)
}

// ---------- Registro y horarios ----------
export const tomasDe = (cfg: NutriCfg | null) => cfg?.tomas ?? []
/** Anotada sin decir cuánto: tiene escrito lo que ha tomado o alguna hora, pero ningún estado marcado. */
export const anotada = (t?: TomaDia) => !!t && !t.estado && (!!t.otro?.trim() || aMin(t.ini) != null || aMin(t.fin) != null)
export const hecha = (t?: TomaDia) => t?.estado === 'entera' || t?.estado === 'tres_cuartos' || t?.estado === 'media' || anotada(t)
/** Hora límite prevista de una toma, en minutos. */
export const limite = (t: TomaDef) => aMin(t.hasta) ?? aMin(t.hora)
/** Hora en la que acaba una toma: el fin si lo guarda, o su inicio. */
export const finDe = (t?: TomaDia) => aMin(t?.fin) ?? aMin(t?.ini)

export interface Horarios {
  hechas: number
  total: number
  /** Marcadas como «no» o, en días pasados, sin registrar. */
  saltadas: string[]
  /** Hoy: sin registrar y ya pasada su hora. */
  pendientes: string[]
  /** Inicio y fin de la cena, y si el fin cumple la hora máxima. `null` = sin esa hora. */
  cenaIni: string | null
  cenaFin: string | null
  cenaOk: boolean | null
}

export function horarios(cfg: NutriCfg, d: NutriDia, date: string, hoy: string, ahoraMin: number): Horarios {
  const defs = tomasDe(cfg)
  const saltadas: string[] = [], pendientes: string[] = []
  let hechas = 0
  for (const t of defs) {
    const x = d.tomas?.[t.id]
    if (hecha(x)) hechas++
    else if (x?.estado === 'no' || date < hoy) saltadas.push(t.nombre)
    else if (date === hoy) { const l = limite(t); if (l != null && ahoraMin > l + GRACIA_MIN) pendientes.push(t.nombre) }
  }
  const cena = defs[defs.length - 1]
  const x = cena ? d.tomas?.[cena.id] : undefined
  const fin = hecha(x) ? finDe(x) : null
  const max = aMin(cfg.cena_fin_max ?? CENA_MAX_POR_DEFECTO)!
  return { hechas, total: defs.length, saltadas, pendientes, cenaIni: hecha(x) && aMin(x?.ini) != null ? aHora(aMin(x?.ini)!) : null, cenaFin: fin != null ? aHora(fin) : null, cenaOk: fin != null ? fin <= max : null }
}

export interface Ayuno {
  /** Minutos entre el final de la última toma de ayer y la primera de hoy. `null` si falta alguna hora. */
  min: number | null
  /** Hora de hoy antes de la cual hay que hacer la primera toma. `null` si ayer no hay hora de cena. */
  antesDe: string | null
  ok: boolean | null
}

/** Ayuno nocturno: del final de la última toma hecha ayer a la primera toma hecha hoy. */
export function ayuno(cfg: NutriCfg, ayer: NutriDia | null, d: NutriDia): Ayuno {
  const defs = tomasDe(cfg)
  const max = (cfg.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO) * 60
  let fin: number | null = null
  for (const t of defs) { const x = ayer?.tomas?.[t.id]; if (hecha(x) && finDe(x) != null) fin = finDe(x) }
  let ini: number | null = null
  for (const t of defs) { const x = d.tomas?.[t.id]; if (hecha(x) && aMin(x?.ini ?? x?.fin) != null) { ini = aMin(x?.ini ?? x?.fin); break } }
  if (fin == null) return { min: null, antesDe: null, ok: null }
  // El límite puede caer al día siguiente o no (cena muy temprana): solo se enseña si cae hoy.
  const tope = fin + max - 1440
  const min = ini != null ? ini + 1440 - fin : null
  return { min, antesDe: tope >= 0 ? aHora(tope) : null, ok: min != null ? min <= max : null }
}

export interface Ultima { nombre: string; hora: string; ayer: boolean; minutos: number }
/** La última comida con hora: la más tardía de hoy que ya haya pasado; si hoy no hay ninguna, la más tardía de ayer
 *  (la cena, si está registrada). `minutos` = los que han pasado hasta `ahoraMin`. */
export function ultimaComida(cfg: NutriCfg, ayer: NutriDia | null, d: NutriDia, ahoraMin: number): Ultima | null {
  const defs = tomasDe(cfg)
  const mejor = (dia: NutriDia | null, tope: number) => {
    let r: { nombre: string; fin: number } | null = null
    for (const t of defs) { const x = dia?.tomas?.[t.id]; const f = finDe(x); if (hecha(x) && f != null && f <= tope && (!r || f >= r.fin)) r = { nombre: t.nombre, fin: f } }
    return r
  }
  const h = mejor(d, ahoraMin)
  if (h) return { nombre: h.nombre, hora: aHora(h.fin), ayer: false, minutos: ahoraMin - h.fin }
  const a = mejor(ayer, 1440)
  return a ? { nombre: a.nombre, hora: aHora(a.fin), ayer: true, minutos: ahoraMin + 1440 - a.fin } : null
}

export interface Nocturno { desdeNombre: string; desdeHora: string; finNombre: string | null; finHora: string | null; minutos: number; enMarcha: boolean }
/** Ayuno de la noche: desde la última comida con hora de ayer (la cena; si no, la anterior) hasta la primera
 *  toma de hoy. Mientras hoy no haya ninguna, sigue en marcha hasta `ahoraMin`; con la primera, se queda fijo. */
export function ayunoNocturno(cfg: NutriCfg, ayer: NutriDia | null, d: NutriDia, ahoraMin: number): Nocturno | null {
  const defs = tomasDe(cfg)
  let desde: { nombre: string; fin: number } | null = null
  for (const t of defs) { const x = ayer?.tomas?.[t.id]; const f = finDe(x); if (hecha(x) && f != null && (!desde || f >= desde.fin)) desde = { nombre: t.nombre, fin: f } }
  if (!desde) return null
  let primera: { nombre: string; ini: number } | null = null
  for (const t of defs) { const x = d.tomas?.[t.id]; const i = aMin(x?.ini) ?? aMin(x?.fin); if (hecha(x) && i != null && (!primera || i < primera.ini)) primera = { nombre: t.nombre, ini: i } }
  const hasta = primera ? primera.ini : ahoraMin
  return { desdeNombre: desde.nombre, desdeHora: aHora(desde.fin), finNombre: primera?.nombre ?? null, finHora: primera ? aHora(primera.ini) : null, minutos: hasta + 1440 - desde.fin, enMarcha: !primera }
}

/** Hora de mañana antes de la cual hay que hacer la primera toma, según el final de la cena de hoy. */
export function primeraAntesDe(cfg: NutriCfg, d: NutriDia): string | null {
  const defs = tomasDe(cfg)
  const cena = defs[defs.length - 1]
  const x = cena ? d.tomas?.[cena.id] : undefined
  const fin = hecha(x) ? finDe(x) : null
  if (fin == null) return null
  const tope = fin + (cfg.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO) * 60 - 1440
  return tope >= 0 ? aHora(tope) : null
}

export interface Agua { desde: string; hasta: string; dentro: string[] }
/** Franja sin agua alrededor de una comida principal y los vasos anotados dentro de ella. */
export function aguaDe(cfg: NutriCfg, t: TomaDia | undefined, h: HidraDia | null): Agua | null {
  const ini = aMin(t?.ini) ?? aMin(t?.fin), fin = aMin(t?.fin) ?? aMin(t?.ini)
  if (ini == null || fin == null) return null
  const a = ini - (cfg.agua_margen?.antes_min ?? AGUA_ANTES_POR_DEFECTO)
  const b = fin + (cfg.agua_margen?.despues_min ?? AGUA_DESPUES_POR_DEFECTO)
  const dentro = (h?.horas ?? []).filter((x) => { const m = aMin(x.h); return m != null && m > a && m < b }).map((x) => x.h)
  return { desde: aHora(a), hasta: aHora(b), dentro }
}

/** Semáforo del día: rojo si hay tomas saltadas o pendientes; amarillo si falta algo o un horario no se cumple. */
export function nivelDia(h: Horarios, ay: Ayuno): Nivel {
  if (h.saltadas.length || h.pendientes.length) return 'rojo'
  if (h.hechas < h.total || h.cenaOk === false || ay.ok === false) return 'amarillo'
  return 'verde'
}

export function textoResumen(h: Horarios): string {
  const p = [`${h.hechas} de ${h.total} tomas`]
  if (h.pendientes.length) p.push(h.pendientes.length === 1 ? `pendiente: ${h.pendientes[0].toLowerCase()}` : `${h.pendientes.length} pendientes`)
  if (h.saltadas.length) p.push(h.saltadas.length === 1 ? '1 saltada' : `${h.saltadas.length} saltadas`)
  if (h.cenaOk === true) p.push('cena a su hora')
  if (h.cenaOk === false) p.push('cena tarde')
  return p.join(' · ')
}

// ---------- Carga de la configuración ----------
const esObj = (x: unknown): x is { [k: string]: unknown } => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Lee un texto de configuración de Nutrición. Admite el objeto suelto o dentro de `{ "nutricion": … }`. `null` si no vale. */
export function leerCfg(texto: string): NutriCfg | null {
  let x: unknown
  try { x = JSON.parse(texto) } catch { return null }
  if (esObj(x) && esObj(x.nutricion)) x = x.nutricion
  if (!esObj(x) || !Array.isArray(x.tomas) || !x.tomas.length) return null
  for (const t of x.tomas) if (!esObj(t) || typeof t.id !== 'string' || typeof t.nombre !== 'string') return null
  if (x.menus !== undefined) {
    if (!esObj(x.menus)) return null
    for (const m of Object.values(x.menus)) if (!esObj(m) || !Array.isArray(m.dias) || (m.tipo !== 'semana' && m.tipo !== 'fase')) return null
  }
  if (x.platos !== undefined && !esObj(x.platos)) return null
  return x as NutriCfg
}

export const semana = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(date, i - 6))
