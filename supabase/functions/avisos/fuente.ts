// New Version — avisos al móvil (Supabase Edge Function).
//
// FUENTE. Lo que se despliega es `index.ts`, generado con `npm run build:avisos` (une este fichero con las
// reglas de la app, `src/modules/avisos/reglas.ts`, en un solo fichero que se pega en el panel de Supabase).
//
// Qué hace:
//  · POST {accion} con la sesión de la usuaria (desde la app):
//      'clave'      clave pública para suscribirse
//      'suscribir'  guarda la suscripción de este móvil  {sub, dispositivo}
//      'baja'       la borra                            {endpoint}
//      'estado'     cuántos móviles tienen los avisos y los últimos enviados
//      'prueba'     envía un aviso de prueba a sus móviles
//  · POST {accion: 'revisar'} con la cabecera x-avisos-secreto (desde la tarea programada de la base de datos,
//    cada cinco minutos): para cada usuaria con avisos, mira qué toca y lo envía una sola vez al día.
//
// Secretos (Supabase → Edge Functions → Secrets): VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mailto:…),
// AVISOS_SECRETO. Se despliega con «Verify JWT» desactivado: la tarea programada llega sin sesión.
// Las suscripciones y lo enviado se guardan en `integrations` (provider = 'avisos'), que la app no puede leer.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { addDays } from '../../../src/lib/dates'
import { avisosAhora, discreto, filtrar, type Aviso, type AvisosCfg } from '../../../src/modules/avisos/reglas'
import { crearModelo, infoDia, type CicloCfg, type CicloDia } from '../../../src/modules/ciclo/logica'
import type { HidraCfg, HidraDia } from '../../../src/modules/hidratacion/logica'
import { menuDe, type NutriCfg, type NutriDia } from '../../../src/modules/nutricion/logica'
import type { ObjCfg } from '../../../src/modules/objetivos/logica'
import { enviar, type Suscripcion } from './webpush'

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void }

const APP_URL = Deno.env.get('APP_URL') ?? 'https://montsereina.github.io/new-version/'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID = { publica: Deno.env.get('VAPID_PUBLIC') ?? '', privada: Deno.env.get('VAPID_PRIVATE') ?? '', sujeto: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:avisos@example.com' }
const SECRETO = Deno.env.get('AVISOS_SECRETO') ?? ''
const PROVIDER = 'avisos'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const cors = {
  'Access-Control-Allow-Origin': new URL(APP_URL).origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Movil = Suscripcion & { dispositivo?: string; alta?: string }
type Fila = { secret: { subs?: Movil[] }; state: { enviados?: { [dia: string]: { [clave: string]: number } }; ultimos?: { cuando: string; titulo: string; cuerpo: string }[] } }

async function leerFila(userId: string): Promise<Fila | null> {
  const { data, error } = await admin.from('integrations').select('secret,state').eq('user_id', userId).eq('provider', PROVIDER).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Fila | null
}
async function guardarFila(userId: string, f: Fila) {
  const { error } = await admin.from('integrations').upsert({ user_id: userId, provider: PROVIDER, secret: f.secret, state: f.state })
  if (error) throw new Error(error.message)
}

/** Fecha (AAAA-MM-DD) y minuto del día en la zona horaria de la usuaria. */
function ahoraEn(tz: string, d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]))
  return { hoy: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute), hm: `${p.hour}:${p.minute}` }
}

async function diario<T>(userId: string, modulo: string, desde: string, hasta: string): Promise<Map<string, T>> {
  const { data, error } = await admin.from('entries').select('day,value').eq('user_id', userId).eq('module', modulo).eq('kind', 'dia')
    .gte('day', desde).lte('day', hasta).is('deleted_at', null)
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((r: { day: string; value: T }) => [r.day, r.value]))
}

/** Envía un aviso a todos los móviles de la usuaria. Devuelve los móviles que siguen valiendo. */
async function mandar(subs: Movil[], a: Aviso, ttl: number): Promise<{ vivas: Movil[]; enviado: boolean; fallos: string[] }> {
  const vivas: Movil[] = [], fallos: string[] = []
  let enviado = false
  for (const s of subs) {
    try {
      const r = await enviar(s, { titulo: a.titulo, cuerpo: a.cuerpo, ruta: a.ruta, tag: a.clave }, VAPID, ttl)
      if (r.ok) enviado = true
      else fallos.push(`${r.estado} ${r.detalle ?? ''}`.trim())
      if (!r.caducada) vivas.push(s)
    } catch (e) { fallos.push(String(e)); vivas.push(s) }
  }
  return { vivas, enviado, fallos }
}

