import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSettings } from '../../store/useSettings'
import { MENUS, aplicarAjuste, leerAjuste, leerCfg, type MenuId, type NutriCfg } from './logica'

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

/** Ajuste parcial por enlace: kilocalorías de los platos, horas de alguna toma o el menú fijo.
 *  No sustituye los menús: cambia solo lo que trae. */
export function CargarAjusteNutricion() {
  const { datos } = useParams()
  const nav = useNavigate()
  const [cfg, saveCfg] = useSettings<NutriCfg>('nutricion')
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const aj = useMemo(() => { const t = datos ? descifrar(datos) : null; return t ? leerAjuste(t) : null }, [datos])
  const res = aj && cfg ? aplicarAjuste(cfg, aj) : null

  const guardar = async () => {
    if (!res) return
    setEstado('guardando')
    try { await saveCfg(res.patch); nav('/nutricion', { replace: true }) } catch { setEstado('error') }
  }
  const cambios: string[] = []
  if (res?.platos) cambios.push(aj?.platos_partes && !aj.platos_kcal ? `reparto de las kilocalorías de ${res.platos} platos (verdura, proteína e hidratos)` : `kilocalorías de ${res.platos} platos`)
  if (aj?.tomas && res) for (const t of cfg?.tomas ?? []) { const c = aj.tomas[t.id]; if (c) cambios.push(`${t.nombre}: ${Object.entries(c).map(([k, v]) => `${k === 'hora' ? 'hora' : k === 'hasta' ? 'hasta' : k} ${v}`).join(', ')}`) }
  if (aj?.menu_fijo !== undefined) cambios.push(aj.menu_fijo ? `enseñar siempre el ${MENUS[aj.menu_fijo].toLowerCase()}` : 'enseñar el menú según el ciclo')
  if (aj?.kcal_min !== undefined) cambios.push(aj.kcal_min ? `cifra diaria pautada: ${aj.kcal_min} kcal` : 'sin cifra diaria pautada')

  return (
    <div>
      <h1>Ajustar Nutrición</h1>
      {!aj ? (
        <div className="card">
          <p>El enlace no trae un ajuste válido. No se ha cambiado nada.</p>
          <Link className="btn secondary" to="/nutricion">Ir a Nutrición</Link>
        </div>
      ) : !cfg ? <p className="muted">Cargando…</p> : (
        <div className="card">
          <p>Este enlace cambia en Nutrición:</p>
          <ul>{cambios.map((c) => <li key={c}>{c}</li>)}</ul>
          {res!.ignorados.length > 0 && <p className="muted small">No están en tus menús y se dejan fuera: {res!.ignorados.join(', ')}.</p>}
          <p className="muted small">Tus menús, platos y lo que ya has registrado se conservan.</p>
          {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
          <div className="row">
            <button type="button" className="btn" disabled={estado === 'guardando'} onClick={() => void guardar()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar los cambios'}</button>
            <Link className="btn ghost" to="/nutricion">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  )
}
