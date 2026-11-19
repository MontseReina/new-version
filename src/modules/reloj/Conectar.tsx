import { useEffect, useState } from 'react'
import { DEMO, invocar } from '../../store/repo'

interface Respuesta { activo?: boolean; url?: string; ultima?: string | null; recibidos?: number; desde?: string | null; metricas?: string[] }

const NOMBRES: Record<string, string> = {
  blood_pressure: 'tensión', heart_rate: 'pulso', resting_heart_rate: 'pulso en reposo',
  heart_rate_variability: 'variabilidad', blood_oxygen_saturation: 'saturación',
}
const cuando = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')

/**
 * Conexión del reloj a través de Health Auto Export: crea la dirección (con su clave) que se pega en la automatización
 * «REST API» de esa app, y enseña cuándo llegaron datos por última vez. La dirección completa solo se ve al crearla.
 */
export function ConectarReloj() {
  const [r, setR] = useState<Respuesta | null>(DEMO ? { activo: true, ultima: new Date().toISOString(), recibidos: 412, metricas: ['blood_pressure', 'heart_rate', 'heart_rate_variability', 'blood_oxygen_saturation'] } : null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (DEMO) return
    invocar<Respuesta>('reloj', { accion: 'estado' }).then(setR, (e: Error) => setError(e.message))
  }, [])
  const llamar = async (accion: 'activar' | 'desactivar') => {
    if (DEMO) { if (accion === 'activar') setUrl('https://…supabase.co/functions/v1/reloj?t=CLAVE-DE-EJEMPLO'); return }
    setOcupado(true); setError(null)
    try {
      const x = await invocar<Respuesta>('reloj', { accion })
      setR(x); setUrl(x.url ?? null)
    } catch (e) { setError((e as Error).message) } finally { setOcupado(false) }
  }
  const copiar = async () => {
    if (!url) return
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sin portapapeles: se copia a mano */ }
  }

  return (
    <div className="reloj-conectar">
      <p className="small" style={{ marginTop: 0 }}>
        La tensión, el pulso, la variabilidad y la saturación del reloj llegan solos desde Apple Salud con la app <b>Health Auto Export</b> del iPhone.
      </p>
      {error && <div className="notice small">{error}</div>}
      {r?.activo ? (
        <div className="small">
          <div>Estado: <b>activo</b></div>
          <div>Últimos datos recibidos: <b>{cuando(r.ultima)}</b>{r.recibidos ? ` · ${r.recibidos} lecturas en total` : ''}</div>
          {!!r.metricas?.length && <div>Llegan: {r.metricas.map((m) => NOMBRES[m] ?? m).join(', ')}</div>}
        </div>
      ) : r && <div className="small muted">Todavía no está conectado.</div>}

      {url ? (
        <div className="reloj-url">
          <div className="small"><b>Tu dirección</b> (pégala en Health Auto Export; funciona como una contraseña, no la compartas):</div>
          <code className="small">{url}</code>
          <div className="row" style={{ gap: '.5rem', marginTop: '.4rem' }}>
            <button type="button" className="btn sm" onClick={() => void copiar()}>{copiado ? 'Copiada ✓' : 'Copiar dirección'}</button>
          </div>
          <ol className="small" style={{ paddingLeft: '1.2rem' }}>
            <li>En Health Auto Export: <b>Automatizaciones</b> → <b>Nueva automatización</b> → tipo <b>REST API</b>.</li>
            <li>En <b>URL</b>, pega la dirección. Formato <b>JSON</b>.</li>
            <li>En <b>Datos</b>, elige Tensión arterial, Frecuencia cardíaca, Frecuencia cardíaca en reposo, Variabilidad de la frecuencia cardíaca y Saturación de oxígeno.</li>
            <li>Activa la automatización y toca <b>Sincronizar ahora</b> para probar.</li>
          </ol>
        </div>
      ) : (
        <div className="row" style={{ gap: '.5rem', marginTop: '.5rem' }}>
          <button type="button" className="btn sm" disabled={ocupado} onClick={() => void llamar('activar')}>{r?.activo ? 'Crear una dirección nueva' : 'Crear mi dirección'}</button>
          {r?.activo && <button type="button" className="btn sm secondary" disabled={ocupado} onClick={() => void llamar('desactivar')}>Desconectar</button>}
        </div>
      )}
      {r?.activo && !url && <p className="muted small">Crear una dirección nueva deja sin valor la anterior: habría que pegar la nueva en Health Auto Export.</p>}
    </div>
  )
}
