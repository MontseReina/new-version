// New Version — unión con Google Calendar (Supabase Edge Function).
//
// Qué hace:
//  · GET  ?code&state  → vuelta de Google tras dar permiso: guarda el permiso y devuelve a la app.
//  · POST {accion}     → llamadas de la app, con la sesión de la usuaria:
//      'estado'       ¿está unida?
//      'url'          dirección de Google para dar permiso
//      'sincronizar'  sube a Google lo cambiado en la app y baja lo cambiado en Google
//      'desconectar'  retira el permiso
//
// Solo toca un calendario propio llamado «New Version» (permiso calendar.app.created): no ve los demás.
// A Google viajan título, día, hora, lugar y notas de cada evento; nada más.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
// Hay que desplegarla con «Verify JWT» desactivado: la vuelta de Google llega sin sesión.
// La sesión de la app se comprueba aquí dentro.
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://montsereina.github.io/new-version/'
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const REDIRECT = `${SUPABASE_URL}/functions/v1/google-calendar`
const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'
const PROVIDER = 'google_calendar'
const MODULO = 'calendario'
const NOMBRE_CALENDARIO = 'New Version'
const API = 'https://www.googleapis.com/calendar/v3'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const cors = {
  'Access-Control-Allow-Origin': new URL(APP_URL).origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const volver = (resultado: string) =>
  new Response(null, { status: 302, headers: { Location: `${APP_URL}#/calendario?google=${resultado}` } })

// ---------- Firma del parámetro `state` (para saber de quién es la vuelta de Google) ----------
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
type Fila = { secret: Record<string, any>; state: Record<string, any> }
async function leerFila(userId: string): Promise<Fila | null> {
  const { data, error } = await admin.from('integrations').select('secret,state').eq('user_id', userId).eq('provider', PROVIDER).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Fila | null
}
async function guardarFila(userId: string, f: Fila) {
  const { error } = await admin.from('integrations').upsert({ user_id: userId, provider: PROVIDER, secret: f.secret, state: f.state })
  if (error) throw new Error(error.message)
}

// ---------- Google ----------
async function pedirToken(params: Record<string, string>) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  })
  return { ok: r.ok, data: await r.json().catch(() => ({})) as Record<string, any> }
}
async function g(token: string, metodo: string, ruta: string, cuerpo?: unknown) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const data = r.status === 204 ? {} : await r.json().catch(() => ({}))
  return { status: r.status, ok: r.ok, data: data as Record<string, any> }
}
const fallo = (que: string, r: { status: number; data: Record<string, any> }) =>
  new Error(`${que}: Google respondió ${r.status}${r.data?.error?.message ? ' — ' + r.data.error.message : ''}`)

