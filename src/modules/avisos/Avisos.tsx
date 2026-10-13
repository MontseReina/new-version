import { useEffect, useState } from 'react'
import { Field } from '../../components/ui'
import { DEMO, invocar } from '../../store/repo'
import { useSettings } from '../../store/useSettings'
import { AGUA_HORA, AGUA_ML, AVISOS, KCAL_HORA, SILENCIO_DESDE, SILENCIO_HASTA, activo, type AvisoId, type AvisosCfg } from './reglas'

type Estado = { moviles: { endpoint: string; dispositivo: string; alta: string }[]; ultimos: { cuando: string; titulo: string; cuerpo: string }[] }

const esIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const admite = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const clave8 = (b64: string) => {
  const t = b64.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0))
}
const nombreMovil = () => {
  const ua = navigator.userAgent
  return /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'Otro'
}

/** Avisos al móvil: activarlos en este dispositivo, elegir cuáles y a qué hora, y ver los últimos enviados. */
export default function Avisos() {
  const [cfg, saveCfg] = useSettings<AvisosCfg>('avisos')
  const [suscrito, setSuscrito] = useState<PushSubscription | null>(null)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const permiso = admite() ? Notification.permission : 'default'

  const recargar = () => {
    if (DEMO) return
    invocar<Estado>('avisos', { accion: 'estado' }).then(setEstado, () => {})
  }
  useEffect(() => {
    recargar()
    if (admite()) navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(setSuscrito, () => {})
  }, [])

  const activar = async () => {
    setOcupado(true); setMsg('')
    try {
      const p = await Notification.requestPermission()
      if (p !== 'granted') { setMsg('El móvil no ha dado permiso para los avisos. Puedes darlo en Ajustes del móvil → Notificaciones → New Version.'); return }
      const { clave } = await invocar<{ clave: string }>('avisos', { accion: 'clave' })
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave8(clave) }))
      await invocar('avisos', { accion: 'suscribir', sub: JSON.parse(JSON.stringify(sub)), dispositivo: nombreMovil() })
      setSuscrito(sub)
      setMsg('Avisos activados en este móvil. Pulsa «Enviar un aviso de prueba» para comprobarlo.')
      recargar()
    } catch (e) {
      setMsg('No se han podido activar: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setOcupado(false) }
  }
  const desactivar = async () => {
    if (!suscrito) return
    setOcupado(true); setMsg('')
    try {
      await invocar('avisos', { accion: 'baja', endpoint: suscrito.endpoint })
      await suscrito.unsubscribe()
      setSuscrito(null)
      setMsg('Avisos desactivados en este móvil.')
      recargar()
    } catch (e) { setMsg('No se han podido desactivar: ' + (e instanceof Error ? e.message : String(e))) } finally { setOcupado(false) }
  }
  const probar = async () => {
    setOcupado(true); setMsg('')
    try { await invocar('avisos', { accion: 'prueba' }); setMsg('Aviso de prueba enviado. Debería llegar en unos segundos.') }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)) } finally { setOcupado(false) }
  }

  const c = cfg ?? {}
  const poner = (id: AvisoId, v: boolean) => void saveCfg({ activos: { ...(c.activos ?? {}), [id]: v } })
  const hora = (k: 'agua_hora' | 'kcal_hora' | 'silencio_desde' | 'silencio_hasta', def: string, label: string) => (
    <Field label={label}>
      <input type="time" defaultValue={c[k] ?? def} key={k + (c[k] ?? '')} onBlur={(e) => { if (e.target.value && e.target.value !== (c[k] ?? def)) void saveCfg({ [k]: e.target.value }) }} />
    </Field>
  )

  return (
    <div>
      <h1>Avisos en el móvil</h1>
      <p className="muted">Te llegan como las notificaciones de cualquier app, en la pantalla bloqueada, aunque la app esté cerrada. Se revisan cada cinco minutos con lo que hayas anotado: si comes o bebes sin anotarlo, el aviso llega igual.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Este móvil</h2>
        {DEMO ? <p className="muted">En la demostración no se pueden activar avisos.</p>
          : esIos() && !instalada() ? (
            <div className="notice small">En iPhone, los avisos solo funcionan con la app en la pantalla de inicio. Ábrela en Safari, pulsa Compartir → «Añadir a pantalla de inicio» y entra desde ese icono. Después vuelve a esta página.</div>
          ) : !admite() ? (
            <div className="notice small">Este navegador no admite avisos. En iPhone hace falta iOS 16.4 o posterior y abrir la app desde su icono de la pantalla de inicio.</div>
          ) : suscrito ? (
            <>
              <p><span className="dot verde" /> Avisos activados en este móvil.</p>
              <div className="row">
                <button type="button" className="btn" disabled={ocupado} onClick={() => void probar()}>Enviar un aviso de prueba</button>
                <button type="button" className="btn ghost" disabled={ocupado} onClick={() => void desactivar()}>Desactivar en este móvil</button>
              </div>
            </>
          ) : (
            <>
              <p>{permiso === 'denied' ? 'Este móvil tiene los avisos bloqueados para la app. Actívalos en Ajustes del móvil → Notificaciones → New Version y vuelve aquí.' : 'Todavía no están activados en este móvil.'}</p>
              <button type="button" className="btn" disabled={ocupado || permiso === 'denied'} onClick={() => void activar()}>{ocupado ? 'Activando…' : 'Activar avisos en este móvil'}</button>
            </>
          )}
        {msg && <p role="status" className="small">{msg}</p>}
        {estado && estado.moviles.length > 0 && (
          <p className="muted small">Móviles con avisos: {estado.moviles.map((m) => m.dispositivo || 'sin nombre').join(', ')}.</p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Qué avisos quiero</h2>
        {!cfg ? <p className="muted">Cargando…</p> : AVISOS.map((a) => (
          <label key={a.id} className="check">
            <input type="checkbox" checked={activo(c, a.id)} onChange={(e) => poner(a.id, e.target.checked)} />
            <span><strong>{a.nombre}</strong><br /><span className="muted small">{a.detalle}</span></span>
          </label>
        ))}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Horas y cantidades</h2>
        <div className="grid2">
          {hora('agua_hora', AGUA_HORA, 'Agua: hora del aviso')}
          <Field label="Agua: mínimo a esa hora (ml)">
            <input type="number" inputMode="numeric" min={0} step={50} defaultValue={c.agua_ml ?? AGUA_ML} key={'ml' + (c.agua_ml ?? '')}
              onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== (c.agua_ml ?? AGUA_ML)) void saveCfg({ agua_ml: v }) }} />
          </Field>
          {hora('kcal_hora', KCAL_HORA, 'Kilocalorías: aviso de media tarde')}
          <Field label="En rango a partir de (% de lo previsto)">
            <input type="number" inputMode="numeric" min={50} max={100} defaultValue={c.rango_pct ?? 90} key={'r' + (c.rango_pct ?? '')}
              onBlur={(e) => { const v = Number(e.target.value); if (v >= 50 && v <= 100 && v !== (c.rango_pct ?? 90)) void saveCfg({ rango_pct: v }) }} />
          </Field>
          {hora('silencio_desde', SILENCIO_DESDE, 'Sin avisos desde')}
          {hora('silencio_hasta', SILENCIO_HASTA, 'Sin avisos hasta')}
        </div>
        <p className="muted small">Las horas de ayuno, de la cena y de irte a dormir salen de Nutrición (Mis horarios y reglas). Las kilocalorías se comparan con lo previsto en tu menú del día o, si tu nutricionista te pauta una cifra, con esa cifra.</p>
        <Field label="En la pantalla bloqueada">
          <select value={c.texto ?? 'completo'} onChange={(e) => void saveCfg({ texto: e.target.value as AvisosCfg['texto'] })}>
            <option value="completo">El aviso completo</option>
            <option value="discreto">Solo «Tienes un aviso de Nutrición»</option>
          </select>
        </Field>
      </div>

      {estado && estado.ultimos.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Últimos avisos enviados</h2>
          {estado.ultimos.slice(0, 8).map((u, i) => (
            <p key={i} className="small"><span className="muted">{u.cuando.slice(8, 10)}/{u.cuando.slice(5, 7)} {u.cuando.slice(11)} · </span><strong>{u.titulo}</strong>: {u.cuerpo}</p>
          ))}
        </div>
      )}
    </div>
  )
}
