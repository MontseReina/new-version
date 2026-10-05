import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSettings } from '../../store/useSettings'
import { leerGrupos, type SintCfg } from './logica'

/** Texto de un enlace de configuración (base64 para direcciones) a texto normal. */
function descifrar(datos: string): string | null {
  try {
    const bin = atob(datos.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch { return null }
}

/**
 * Carga los grupos de Signos y síntomas desde un enlace. La configuración viaja en el propio
 * enlace y se guarda en los ajustes de la usuaria; así sus opciones no están en el código.
 */
export default function Cargar() {
  const { datos } = useParams()
  const nav = useNavigate()
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const grupos = useMemo(() => { const t = datos ? descifrar(datos) : null; return t ? leerGrupos(t) : null }, [datos])

  const guardar = async () => {
    if (!grupos) return
    setEstado('guardando')
    try { await saveCfg({ grupos }); nav('/sintomas', { replace: true }) } catch { setEstado('error') }
  }

  return (
    <div>
      <h1>Cargar mis grupos</h1>
      {!grupos ? (
        <div className="card">
          <p>El enlace no trae una configuración válida. No se ha cambiado nada.</p>
          <Link className="btn secondary" to="/sintomas">Ir a Signos y síntomas</Link>
        </div>
      ) : (
        <div className="card">
          <p>Este enlace trae <strong>{grupos.length} grupos</strong> para Signos y síntomas:</p>
          <p className="muted">{grupos.map((g) => g.nombre).join(' · ')}</p>
          <p className="muted small">Sustituyen a los grupos que ves ahora. Lo que ya hayas registrado se conserva.</p>
          {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
          <div className="row">
            <button type="button" className="btn" disabled={!cfg || estado === 'guardando'} onClick={() => void guardar()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar mis grupos'}</button>
            <Link className="btn ghost" to="/sintomas">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  )
}
