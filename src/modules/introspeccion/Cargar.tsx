import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSettings } from '../../store/useSettings'
import { aplicarInforme, leerInforme, type IntroCfg } from './logica'

/** Texto de un enlace de configuración (base64 para direcciones) a texto normal. */
function descifrar(datos: string): string | null {
  try {
    const bin = atob(datos.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch { return null }
}

/**
 * Carga lo que devuelve el informe mensual desde un enlace: lo que se repite y los ejercicios.
 * Viaja en el propio enlace y se guarda en los ajustes de la usuaria; así no está en el código.
 */
export default function CargarIntrospeccion() {
  const { datos } = useParams()
  const nav = useNavigate()
  const [cfg, saveCfg] = useSettings<IntroCfg>('introspeccion')
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const nuevo = useMemo(() => { const t = datos ? descifrar(datos) : null; return t ? leerInforme(t) : null }, [datos])

  const guardar = async () => {
    if (!nuevo) return
    setEstado('guardando')
    try { await saveCfg(aplicarInforme(cfg, nuevo)); nav('/introspeccion', { replace: true }) } catch { setEstado('error') }
  }
  const titulo = (id?: string) => (nuevo?.ejercicios ?? []).find((e) => e.id === id)?.titulo ?? (cfg?.ejercicios ?? []).find((e) => e.id === id)?.titulo

  return (
    <div>
      <h1>Cargar mi informe</h1>
      {!nuevo ? (
        <div className="card">
          <p>El enlace no trae un informe válido. No se ha cambiado nada.</p>
          <Link className="btn secondary" to="/introspeccion">Ir a Trabajo introspectivo</Link>
        </div>
      ) : (
        <div className="card">
          {nuevo.periodo && <p className="muted">{nuevo.periodo}</p>}
          {nuevo.patrones && (
            <>
              <h3>Lo que se repite</h3>
              {nuevo.patrones.map((p) => <div key={p.id} className="small">• {p.texto}{p.veces != null ? ` (${p.veces}${p.de ? ' de ' + p.de + ' días' : ' veces'})` : ''}</div>)}
            </>
          )}
          {nuevo.ejercicios && (
            <>
              <h3>Ejercicios</h3>
              {nuevo.ejercicios.map((e) => <div key={e.id} className="small">• {e.titulo}</div>)}
            </>
          )}
          {nuevo.activo && titulo(nuevo.activo) && <p className="small">Ejercicio de ahora: <strong>{titulo(nuevo.activo)}</strong></p>}
          <p className="muted small">Lo que se repite sustituye a lo que ves ahora. Los ejercicios se suman a los que ya tienes. Lo que ya has anotado se conserva.</p>
          {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
          <div className="row">
            <button type="button" className="btn" disabled={!cfg || estado === 'guardando'} onClick={() => void guardar()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>
            <Link className="btn ghost" to="/introspeccion">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  )
}
