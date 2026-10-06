import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSettings } from '../../store/useSettings'
import { MENUS, leerCfg, type MenuId, type NutriCfg } from './logica'

/** Texto de un enlace de configuración (base64 para direcciones) a texto normal. */
function descifrar(datos: string): string | null {
  try {
    const bin = atob(datos.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch { return null }
}

/**
 * Carga menús, platos y horarios de Nutrición desde un enlace. La configuración viaja en el
 * propio enlace y se guarda en los ajustes de la usuaria; así sus menús no están en el código.
 */
export default function CargarNutricion() {
  const { datos } = useParams()
  const nav = useNavigate()
  const [cfg, saveCfg] = useSettings<NutriCfg>('nutricion')
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const nuevo = useMemo(() => { const t = datos ? descifrar(datos) : null; return t ? leerCfg(t) : null }, [datos])

  const guardar = async () => {
    if (!nuevo) return
    setEstado('guardando')
    try { await saveCfg(nuevo); nav('/nutricion', { replace: true }) } catch { setEstado('error') }
  }
  const menus = (Object.keys(nuevo?.menus ?? {}) as MenuId[]).map((k) => `${MENUS[k] ?? k} (${nuevo!.menus![k]!.dias.length} días)`)

  return (
    <div>
      <h1>Cargar mis menús</h1>
      {!nuevo ? (
        <div className="card">
          <p>El enlace no trae una configuración válida. No se ha cambiado nada.</p>
          <Link className="btn secondary" to="/nutricion">Ir a Nutrición</Link>
        </div>
      ) : (
        <div className="card">
          <p>Este enlace trae <strong>{nuevo.tomas!.length} tomas</strong> y <strong>{Object.keys(nuevo.platos ?? {}).length} platos</strong> para Nutrición:</p>
          <p className="muted">{nuevo.tomas!.map((t) => t.nombre).join(' · ')}</p>
          {menus.length > 0 && <p className="muted">{menus.join(' · ')}</p>}
          <p className="muted small">Sustituyen a los menús y horarios que ves ahora. Lo que ya hayas registrado se conserva.</p>
          {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
          <div className="row">
            <button type="button" className="btn" disabled={!cfg || estado === 'guardando'} onClick={() => void guardar()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar mis menús'}</button>
            <Link className="btn ghost" to="/nutricion">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  )
}
