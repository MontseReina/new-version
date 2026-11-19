// New Version — datos del reloj (tensión, frecuencia cardíaca, variabilidad y saturación) que llegan de Apple Salud
// (Supabase Edge Function).
//
// Camino de los datos: reloj → su app → Apple Salud (en su caso, Huawei Health → Health Sync → Salud)
// → la app «Health Auto Export» del iPhone, que los manda aquí cada cierto tiempo (automatización «REST API», JSON).
//
// Qué hace:
//  · POST ?t=<clave> con el JSON de Health Auto Export → guarda los datos en el documento diario `reloj`.
//    La clave es la de la usuaria (se crea en la app); sin clave válida, no se guarda nada.
//  · POST {accion} con la sesión de la app:
//      'estado'      ¿está activa?, última llegada y cuántos datos han llegado
//      'activar'     crea una clave nueva y devuelve la dirección completa (la anterior deja de valer)
//      'desactivar'  borra la clave
//
// Solo escribe el documento diario `reloj` (entries, module 'reloj', kind 'dia'), con la forma de src/modules/reloj/tipos.ts.
// Las demás áreas solo lo leen. Las horas son las del iPhone (Health Auto Export manda la hora local con su zona).
// La clave no se guarda: solo su huella (SHA-256).
//
// Hay que desplegarla con «Verify JWT» desactivado: Health Auto Export llega sin sesión. La sesión de la app se comprueba aquí dentro.
// No necesita secretos propios.
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://montsereina.github.io/new-version/'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PROVIDER = 'reloj'
const MODULO = 'reloj'
/** Pulso a partir del cual se guarda el rato (como con Oura). */
const FC_ALTA = 100
/** Minutos entre lecturas para que cuenten como el mismo rato de pulso alto. */
const FC_ALTA_HUECO_MIN = 10
/** Minutos de margen para unir el pulso con una toma de tensión. */
const FC_CON_TA_MIN = 2
/** Fuentes que no son el reloj y que se descartan (Oura ya llega por su propia conexión). */
const FUENTES_FUERA = [/oura/i]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const cors = {
  'Access-Control-Allow-Origin': new URL(APP_URL).origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// ---------- Clave ----------
const b64url = (buf: Uint8Array) => btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
async function huella(texto: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Estado = { ultima?: string | null; recibidos?: number; dias?: number; desde?: string | null; metricas?: string[] }
type Fila = { user_id: string; secret: { token_hash?: string }; state: Estado }

async function filaDe(userId: string): Promise<Fila | null> {
  const { data, error } = await admin.from('integrations').select('user_id,secret,state').eq('user_id', userId).eq('provider', PROVIDER).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Fila | null
}
async function filaPorClave(clave: string): Promise<Fila | null> {
  if (!clave || clave.length < 20) return null
  const h = await huella(clave)
  const { data, error } = await admin.from('integrations').select('user_id,secret,state').eq('provider', PROVIDER).eq('secret->>token_hash', h).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Fila | null
}

// ---------- Forma del documento del día (ver src/modules/reloj/tipos.ts) ----------
type Punto = [string, number]            // [HH:MM, valor]
type PuntoFc = [string, number, number]  // [HH:MM, media, máximo]
type Ta = { hora: string; pas: number; pad: number; fc?: number }
type Doc = {
  ta?: Ta[]
  fc_puntos?: PuntoFc[]
  fc_dia?: (number | null)[]
  fc?: { min?: number; media?: number; max?: number; reposo?: number }
  fc_altas?: { hora: string; fc: number; min: number }[]
  vfc?: Punto[]
  spo2?: Punto[]
  fuentes?: string[]
  actualizado?: string
}

/** «2026-11-19 07:42:10 +0100» o «2026-11-19T07:42:10+01:00» → día y hora local del iPhone. */
function partes(fecha: unknown): { dia: string; hora: string; hms: string } | null {
  if (typeof fecha !== 'string') return null
  const m = fecha.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?/)
  return m ? { dia: m[1], hora: m[2], hms: m[2] + (m[3] ?? ':00') } : null
}
const numero = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) ? Number(v) : null)
const minutos = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))
const deFuera = (p: any) => FUENTES_FUERA.some((re) => re.test(String(p?.source ?? '')))

/** Une listas por su hora: lo nuevo sustituye a lo que había a la misma hora. */
function unir<T>(viejos: T[] | undefined, nuevos: T[], clave: (x: T) => string): T[] {
  const m = new Map((viejos ?? []).map((x) => [clave(x), x]))
  for (const x of nuevos) m.set(clave(x), x)
  return [...m.values()].sort((a, b) => clave(a).localeCompare(clave(b)))
}

