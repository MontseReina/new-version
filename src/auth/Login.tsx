import { useState, type FormEvent } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const TYPES: EmailOtpType[] = ['magiclink', 'signup', 'email', 'invite']

/**
 * Entrada sin contraseña con el enlace que llega por correo.
 * - En el mismo navegador: basta con pulsar el enlace.
 * - Con la app instalada en el móvil (el enlace se abriría en otro navegador): se copia el
 *   enlace del correo y se pega aquí.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [link, setLink] = useState('')
  const [step, setStep] = useState<'email' | 'sent'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    setBusy(false)
    if (error) setError('No se pudo enviar el correo. Comprueba la dirección y vuelve a intentarlo en un minuto.')
    else setStep('sent')
  }

  async function useLink(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    let token = '', type = ''
    try {
      const u = new URL(link.trim())
      token = u.searchParams.get('token') ?? u.searchParams.get('token_hash') ?? ''
      type = u.searchParams.get('type') ?? ''
    } catch { /* no es una dirección */ }
    if (!token || !TYPES.includes(type as EmailOtpType)) {
      setError('Ese texto no es el enlace del correo. Mantén pulsado «Sign in» en el correo, copia el enlace y pégalo entero.')
      return
    }
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: type as EmailOtpType })
    setBusy(false)
    if (error) setError('El enlace no es válido o ha caducado. Pide uno nuevo.')
  }

  return (
    <main className="login">
      <h1>New Version</h1>
      {step === 'email' ? (
        <form onSubmit={send} className="stack">
          <p className="muted">Escribe tu correo y te enviamos un enlace para entrar.</p>
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
        </form>
      ) : (
        <form onSubmit={useLink} className="stack">
          <p>Hemos enviado un correo a {email}. Pulsa el enlace «Sign in» para entrar.</p>
          <p className="muted">Si usas la app instalada en el móvil, copia el enlace del correo y pégalo aquí.</p>
          <label htmlFor="link">Enlace del correo</label>
          <input id="link" type="url" inputMode="url" value={link} onChange={e => setLink(e.target.value)} />
          <button className="btn" disabled={busy || !link.trim()}>{busy ? 'Comprobando…' : 'Entrar con el enlace'}</button>
          <button type="button" className="link" onClick={() => { setStep('email'); setLink(''); setError('') }}>Usar otro correo</button>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </main>
  )
}
