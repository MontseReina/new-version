// New Version — envío de notificaciones Web Push (RFC 8030), con firma VAPID (RFC 8292) y contenido
// cifrado aes128gcm (RFC 8291). Solo usa WebCrypto: funciona igual en Deno (Supabase) y en Node.

export type Suscripcion = { endpoint: string; keys: { p256dh: string; auth: string } }

type Bytes = Uint8Array<ArrayBuffer>
const enc = new TextEncoder()
const texto8 = (t: string): Bytes => new Uint8Array(enc.encode(t))
export const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const desB64url = (s: string): Bytes => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const unir = (...partes: Uint8Array[]): Bytes => {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of partes) { out.set(p, i); i += p.length }
  return out
}
async function hmac(clave: Bytes, datos: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', clave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, datos))
}

/** Clave privada VAPID (`d`, base64url) con su pública (punto sin comprimir, base64url) → clave para firmar. */
async function clavePrivada(publica: string, privada: string): Promise<CryptoKey> {
  const p = desB64url(publica)
  const jwk = { kty: 'EC', crv: 'P-256', d: privada, x: b64url(p.slice(1, 33)), y: b64url(p.slice(33, 65)), ext: true }
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** Cabecera Authorization con la firma VAPID para el servicio de avisos de ese endpoint. */
export async function vapid(endpoint: string, publica: string, privada: string, sujeto: string): Promise<string> {
  const aud = new URL(endpoint).origin
  const cab = b64url(texto8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const cuerpo = b64url(texto8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: sujeto })))
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await clavePrivada(publica, privada), texto8(`${cab}.${cuerpo}`))
  return `vapid t=${cab}.${cuerpo}.${b64url(firma)}, k=${publica}`
}

/** Cifra el contenido para una suscripción (un solo registro aes128gcm). */
export async function cifrar(sub: Suscripcion, texto: string): Promise<Bytes> {
  const uaPub = desB64url(sub.keys.p256dh)
  const auth = desB64url(sub.keys.auth)
  const par = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const secreto = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, par.privateKey, 256))

  // IKM = HKDF(auth, secreto, "WebPush: info" || 0 || ua_public || as_public, 32)
  const prkKey = await hmac(auth, secreto)
  const ikm = await hmac(prkKey, unir(texto8('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])))
  const sal: Bytes = crypto.getRandomValues(new Uint8Array(16))
  const prk = await hmac(sal, ikm)
  const cek = (await hmac(prk, unir(texto8('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, unir(texto8('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)

  const claveAes = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const datos = unir(texto8(texto), new Uint8Array([2])) // 2 = último registro
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, claveAes, datos))
  const rs = new Uint8Array([0, 0, 0x10, 0]) // tamaño de registro: 4096
  return unir(sal, rs, new Uint8Array([asPub.length]), asPub, cifrado)
}

export interface Resultado { ok: boolean; estado: number; caducada: boolean; detalle?: string }

/** Envía un aviso. `caducada` = la suscripción ya no vale (el móvil la retiró) y hay que borrarla. */
export async function enviar(sub: Suscripcion, contenido: unknown, v: { publica: string; privada: string; sujeto: string }, ttl = 3600): Promise<Resultado> {
  const cuerpo = await cifrar(sub, JSON.stringify(contenido))
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapid(sub.endpoint, v.publica, v.privada, v.sujeto),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: 'high',
    },
    body: cuerpo,
  })
  const detalle = r.ok ? undefined : (await r.text().catch(() => '')).slice(0, 300)
  return { ok: r.ok, estado: r.status, caducada: r.status === 404 || r.status === 410, detalle }
}
