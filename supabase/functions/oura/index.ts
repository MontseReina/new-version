// New Version — conexión con el anillo Oura (Supabase Edge Function).
//
// Qué hace:
//  · GET  ?code&state  → vuelta de Oura tras dar permiso: guarda el permiso y devuelve a la app.
//  · POST {accion}     → llamadas de la app, con la sesión de la usuaria:
//      'estado'       ¿está conectada?
//      'url'          dirección de Oura para dar permiso
//      'sincronizar'  trae los 3 últimos días y un tramo más del histórico (la app repite mientras falte histórico)
//      'desconectar'  retira el permiso
//  · POST {accion:'auto'} sin sesión → lo llama la base de datos cada 30 minutos (supabase/oura-cron.sql):
//      sincroniza a las 10:30 y a las 22:00 de la hora de cada usuaria, y mientras falte histórico.
//
// Solo lee de Oura; no escribe nada en la cuenta de Oura.
// Guarda un documento por día en `entries` (module 'oura', kind 'dia'), con la forma de src/modules/oura/tipos.ts.
// La noche pertenece al día en que se despierta (campo `day` de Oura).
//
// Secretos necesarios (Supabase → Edge Functions → Secrets): OURA_CLIENT_ID, OURA_CLIENT_SECRET.
// Hay que desplegarla con «Verify JWT» desactivado: la vuelta de Oura y la llamada automática llegan sin sesión.
// La sesión de la app se comprueba aquí dentro.
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://montsereina.github.io/new-version/'
const CLIENT_ID = Deno.env.get('OURA_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('OURA_CLIENT_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const REDIRECT = `${SUPABASE_URL}/functions/v1/oura`
const PROVIDER = 'oura'
const MODULO = 'oura'
const API = 'https://api.ouraring.com/v2/usercollection'
/** Días recientes que se vuelven a traer siempre: Oura corrige los últimos días al sincronizar el anillo. */
const RECIENTES = 3
/** Días de histórico por llamada (cabe de sobra en el tiempo de una función). */
const TRAMO = 30
/** Tramos seguidos sin ningún dato para dar el histórico por terminado. */
const VACIOS_FIN = 3
/** Horas de la sincronización automática (hora local de la usuaria) y margen de la tarea de la base de datos. */
const HORAS_AUTO = ['10:30', '22:00']
const MARGEN_AUTO_MIN = 30

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const cors = {
  'Access-Control-Allow-Origin': new URL(APP_URL).origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const volver = (resultado: string) =>
  new Response(null, { status: 302, headers: { Location: `${APP_URL}#/oura?oura=${resultado}` } })

// ---------- Firma del parámetro `state` (para saber de quién es la vuelta de Oura) ----------
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
async function firmar(texto: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CLIENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(texto)))
}
async function crearState(userId: string): Promise<string> {
  const cuerpo = `${userId}.${Date.now() + 15 * 60 * 1000}`
  return `${cuerpo}.${await firmar(cuerpo)}`
}
async function leerState(state: string): Promise<string | null> {
  const [userId, caduca, firma] = state.split('.')
  if (!userId || !caduca || !firma) return null
  if ((await firmar(`${userId}.${caduca}`)) !== firma) return null
  if (Number(caduca) < Date.now()) return null
  return userId
}

// ---------- Fila de la conexión ----------
type Secreto = { access_token?: string; refresh_token?: string; expires_at?: number }
type Estado = {
  ultima?: string | null
  /** Día más antiguo ya revisado del histórico y tramos vacíos seguidos. */
  historico_hasta?: string | null
  historico_vacios?: number
  historico_completo?: boolean
  /** Primer día con datos de Oura. */
  desde?: string | null
  /** Datos que Oura no deja leer con el permiso dado (p. ej. etiquetas o sesiones). */
  sin_permiso?: string[]
}
type Fila = { secret: Secreto; state: Estado }
async function leerFila(userId: string): Promise<Fila | null> {
  const { data, error } = await admin.from('integrations').select('secret,state').eq('user_id', userId).eq('provider', PROVIDER).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Fila | null
}
async function guardarFila(userId: string, f: Fila) {
  const { error } = await admin.from('integrations').upsert({ user_id: userId, provider: PROVIDER, secret: f.secret, state: f.state })
  if (error) throw new Error(error.message)
}