/** Rehace los resúmenes del día (curva cada 30 minutos, mínimo, media, máximo, ratos de pulso alto y pulso de cada tensión). */
function rehacer(d: Doc): Doc {
  const fp = d.fc_puntos ?? []
  if (fp.length) {
    const s = Array(48).fill(0), n = Array(48).fill(0)
    for (const [h, media] of fp) { const i = Math.floor(minutos(h) / 30); s[i] += media; n[i]++ }
    d.fc_dia = s.map((v, i) => (n[i] ? Math.round(v / n[i]) : null))
    const medias = fp.map((p) => p[1])
    d.fc = { ...d.fc, min: Math.round(Math.min(...medias)), media: Math.round(medias.reduce((a, b) => a + b, 0) / medias.length), max: Math.round(Math.max(...fp.map((p) => p[2]))) }
    const altas: { hora: string; fc: number; min: number; fin: number }[] = []
    for (const [h, , max] of fp) {
      if (max < FC_ALTA) continue
      const t = minutos(h)
      const ult = altas[altas.length - 1]
      if (ult && t - ult.fin <= FC_ALTA_HUECO_MIN) { ult.fin = t; ult.fc = Math.max(ult.fc, Math.round(max)); ult.min = ult.fin - minutos(ult.hora) + 1 }
      else altas.push({ hora: h, fc: Math.round(max), min: 1, fin: t })
    }
    d.fc_altas = altas.map(({ fin: _f, ...a }) => a)
  }
  if (d.ta?.length && fp.length) {
    d.ta = d.ta.map((t) => {
      if (t.fc != null) return t
      const tm = minutos(t.hora)
      const cerca = fp.filter(([h]) => Math.abs(minutos(h) - tm) <= FC_CON_TA_MIN).sort((a, b) => Math.abs(minutos(a[0]) - tm) - Math.abs(minutos(b[0]) - tm))[0]
      return cerca ? { ...t, fc: Math.round(cerca[1]) } : t
    })
  }
  return d
}

/** Lee el JSON de Health Auto Export y lo reparte por días. */
function repartir(cuerpo: any): { porDia: Record<string, Doc>; metricas: string[]; n: number } {
  const metricas: any[] = cuerpo?.data?.metrics ?? cuerpo?.metrics ?? []
  const porDia: Record<string, Doc> = {}
  const doc = (dia: string) => (porDia[dia] ??= {})
  const fuentes = (dia: string, p: any) => { const f = String(p?.source ?? '').trim(); if (f) { const d = doc(dia); d.fuentes = [...new Set([...(d.fuentes ?? []), ...f.split('|').map((x) => x.trim()).filter(Boolean)])] } }
  const vistas: string[] = []
  let n = 0
  for (const m of Array.isArray(metricas) ? metricas : []) {
    const nombre = String(m?.name ?? '').toLowerCase()
    const datos: any[] = Array.isArray(m?.data) ? m.data : []
    if (!datos.length) continue
    vistas.push(nombre)
    for (const p of datos) {
      if (deFuera(p)) continue
      const t = partes(p?.date ?? p?.start)
      if (!t) continue
      if (nombre === 'blood_pressure') {
        const pas = numero(p.systolic), pad = numero(p.diastolic)
        if (pas == null || pad == null) continue
        ;(doc(t.dia).ta ??= []).push({ hora: t.hora, pas: Math.round(pas), pad: Math.round(pad) })
      } else if (nombre === 'heart_rate') {
        const media = numero(p.Avg) ?? numero(p.avg) ?? numero(p.qty)
        if (media == null) continue
        const max = numero(p.Max) ?? numero(p.max) ?? media
        // Varias lecturas en el mismo minuto (Health Auto Export puede mandar por segundos): media de las medias y el máximo.
        const fp = (doc(t.dia).fc_puntos ??= [])
        const mismo = fp.find((x) => x[0] === t.hora)
        if (mismo) { mismo[1] = Math.round((mismo[1] + media) / 2); mismo[2] = Math.max(mismo[2], Math.round(max)) }
        else fp.push([t.hora, Math.round(media), Math.round(max)])
      } else if (nombre === 'resting_heart_rate') {
        const v = numero(p.qty)
        if (v == null) continue
        doc(t.dia).fc = { ...doc(t.dia).fc, reposo: Math.round(v) }
      } else if (nombre === 'heart_rate_variability' || nombre === 'heart_rate_variability_sdnn') {
        const v = numero(p.qty)
        if (v == null) continue
        ;(doc(t.dia).vfc ??= []).push([t.hora, Math.round(v)])
      } else if (nombre === 'blood_oxygen_saturation' || nombre === 'oxygen_saturation') {
        let v = numero(p.qty)
        if (v == null) continue
        if (v <= 1) v *= 100 // por si llega en tanto por uno
        ;(doc(t.dia).spo2 ??= []).push([t.hora, Math.round(v)])
      } else continue
      fuentes(t.dia, p)
      n++
    }
  }
  return { porDia, metricas: [...new Set(vistas)], n }
}

