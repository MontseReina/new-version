import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

/** Entrada sin contraseña: correo y código de 6 cifras. Funciona también con la app instalada en el iPhone. */
export function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (error) setError('No se pudo enviar el código. Comprueba el correo y vuelve a intentarlo.')
    else setStep('code')
  }
  async function verify(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('El código no es válido o ha caducado. Pide uno nuevo.')
  }

  return (
    <main className="login">
      <h1>New Version</h1>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="stack">
          <p className="muted">Escribe tu correo y te enviamos un código para entrar.</p>
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="stack">
          <p className="muted">Hemos enviado un código a {email}.</p>
          <label htmlFor="code">Código</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value)} />
          <button className="btn" disabled={busy}>{busy ? 'Comprobando…' : 'Entrar'}</button>
          <button type="button" className="link" onClick={() => { setStep('email'); setCode(''); setError('') }}>Usar otro correo</button>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </main>
  )
}