// ---------- Permiso de Oura ----------
async function pedirToken(params: Record<string, string>) {
  const r = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  })
  return { ok: r.ok, data: await r.json().catch(() => ({})) as Record<string, any> }
}
const secretoDe = (d: Record<string, any>): Secreto => ({
  access_token: d.access_token,
  refresh_token: d.refresh_token,
  expires_at: Date.now() + (Number(d.expires_in) || 86400) * 1000,
})

/** Devuelve un permiso en vigor; lo renueva si caduca en menos de una hora. null = hay que volver a conectar. */
async function permisoVigente(userId: string, fila: Fila): Promise<string | null> {
  const s = fila.secret
  if (!s.refresh_token) return null
  if (s.access_token && (s.expires_at ?? 0) - Date.now() > 3600_000) return s.access_token
  const t = await pedirToken({ grant_type: 'refresh_token', refresh_token: s.refresh_token })
  if (t.ok && t.data.access_token) {
    // El permiso de renovación de Oura sirve una sola vez: se guarda el nuevo enseguida.
    fila.secret = secretoDe({ ...t.data, refresh_token: t.data.refresh_token ?? s.refresh_token })
    await guardarFila(userId, fila)
    return fila.secret.access_token!
  }
  // Puede que otra sincronización (la automática o la de la app) lo haya renovado a la vez.
  const otra = await leerFila(userId)
  if (otra?.secret?.refresh_token && otra.secret.refresh_token !== s.refresh_token && otra.secret.access_token) {
    fila.secret = otra.secret
    return otra.secret.access_token
  }
  if (t.data.error === 'invalid_grant' || t.data.error === 'invalid_token' || t.data.error === 'unauthorized_client') {
    await guardarFila(userId, { secret: {}, state: fila.state })
    return null
  }
  throw new Error('Oura no ha renovado el permiso: ' + (t.data.error_description ?? t.data.error ?? 'error desconocido'))
}

class SinPermiso extends Error {}
class PermisoCaducado extends Error {}
/** Oura no reconoce la petición (dato que este anillo o esta cuenta no tienen). */
class NoDisponible extends Error {}

/** Lee una colección de Oura entera (sigue `next_token`). */
async function coleccion(token: string, ruta: string, q: Record<string, string>): Promise<any[]> {
  const todo: any[] = []
  let siguiente: string | null = null
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    const p = new URLSearchParams(q)
    if (siguiente) p.set('next_token', siguiente)
    const r = await fetch(`${API}/${ruta}?${p}`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 401) throw new PermisoCaducado(ruta)
    if (r.status === 403) throw new SinPermiso(ruta)
    if (r.status === 429) throw new Error('Oura está limitando las peticiones. Vuelve a probar en unos minutos.')
    if (r.status >= 400 && r.status < 500) throw new NoDisponible(`Oura respondió ${r.status} al leer ${ruta}`)
    if (!r.ok) throw new Error(`Oura respondió ${r.status} al leer ${ruta}`)
    const d = await r.json() as { data?: any[]; next_token?: string | null }
    todo.push(...(d.data ?? []))
    siguiente = d.next_token ?? null
    if (!siguiente) break
  }
  return todo
}