async function guardar(userId: string, porDia: Record<string, Doc>) {
  const dias = Object.keys(porDia)
  if (!dias.length) return
  const prev = await admin.from('entries').select('id,day,value').eq('user_id', userId).eq('module', MODULO).eq('kind', 'dia').in('day', dias).is('deleted_at', null)
  if (prev.error) throw new Error(prev.error.message)
  const hay = new Map((prev.data as { id: string; day: string; value: Doc }[]).map((r) => [r.day, r]))
  const ahora = new Date().toISOString()
  for (const dia of dias) {
    const nuevo = porDia[dia]
    const viejo = hay.get(dia)?.value ?? {}
    const d: Doc = rehacer({
      ...viejo,
      ta: nuevo.ta ? unir(viejo.ta, nuevo.ta, (x) => x.hora) : viejo.ta,
      fc_puntos: nuevo.fc_puntos ? unir(viejo.fc_puntos, nuevo.fc_puntos, (x) => x[0]) : viejo.fc_puntos,
      vfc: nuevo.vfc ? unir(viejo.vfc, nuevo.vfc, (x) => x[0]) : viejo.vfc,
      spo2: nuevo.spo2 ? unir(viejo.spo2, nuevo.spo2, (x) => x[0]) : viejo.spo2,
      fc: { ...viejo.fc, ...nuevo.fc },
      fuentes: [...new Set([...(viejo.fuentes ?? []), ...(nuevo.fuentes ?? [])])],
      actualizado: ahora,
    })
    for (const k of Object.keys(d) as (keyof Doc)[]) if (d[k] == null || (Array.isArray(d[k]) && !(d[k] as unknown[]).length)) delete d[k]
    const fila = hay.get(dia)
    const r = fila
      ? await admin.from('entries').update({ value: d }).eq('id', fila.id).eq('user_id', userId)
      : await admin.from('entries').insert({ user_id: userId, module: MODULO, kind: 'dia', day: dia, value: d })
    if (r.error) throw new Error(r.error.message)
  }
}

// ---------- Entrada ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no admitido' }, 405)
  try {
    const url = new URL(req.url)
    const clave = url.searchParams.get('t') ?? req.headers.get('x-clave-reloj') ?? ''

    // Llegada de datos desde Health Auto Export.
    if (clave) {
      const fila = await filaPorClave(clave)
      if (!fila) return json({ error: 'Clave no válida' }, 401)
      const cuerpo = await req.json().catch(() => null)
      if (!cuerpo) return json({ error: 'No es un JSON válido' }, 400)
      const { porDia, metricas, n } = repartir(cuerpo)
      await guardar(fila.user_id, porDia)
      const dias = Object.keys(porDia).sort()
      const s = fila.state ?? {}
      const state: Estado = {
        ultima: new Date().toISOString(),
        recibidos: (s.recibidos ?? 0) + n,
        desde: [s.desde, dias[0]].filter(Boolean).sort()[0] ?? null,
        metricas: [...new Set([...(s.metricas ?? []), ...metricas])],
      }
      const u = await admin.from('integrations').update({ state }).eq('user_id', fila.user_id).eq('provider', PROVIDER)
      if (u.error) throw new Error(u.error.message)
      return json({ ok: true, datos: n, dias: dias.length })
    }

    // Llamadas de la app, con su sesión.
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: quien, error: errQuien } = await admin.auth.getUser(jwt)
    if (errQuien || !quien?.user) return json({ error: 'Sin sesión' }, 401)
    const userId = quien.user.id
    const { accion } = (await req.json().catch(() => ({}))) as { accion?: string }

    if (accion === 'estado') {
      const f = await filaDe(userId)
      return json({ activo: !!f?.secret?.token_hash, ...(f?.state ?? {}) })
    }
    if (accion === 'activar') {
      const clave = b64url(crypto.getRandomValues(new Uint8Array(24)))
      const f = await filaDe(userId)
      const { error } = await admin.from('integrations').upsert({ user_id: userId, provider: PROVIDER, secret: { token_hash: await huella(clave) }, state: f?.state ?? {} })
      if (error) throw new Error(error.message)
      return json({ activo: true, url: `${SUPABASE_URL}/functions/v1/reloj?t=${clave}`, ...(f?.state ?? {}) })
    }
    if (accion === 'desactivar') {
      const { error } = await admin.from('integrations').update({ secret: {} }).eq('user_id', userId).eq('provider', PROVIDER)
      if (error) throw new Error(error.message)
      return json({ activo: false })
    }
    return json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