// ---------- Paso de evento de la app a Google y al revés ----------
type Campos = { titulo: string; dia: string; hora: string | null; hora_fin: string | null; lugar: string | null; nota: string | null }
const limpio = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const camposDeFila = (row: any): Campos => ({
  titulo: limpio(row.value?.titulo) ?? '', dia: row.day, hora: limpio(row.value?.hora), hora_fin: limpio(row.value?.hora_fin),
  lugar: limpio(row.value?.lugar), nota: limpio(row.note),
})
async function huella(c: Campos): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([c.titulo, c.dia, c.hora, c.hora_fin, c.lugar, c.nota])))
  return b64url(buf).slice(0, 22)
}
function diaSiguiente(dia: string): string {
  const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
function aGoogle(c: Campos, tz: string) {
  const base = { summary: c.titulo || '(sin título)', location: c.lugar ?? '', description: c.nota ?? '' }
  if (!c.hora) return { ...base, start: { date: c.dia }, end: { date: diaSiguiente(c.dia) } }
  let finDia = c.dia
  let fin = c.hora_fin
  if (!fin || fin <= c.hora) {
    // Sin hora de fin: una hora de duración.
    const [h, m] = c.hora.split(':').map(Number)
    const total = h * 60 + m + 60
    if (total >= 24 * 60) finDia = diaSiguiente(c.dia)
    fin = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  return { ...base, start: { dateTime: `${c.dia}T${c.hora}:00`, timeZone: tz }, end: { dateTime: `${finDia}T${fin}:00`, timeZone: tz } }
}
function enZona(iso: string, tz: string): { dia: string; hora: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}
function deGoogle(ev: any, tz: string): Campos | null {
  const titulo = limpio(ev.summary) ?? '(sin título)'
  const lugar = limpio(ev.location)
  const nota = limpio(ev.description)
  if (ev.start?.date) return { titulo, dia: ev.start.date, hora: null, hora_fin: null, lugar, nota }
  if (!ev.start?.dateTime) return null
  const ini = enZona(ev.start.dateTime, tz)
  const fin = ev.end?.dateTime ? enZona(ev.end.dateTime, tz) : null
  return { titulo, dia: ini.dia, hora: ini.hora, hora_fin: fin && fin.dia === ini.dia && fin.hora > ini.hora ? fin.hora : null, lugar, nota }
}

// ---------- Sincronización en los dos sentidos ----------
async function sincronizar(userId: string) {
  const fila = await leerFila(userId)
  if (!fila?.secret?.refresh_token) return { conectado: false }

  const t = await pedirToken({ grant_type: 'refresh_token', refresh_token: fila.secret.refresh_token })
  if (!t.ok) {
    if (t.data.error === 'invalid_grant') {
      // El permiso ha caducado o se ha retirado desde Google: hay que volver a conectar.
      await guardarFila(userId, { secret: {}, state: { ...fila.state, sync_token: null } })
      return { conectado: false, motivo: 'caducado' }
    }
    throw new Error('Google no ha renovado el permiso: ' + (t.data.error_description ?? t.data.error ?? 'error desconocido'))
  }
  const token = t.data.access_token as string

  const perfil = await admin.from('profiles').select('timezone').eq('id', userId).maybeSingle()
  const tz = (perfil.data as any)?.timezone || 'Europe/Madrid'

  const leerFilas = async () => {
    const r = await admin.from('entries').select('*').eq('user_id', userId).eq('module', MODULO).eq('kind', 'registro')
    if (r.error) throw new Error(r.error.message)
    return r.data as any[]
  }
  let filas = await leerFilas()

  // El calendario propio: si no existe (primera vez, o lo han borrado en Google), se crea.
  let calId = fila.state.calendar_id as string | undefined
  if (calId) {
    const r = await g(token, 'GET', `/calendars/${encodeURIComponent(calId)}`)
    if (r.status === 404 || r.status === 410) calId = undefined
    else if (!r.ok) throw fallo('No se ha podido abrir el calendario', r)
  }
  if (!calId) {
    const r = await g(token, 'POST', '/calendars', { summary: NOMBRE_CALENDARIO, timeZone: tz })
    if (!r.ok) throw fallo('No se ha podido crear el calendario', r)
    calId = r.data.id as string
    fila.state = { ...fila.state, calendar_id: calId, sync_token: null }
    await guardarFila(userId, fila)
    // Calendario nuevo: lo que hubiera unido al anterior se desliga para volver a subirlo.
    for (const row of filas) {
      if (!row.value?.google) continue
      const { google: _g, ...value } = row.value
      const u = await admin.from('entries').update({ value }).eq('id', row.id).eq('user_id', userId)
      if (u.error) throw new Error(u.error.message)
    }
    filas = await leerFilas()
  }
  const cal = encodeURIComponent(calId)

  // 1) Bajar lo que ha cambiado en Google.
  const porGoogle = new Map<string, any>()
  for (const row of filas) if (row.value?.google?.id) porGoogle.set(row.value.google.id, row)
  let bajados = 0, subidos = 0, borrados = 0
  let syncToken = (fila.state.sync_token as string | null) ?? null
  let nuevoToken: string | null = null
  let pagina: string | null = null
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    const q = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true', maxResults: '250' })
    if (pagina) q.set('pageToken', pagina)
    else if (syncToken) q.set('syncToken', syncToken)
    if (pagina && syncToken) q.set('syncToken', syncToken)
    const r = await g(token, 'GET', `/calendars/${cal}/events?${q}`)
    if (r.status === 410) { syncToken = null; pagina = null; continue } // el marcador ha caducado: lectura completa
    if (!r.ok) throw fallo('No se han podido leer los eventos', r)
    for (const ev of (r.data.items ?? []) as any[]) {
      const local = porGoogle.get(ev.id)
      if (ev.status === 'cancelled') {
        if (local && !local.deleted_at) {
          const value = { ...local.value, google: { ...local.value.google, borrado: true } }
          const u = await admin.from('entries').update({ deleted_at: new Date().toISOString(), value }).eq('id', local.id).eq('user_id', userId)
          if (u.error) throw new Error(u.error.message)
          local.deleted_at = 'x'; local.value = value
          borrados++
        }
        continue
      }
      const c = deGoogle(ev, tz)
      if (!c) continue
      const h = await huella(c)
      const google = { id: ev.id, etag: ev.etag, hash: h }
      if (!local) {
        const ins = await admin.from('entries').insert({
          user_id: userId, module: MODULO, kind: 'registro', day: c.dia, note: c.nota,
          value: { titulo: c.titulo, hora: c.hora, hora_fin: c.hora_fin, lugar: c.lugar, google },
        }).select().single()
        if (ins.error) throw new Error(ins.error.message)
        porGoogle.set(ev.id, ins.data); filas.push(ins.data)
        bajados++
        continue
      }
      if (local.deleted_at) continue                       // borrado en la app: se borrará en Google más abajo
      if (local.value.google.etag === ev.etag) continue    // es el mismo cambio que subió la app
      const sucio = (await huella(camposDeFila(local))) !== local.value.google.hash
      if (sucio && new Date(ev.updated ?? 0) <= new Date(local.updated_at)) continue // cambiado en los dos sitios: gana el más reciente
      const value = { ...local.value, titulo: c.titulo, hora: c.hora, hora_fin: c.hora_fin, lugar: c.lugar, google }
      const u = await admin.from('entries').update({ day: c.dia, note: c.nota, value }).eq('id', local.id).eq('user_id', userId)
      if (u.error) throw new Error(u.error.message)
      local.day = c.dia; local.note = c.nota; local.value = value
      bajados++
    }
    pagina = (r.data.nextPageToken as string | undefined) ?? null
    if (!pagina) { nuevoToken = (r.data.nextSyncToken as string | undefined) ?? null; break }
  }

  // 2) Subir lo que ha cambiado en la app.
  for (const row of filas) {
    const gg = row.value?.google as Record<string, any> | undefined
    if (row.deleted_at) {
      if (gg?.id && !gg.borrado) {
        const r = await g(token, 'DELETE', `/calendars/${cal}/events/${encodeURIComponent(gg.id)}`)
        if (!r.ok && r.status !== 404 && r.status !== 410) throw fallo('No se ha podido borrar un evento', r)
        const u = await admin.from('entries').update({ value: { ...row.value, google: { ...gg, borrado: true } } }).eq('id', row.id).eq('user_id', userId)
        if (u.error) throw new Error(u.error.message)
        borrados++
      }
      continue
    }
    const c = camposDeFila(row)
    const h = await huella(c)
    if (gg?.id && gg.hash === h) continue
    let r
    if (gg?.id) {
      r = await g(token, 'PATCH', `/calendars/${cal}/events/${encodeURIComponent(gg.id)}`, aGoogle(c, tz))
      if (r.status === 404 || r.status === 410) {
        // Ya no existe en Google: se había borrado allí.
        const u = await admin.from('entries').update({ deleted_at: new Date().toISOString(), value: { ...row.value, google: { ...gg, borrado: true } } }).eq('id', row.id).eq('user_id', userId)
        if (u.error) throw new Error(u.error.message)
        borrados++
        continue
      }
    } else {
      r = await g(token, 'POST', `/calendars/${cal}/events`, aGoogle(c, tz))
    }
    if (!r.ok) throw fallo('No se ha podido guardar un evento', r)
    const u = await admin.from('entries').update({ value: { ...row.value, google: { id: r.data.id, etag: r.data.etag, hash: h } } }).eq('id', row.id).eq('user_id', userId)
    if (u.error) throw new Error(u.error.message)
    subidos++
  }

  const ultima = new Date().toISOString()
  await guardarFila(userId, { secret: fila.secret, state: { ...fila.state, calendar_id: calId, sync_token: nuevoToken ?? syncToken, ultima } })
  return { conectado: true, subidos, bajados, borrados, ultima, calendario: NOMBRE_CALENDARIO }
}

// ---------- Entrada ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = new URL(req.url)

    // Vuelta de Google tras dar (o negar) el permiso.
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
      await guardarFila(userId, { secret: { refresh_token: t.data.refresh_token }, state: { ...(previa?.state ?? {}), sync_token: null } })
      return volver('ok')
    }

    if (req.method !== 'POST') return json({ error: 'Método no admitido' }, 405)
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: quien, error: errQuien } = await admin.auth.getUser(jwt)
    if (errQuien || !quien?.user) return json({ error: 'Sesión no válida' }, 401)
    const userId = quien.user.id
    const { accion } = await req.json().catch(() => ({})) as { accion?: string }
    const configurado = !!CLIENT_ID && !!CLIENT_SECRET

    if (accion === 'estado') {
      const fila = await leerFila(userId)
      return json({ configurado, conectado: !!fila?.secret?.refresh_token, ultima: fila?.state?.ultima ?? null, calendario: NOMBRE_CALENDARIO })
    }
    if (!configurado) return json({ error: 'Faltan las claves de Google en el servidor.' }, 400)
    if (accion === 'url') {
      const q = new URLSearchParams({
        client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE,
        access_type: 'offline', prompt: 'consent', state: await crearState(userId),
      })
      return json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?' + q })
    }
    if (accion === 'sincronizar') return json(await sincronizar(userId))
    if (accion === 'desconectar') {
      const fila = await leerFila(userId)
      if (fila?.secret?.refresh_token) {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: fila.secret.refresh_token }),
        }).catch(() => null)
        await guardarFila(userId, { secret: {}, state: { ...fila.state, sync_token: null } })
      }
      return json({ conectado: false })
    }
    return json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