// ---------- Fechas ----------
function sumarDias(dia: string, n: number): string {
  const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function enZona(iso: string, tz: string): { dia: string; min: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  return { dia: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) }
}
const hoyEn = (tz: string) => enZona(new Date().toISOString(), tz).dia
/** «HH:MM» tal como viene en las horas de Oura, que ya llevan la zona de la usuaria (2026-11-09T23:41:00+01:00). */
const horaLocal = (iso?: string | null) => (typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : undefined)
const minutosDe = (seg?: number | null) => (typeof seg === 'number' ? Math.round(seg / 60) : undefined)
function hhmm(segundosDesdeMedianoche: number): string {
  const m = (((Math.round(segundosDesdeMedianoche / 60)) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const limpio = <T extends Record<string, unknown>>(o: T): T | undefined => {
  const r = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T
  return Object.keys(r).length ? r : undefined
}

// ---------- De Oura al documento del día ----------
type Doc = Record<string, any>

function nocheDe(s: any): Doc | undefined {
  const serie = (x: any) => Array.isArray(x?.items) ? (x.items as (number | null)[]).map((v) => (typeof v === 'number' ? Math.round(v) : null)) : undefined
  return limpio({
    dormir: horaLocal(s.bedtime_start),
    despertar: horaLocal(s.bedtime_end),
    total_min: minutosDe(s.total_sleep_duration),
    profundo_min: minutosDe(s.deep_sleep_duration),
    rem_min: minutosDe(s.rem_sleep_duration),
    ligero_min: minutosDe(s.light_sleep_duration),
    despierta_min: minutosDe(s.awake_time),
    eficiencia: s.efficiency ?? undefined,
    latencia_min: minutosDe(s.latency),
    fc_min: s.lowest_heart_rate ?? undefined,
    fc_media: typeof s.average_heart_rate === 'number' ? Math.round(s.average_heart_rate) : undefined,
    vfc_media: typeof s.average_hrv === 'number' ? Math.round(s.average_hrv) : undefined,
    resp: typeof s.average_breath === 'number' ? Math.round(s.average_breath * 10) / 10 : undefined,
    fases: typeof s.sleep_phase_5_min === 'string' ? s.sleep_phase_5_min : undefined,
    fc5: s.heart_rate?.interval === 300 ? serie(s.heart_rate) : undefined,
    vfc5: s.hrv?.interval === 300 ? serie(s.hrv) : undefined,
  })
}

/** De las noches de un día, la principal: la «long_sleep» o, si no la hay, la más larga. */
function principal(noches: any[]): any | null {
  const validas = noches.filter((s) => s.type !== 'deleted' && s.type !== 'rest')
  if (!validas.length) return null
  const largas = validas.filter((s) => s.type === 'long_sleep')
  const pool = largas.length ? largas : validas
  return pool.reduce((a, b) => ((b.total_sleep_duration ?? 0) > (a.total_sleep_duration ?? 0) ? b : a))
}

/** class_5_min empieza a las 4:00 de la mañana (o en `timestamp`); se coloca desde las 00:00 del día. */
function clase5DesdeMedianoche(a: any, tz: string): string | undefined {
  if (typeof a.class_5_min !== 'string' || !a.class_5_min) return undefined
  let inicio = 4 * 60
  if (typeof a.timestamp === 'string') {
    const z = enZona(a.timestamp, tz)
    inicio = z.dia === a.day ? z.min : 0
  }
  const huecos = Math.round(inicio / 5)
  return ('0'.repeat(huecos) + a.class_5_min).slice(0, 288)
}

type Lectura = { nombre: string; ruta: string; q: 'dia' | 'hora'; opcional?: boolean }
const LECTURAS: Lectura[] = [
  { nombre: 'sueño', ruta: 'daily_sleep', q: 'dia' },
  { nombre: 'disposición', ruta: 'daily_readiness', q: 'dia' },
  { nombre: 'noches', ruta: 'sleep', q: 'dia' },
  { nombre: 'actividad', ruta: 'daily_activity', q: 'dia' },
  { nombre: 'estrés', ruta: 'daily_stress', q: 'dia', opcional: true },
  { nombre: 'resiliencia', ruta: 'daily_resilience', q: 'dia', opcional: true },
  { nombre: 'oxígeno', ruta: 'daily_spo2', q: 'dia', opcional: true },
  { nombre: 'edad cardiovascular', ruta: 'daily_cardiovascular_age', q: 'dia', opcional: true },
  { nombre: 'VO2 máx', ruta: 'vO2_max', q: 'dia', opcional: true },
  { nombre: 'hora de acostarse', ruta: 'sleep_time', q: 'dia', opcional: true },
  { nombre: 'entrenamientos', ruta: 'workout', q: 'dia', opcional: true },
  { nombre: 'sesiones', ruta: 'session', q: 'dia', opcional: true },
  { nombre: 'etiquetas', ruta: 'enhanced_tag', q: 'dia', opcional: true },
  { nombre: 'modo descanso', ruta: 'rest_mode_period', q: 'dia', opcional: true },
  { nombre: 'frecuencia del día', ruta: 'heartrate', q: 'hora', opcional: true },
]

/** Trae de Oura los días [desde, hasta] y guarda un documento por día. Devuelve cuántos días tenían datos. */
async function traerTramo(userId: string, token: string, tz: string, desde: string, hasta: string, sinPermiso: Set<string>): Promise<{ dias: string[] }> {
  const datos: Record<string, any[]> = {}
  for (const l of LECTURAS) {
    if (sinPermiso.has(l.nombre)) continue
    const q: Record<string, string> = l.q === 'dia'
      // Se pide un día más por cada lado y luego se filtra: así da igual si Oura cuenta los límites o no.
      ? { start_date: sumarDias(desde, -1), end_date: sumarDias(hasta, 1) }
      : { start_datetime: `${sumarDias(desde, -1)}T00:00:00Z`, end_datetime: `${sumarDias(hasta, 2)}T00:00:00Z` }
    try {
      datos[l.ruta] = await coleccion(token, l.ruta, q)
    } catch (e) {
      // Un dato opcional que Oura no deja leer (permiso no dado o no disponible) se salta; los fallos del servidor paran.
      if (l.opcional && (e instanceof SinPermiso || e instanceof PermisoCaducado || e instanceof NoDisponible)) { sinPermiso.add(l.nombre); continue }
      throw e
    }
  }

  const docs: Record<string, Doc> = {}
  const doc = (dia: string) => (docs[dia] ??= {})
  const dentro = (dia?: string) => typeof dia === 'string' && dia >= desde && dia <= hasta
  const porDia = (ruta: string, f: (x: any) => void) => { for (const x of datos[ruta] ?? []) if (dentro(x.day)) f(x) }

  porDia('daily_sleep', (x) => {
    const c = x.contributors ?? {}
    doc(x.day).sueno = limpio({
      puntuacion: x.score ?? undefined,
      factores: limpio({
        total: c.total_sleep, eficiencia: c.efficiency, descanso: c.restfulness, rem: c.rem_sleep,
        profundo: c.deep_sleep, latencia: c.latency, regularidad: c.timing,
      }),
    })
  })
  porDia('daily_readiness', (x) => {
    const c = x.contributors ?? {}
    doc(x.day).disposicion = limpio({
      puntuacion: x.score ?? undefined,
      temp_desv: x.temperature_deviation ?? undefined,
      temp_tend: x.temperature_trend_deviation ?? undefined,
      factores: limpio({
        vfc: c.hrv_balance, fc_reposo: c.resting_heart_rate, temperatura: c.body_temperature, recuperacion: c.recovery_index,
        noche_anterior: c.previous_night, equilibrio_sueno: c.sleep_balance, actividad_anterior: c.previous_day_activity,
        equilibrio_actividad: c.activity_balance,
      }),
    })
  })
  const noches: Record<string, any[]> = {}
  porDia('sleep', (x) => { (noches[x.day] ??= []).push(x) })
  for (const [dia, ns] of Object.entries(noches)) {
    const p = principal(ns)
    const n = p && nocheDe(p)
    if (n) doc(dia).noche = n
  }
  porDia('daily_activity', (x) => {
    doc(x.day).actividad = limpio({
      puntuacion: x.score ?? undefined,
      pasos: x.steps ?? undefined,
      kcal_activas: x.active_calories ?? undefined,
      kcal_totales: x.total_calories ?? undefined,
      sentada_min: minutosDe(x.sedentary_time),
      alta_min: minutosDe(x.high_activity_time),
      media_min: minutosDe(x.medium_activity_time),
      baja_min: minutosDe(x.low_activity_time),
      clase5: clase5DesdeMedianoche(x, tz),
    })
  })
  porDia('daily_stress', (x) => {
    doc(x.day).estres = limpio({ alto_min: minutosDe(x.stress_high), recuperacion_min: minutosDe(x.recovery_high), resumen: x.day_summary ?? undefined })
  })
  porDia('daily_resilience', (x) => {
    const c = x.contributors ?? {}
    doc(x.day).resiliencia = limpio({
      nivel: x.level ?? undefined,
      factores: limpio({
        sueno: typeof c.sleep_recovery === 'number' ? Math.round(c.sleep_recovery) : undefined,
        dia: typeof c.daytime_recovery === 'number' ? Math.round(c.daytime_recovery) : undefined,
        estres: typeof c.stress === 'number' ? Math.round(c.stress) : undefined,
      }),
    })
  })
  porDia('daily_spo2', (x) => {
    doc(x.day).spo2 = limpio({
      media: typeof x.spo2_percentage?.average === 'number' ? Math.round(x.spo2_percentage.average * 10) / 10 : undefined,
      alteraciones: x.breathing_disturbance_index ?? undefined,
    })
  })
  porDia('daily_cardiovascular_age', (x) => {
    if (x.vascular_age != null) doc(x.day).cardio = { ...(doc(x.day).cardio ?? {}), edad_vascular: x.vascular_age }
  })
  porDia('vO2_max', (x) => {
    if (x.vo2_max != null) doc(x.day).cardio = { ...(doc(x.day).cardio ?? {}), vo2: x.vo2_max }
  })
  porDia('sleep_time', (x) => {
    const o = x.optimal_bedtime
    if (o && typeof o.start_offset === 'number' && typeof o.end_offset === 'number') {
      doc(x.day).recomendada = { desde: hhmm(o.start_offset), hasta: hhmm(o.end_offset) }
    }
  })
  porDia('workout', (x) => {
    const ini = x.start_datetime, fin = x.end_datetime
    const min = ini && fin ? Math.round((new Date(fin).getTime() - new Date(ini).getTime()) / 60000) : 0
    ;(doc(x.day).entrenos ??= []).push(limpio({
      actividad: String(x.activity ?? x.label ?? 'actividad'), inicio: horaLocal(ini) ?? '', min,
      kcal: typeof x.calories === 'number' ? Math.round(x.calories) : undefined, intensidad: x.intensity ?? undefined,
    }))
  })
  porDia('session', (x) => {
    const ini = x.start_datetime, fin = x.end_datetime
    const min = ini && fin ? Math.round((new Date(fin).getTime() - new Date(ini).getTime()) / 60000) : 0
    ;(doc(x.day).sesiones ??= []).push({ tipo: x.type, inicio: horaLocal(ini) ?? '', min })
  })
  for (const x of datos['enhanced_tag'] ?? []) {
    const dia = typeof x.start_day === 'string' ? x.start_day : typeof x.start_time === 'string' ? x.start_time.slice(0, 10) : undefined
    if (!dentro(dia)) continue
    const texto = x.custom_name || x.comment || x.tag_type_code
    if (texto) (doc(dia!).etiquetas ??= []).push(limpio({ texto: String(texto), hora: horaLocal(x.start_time) }))
  }
  for (const x of datos['rest_mode_period'] ?? []) {
    if (typeof x.start_day !== 'string') continue
    const fin = typeof x.end_day === 'string' ? x.end_day : hasta
    for (let d = x.start_day < desde ? desde : x.start_day; d <= fin && d <= hasta; d = sumarDias(d, 1)) doc(d).modo_descanso = true
  }
  // Frecuencia del día: una media cada 30 minutos desde las 00:00 de la hora de la usuaria.
  const sumas: Record<string, { s: number[]; n: number[] }> = {}
  for (const x of datos['heartrate'] ?? []) {
    if (typeof x.bpm !== 'number' || typeof x.timestamp !== 'string') continue
    const z = enZona(x.timestamp, tz)
    if (!dentro(z.dia)) continue
    const b = (sumas[z.dia] ??= { s: Array(48).fill(0), n: Array(48).fill(0) })
    const i = Math.floor(z.min / 30)
    b.s[i] += x.bpm; b.n[i]++
  }
  for (const [dia, b] of Object.entries(sumas)) {
    doc(dia).fc_dia = b.s.map((s, i) => (b.n[i] ? Math.round(s / b.n[i]) : null))
  }

  // Guardar: un documento por día (se sustituye entero; lo escribe solo esta función).
  const dias = Object.keys(docs).filter((d) => Object.keys(docs[d]).length).sort()
  if (dias.length) {
    const prev = await admin.from('entries').select('id,day').eq('user_id', userId).eq('module', MODULO).eq('kind', 'dia')
      .gte('day', desde).lte('day', hasta).is('deleted_at', null)
    if (prev.error) throw new Error(prev.error.message)
    const idDe = new Map((prev.data as { id: string; day: string }[]).map((r) => [r.day, r.id]))
    const nuevos = dias.filter((d) => !idDe.has(d)).map((d) => ({ user_id: userId, module: MODULO, kind: 'dia', day: d, value: docs[d] }))
    if (nuevos.length) {
      const ins = await admin.from('entries').insert(nuevos)
      if (ins.error) throw new Error(ins.error.message)
    }
    for (const d of dias) {
      const id = idDe.get(d)
      if (!id) continue
      const u = await admin.from('entries').update({ value: docs[d] }).eq('id', id).eq('user_id', userId)
      if (u.error) throw new Error(u.error.message)
    }
  }
  return { dias }
}

// ---------- Sincronización ----------
async function zonaDe(userId: string): Promise<string> {
  const perfil = await admin.from('profiles').select('timezone').eq('id', userId).maybeSingle()
  return (perfil.data as any)?.timezone || 'Europe/Madrid'
}

function resumen(fila: Fila) {
  const s = fila.state
  return {
    conectado: !!fila.secret.refresh_token,
    ultima: s.ultima ?? null,
    desde: s.desde ?? null,
    historico_completo: !!s.historico_completo,
    historico_hasta: s.historico_hasta ?? null,
    sin_permiso: s.sin_permiso ?? [],
  }
}

async function sincronizar(userId: string) {
  const fila = await leerFila(userId)
  if (!fila?.secret?.refresh_token) return { conectado: false }
  let token = await permisoVigente(userId, fila)
  if (!token) return { conectado: false, motivo: 'caducado' }
  const tz = await zonaDe(userId)
  const hoy = hoyEn(tz)
  const sinPermiso = new Set<string>()

  const tramo = async (desde: string, hasta: string) => {
    try {
      return await traerTramo(userId, token!, tz, desde, hasta, sinPermiso)
    } catch (e) {
      if (!(e instanceof PermisoCaducado)) throw e
      // Oura no acepta el permiso: se renueva una vez y se repite.
      fila.secret = { ...fila.secret, expires_at: 0 }
      token = await permisoVigente(userId, fila)
      if (!token) throw new PermisoCaducado('renovación')
      return await traerTramo(userId, token, tz, desde, hasta, sinPermiso)
    }
  }

  try {
    // 1) Los últimos días, siempre.
    const rec = await tramo(sumarDias(hoy, -RECIENTES), hoy)
    const st = fila.state
    if (rec.dias.length && (!st.desde || rec.dias[0] < st.desde)) st.desde = rec.dias[0]

    // 2) Un tramo más del histórico, hacia atrás, hasta que Oura deje de tener datos.
    if (!st.historico_completo) {
      const hasta = sumarDias(st.historico_hasta ?? sumarDias(hoy, -RECIENTES), -1)
      const desde = sumarDias(hasta, -(TRAMO - 1))
      const h = await tramo(desde, hasta)
      st.historico_hasta = desde
      const vacios = h.dias.length ? 0 : (st.historico_vacios ?? 0) + 1
      st.historico_vacios = vacios
      if (h.dias.length && (!st.desde || h.dias[0] < st.desde)) st.desde = h.dias[0]
      if (vacios >= VACIOS_FIN || desde < '2015-01-01') st.historico_completo = true
    }
    st.ultima = new Date().toISOString()
    st.sin_permiso = [...sinPermiso]
    await guardarFila(userId, fila)
    return { ...resumen(fila), dias: rec.dias.length }
  } catch (e) {
    if (e instanceof PermisoCaducado) {
      await guardarFila(userId, { secret: {}, state: fila.state })
      return { conectado: false, motivo: 'caducado' }
    }
    throw e
  }
}

/** Llamada de la base de datos cada 30 minutos: sincroniza a quien le toque. */
async function automatica() {
  const { data, error } = await admin.from('integrations').select('user_id,secret,state').eq('provider', PROVIDER)
  if (error) throw new Error(error.message)
  const hechas: string[] = []
  for (const f of (data ?? []) as (Fila & { user_id: string })[]) {
    if (!f.secret?.refresh_token) continue
    const tz = await zonaDe(f.user_id)
    const ahora = enZona(new Date().toISOString(), tz).min
    const toca = HORAS_AUTO.some((h) => {
      const [hh, mm] = h.split(':').map(Number)
      const d = ahora - (hh * 60 + mm)
      return d >= 0 && d < MARGEN_AUTO_MIN
    })
    const reciente = f.state?.ultima && Date.now() - new Date(f.state.ultima).getTime() < 20 * 60 * 1000
    if ((toca && !reciente) || !f.state?.historico_completo) {
      try { await sincronizar(f.user_id); hechas.push(f.user_id) } catch { /* se reintenta en la siguiente vuelta */ }
    }
  }
  return { sincronizadas: hechas.length }
}

// ---------- Entrada ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = new URL(req.url)
    const configurado = !!CLIENT_ID && !!CLIENT_SECRET

    // Vuelta de Oura tras dar (o negar) el permiso.
    if (req.method === 'GET') {
      const state = url.searchParams.get('state')
      const code = url.searchParams.get('code')
      if (!state) return volver('error')
      const userId = await leerState(state)
      if (!userId) return volver('error')
      if (!code) return volver('cancelado')
      const t = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT })
      if (!t.ok || !t.data.refresh_token) return volver('error')
      const previa = await leerFila(userId)
      await guardarFila(userId, { secret: secretoDe(t.data), state: { ...(previa?.state ?? {}), ultima: previa?.state?.ultima ?? null } })
      return volver('ok')
    }

    if (req.method !== 'POST') return json({ error: 'Método no admitido' }, 405)
    const cuerpo = await req.json().catch(() => ({})) as { accion?: string }

    if (cuerpo.accion === 'auto') {
      if (!configurado) return json({ sincronizadas: 0 })
      return json(await automatica())
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: quien, error: errQuien } = await admin.auth.getUser(jwt)
    if (errQuien || !quien?.user) return json({ error: 'Sesión no válida' }, 401)
    const userId = quien.user.id

    if (cuerpo.accion === 'estado') {
      const fila = await leerFila(userId)
      return json({ configurado, ...(fila ? resumen(fila) : { conectado: false }) })
    }
    if (!configurado) return json({ error: 'Faltan las claves de Oura en el servidor.' }, 400)
    if (cuerpo.accion === 'url') {
      // Sin `scope`: Oura pide todos los permisos marcados en la aplicación registrada.
      const q = new URLSearchParams({ response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT, state: await crearState(userId) })
      return json({ url: 'https://cloud.ouraring.com/oauth/authorize?' + q })
    }
    if (cuerpo.accion === 'sincronizar') return json(await sincronizar(userId))
    if (cuerpo.accion === 'desconectar') {
      const fila = await leerFila(userId)
      if (fila?.secret?.access_token) {
        await fetch(`https://api.ouraring.com/oauth/revoke?access_token=${encodeURIComponent(fila.secret.access_token)}`).catch(() => null)
      }
      if (fila) await guardarFila(userId, { secret: {}, state: fila.state })
      return json({ conectado: false })
    }
    return json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