/** Revisa los avisos de una usuaria y envía los que tocan ahora. */
async function revisar(userId: string, fila: Fila) {
  const { data: perfil } = await admin.from('profiles').select('timezone').eq('id', userId).maybeSingle()
  const tz = (perfil as { timezone?: string } | null)?.timezone || 'Europe/Madrid'
  const { hoy, min, hm } = ahoraEn(tz)
  const { data: ajustes } = await admin.from('settings').select('data').eq('user_id', userId).maybeSingle()
  const cfg = ((ajustes as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>
  const nutriCfg = (cfg.nutricion ?? {}) as NutriCfg
  const ayer = addDays(hoy, -1)
  const [nutri, hidra, ciclo] = await Promise.all([
    diario<NutriDia>(userId, 'nutricion', ayer, hoy),
    diario<HidraDia>(userId, 'hidratacion', hoy, hoy),
    diario<CicloDia>(userId, 'ciclo', addDays(hoy, -400), hoy),
  ])
  const mapa = Object.fromEntries(ciclo)
  const info = infoDia(crearModelo(mapa, (cfg.ciclo ?? {}) as CicloCfg, hoy), mapa, hoy)
  const avisosCfg = (cfg.avisos ?? {}) as AvisosCfg
  const todos = avisosAhora({
    hoy, ahoraMin: min, cfg: avisosCfg, nutriCfg, hidraCfg: (cfg.hidratacion ?? null) as HidraCfg | null, objCfg: (cfg.objetivos ?? {}) as ObjCfg,
    menu: menuDe(nutriCfg, info, hoy), nutriHoy: nutri.get(hoy) ?? {}, nutriAyer: nutri.get(ayer) ?? null, hidraHoy: hidra.get(hoy) ?? {},
  })
  const enviados = { ...(fila.state.enviados?.[hoy] ?? {}) }
  const nuevos = filtrar(todos, enviados, min)
  let subs = fila.secret.subs ?? []
  const ultimos = [...(fila.state.ultimos ?? [])]
  const fallos: string[] = []
  for (const a of nuevos) {
    const r = await mandar(subs, avisosCfg.texto === 'discreto' ? discreto(a) : a, 3600)
    subs = r.vivas
    fallos.push(...r.fallos)
    // Se da por enviado aunque falle, para no repetirlo cada cinco minutos.
    enviados[a.clave] = min
    if (r.enviado) ultimos.unshift({ cuando: `${hoy} ${hm}`, titulo: a.titulo, cuerpo: a.cuerpo })
  }
  if (!nuevos.length && subs.length === (fila.secret.subs ?? []).length) return { enviados: 0 }
  // Solo se guardan hoy y ayer.
  const guardados = Object.fromEntries(Object.entries(fila.state.enviados ?? {}).filter(([d]) => d >= ayer))
  await guardarFila(userId, { secret: { ...fila.secret, subs }, state: { ...fila.state, enviados: { ...guardados, [hoy]: enviados }, ultimos: ultimos.slice(0, 20), ...(fallos.length ? { fallo: { cuando: `${hoy} ${hm}`, detalle: fallos.slice(0, 3) } } : {}) } })
  return { enviados: nuevos.length, fallos: fallos.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no admitido' }, 405)
  try {
    const cuerpo = (await req.json().catch(() => ({}))) as { accion?: string; sub?: Movil; dispositivo?: string; endpoint?: string }

    // Tarea programada: revisar a todas las usuarias con avisos.
    if (cuerpo.accion === 'revisar') {
      if (!SECRETO || req.headers.get('x-avisos-secreto') !== SECRETO) return json({ error: 'No autorizado' }, 401)
      if (!VAPID.publica || !VAPID.privada) return json({ error: 'Faltan las claves VAPID en el servidor.' }, 500)
      const { data, error } = await admin.from('integrations').select('user_id,secret,state').eq('provider', PROVIDER)
      if (error) throw new Error(error.message)
      const res: unknown[] = []
      for (const f of (data ?? []) as (Fila & { user_id: string })[]) {
        if (!f.secret?.subs?.length) continue
        try { res.push(await revisar(f.user_id, f)) } catch (e) { res.push({ error: String(e) }) }
      }
      return json({ ok: true, usuarias: res.length, res })
    }

    // Llamadas desde la app, con la sesión de la usuaria.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: quien, error: errQuien } = await admin.auth.getUser(jwt)
    if (errQuien || !quien?.user) return json({ error: 'Sesión no válida' }, 401)
    const userId = quien.user.id
    const fila: Fila = (await leerFila(userId)) ?? { secret: {}, state: {} }

    if (cuerpo.accion === 'clave') {
      if (!VAPID.publica) return json({ error: 'Faltan las claves de los avisos en el servidor.' }, 500)
      return json({ clave: VAPID.publica })
    }
    if (cuerpo.accion === 'estado') {
      return json({ moviles: (fila.secret.subs ?? []).map((s) => ({ endpoint: s.endpoint, dispositivo: s.dispositivo ?? '', alta: s.alta ?? '' })), ultimos: fila.state.ultimos ?? [] })
    }
    if (cuerpo.accion === 'suscribir') {
      const s = cuerpo.sub
      if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth || !/^https:\/\//.test(s.endpoint)) return json({ error: 'Suscripción no válida' }, 400)
      const subs = (fila.secret.subs ?? []).filter((x) => x.endpoint !== s.endpoint)
      subs.push({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, dispositivo: (cuerpo.dispositivo ?? '').slice(0, 60), alta: new Date().toISOString() })
      await guardarFila(userId, { ...fila, secret: { ...fila.secret, subs: subs.slice(-5) } })
      return json({ ok: true })
    }
    if (cuerpo.accion === 'baja') {
      const subs = (fila.secret.subs ?? []).filter((x) => x.endpoint !== cuerpo.endpoint)
      await guardarFila(userId, { ...fila, secret: { ...fila.secret, subs } })
      return json({ ok: true })
    }
    if (cuerpo.accion === 'prueba') {
      const subs = fila.secret.subs ?? []
      if (!subs.length) return json({ error: 'No hay ningún móvil con los avisos activados.' }, 400)
      const r = await mandar(subs, { clave: 'prueba', id: 'ayuno', titulo: 'New Version', cuerpo: 'Aviso de prueba: los avisos llegan a este móvil.', ruta: 'avisos' }, 600)
      if (r.vivas.length !== subs.length) await guardarFila(userId, { ...fila, secret: { ...fila.secret, subs: r.vivas } })
      return r.enviado ? json({ ok: true }) : json({ error: 'No se ha podido enviar: ' + (r.fallos[0] ?? 'sin respuesta') }, 502)
    }
    return json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500)
  }
})
