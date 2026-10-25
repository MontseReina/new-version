import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSettings } from '../../store/useSettings'
import { diasTxt, leerRutina, marcables, type BioCfg } from './logica'

/** Texto de un enlace de configuración (base64 para direcciones) a texto normal. */
function descifrar(datos: string): string | null {
  try {
    const bin = atob(datos.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch { return null }
}

/** Carga la rutina de Biohacking desde un enlace. La rutina viaja en el enlace y se guarda en los ajustes;
 *  así sus prácticas no están en el código. */
export default function CargarBiohacking() {
  const { datos } = useParams()
  const nav = useNavigate()
  const [cfg, saveCfg] = useSettings<BioCfg>('biohacking')
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const bloques = useMemo(() => { const t = datos ? descifrar(datos) : null; return t ? leerRutina(t) : null }, [datos])

  const guardar = async () => {
    if (!bloques) return
    setEstado('guardando')
    try { await saveCfg({ bloques }); nav('/biohacking', { replace: true }) } catch { setEstado('error') }
  }

  return (
    <div>
      <h1>Cargar mi rutina</h1>
      {!bloques ? (
        <div className="card">
          <p>El enlace no trae una rutina válida. No se ha cambiado nada.</p>
          <Link className="btn secondary" to="/biohacking">Ir a Biohacking</Link>
        </div>
      ) : (
        <div className="card">
          <p>Este enlace trae <strong>{bloques.length} bloques</strong> para Biohacking:</p>
          <ul className="small">{bloques.map((b) => <li key={b.id}>{b.nombre} · {marcables(b).length} prácticas · {diasTxt(b.dias)}</li>)}</ul>
          <p className="muted small">Sustituyen a la rutina que tengas ahora. Lo que ya hayas marcado se conserva.</p>
          {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
          <div className="row">
            <button type="button" className="btn" disabled={!cfg || estado === 'guardando'} onClick={() => void guardar()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar mi rutina'}</button>
            <Link className="btn ghost" to="/biohacking">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  )
}
