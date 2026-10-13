import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fmtDate } from '../../lib/dates'
import { useSettings } from '../../store/useSettings'
import { guardarPlan } from './guardar'
import { leerPlan, nombreMes, type VidaCfg } from './logica'

/** Texto de un enlace de configuración (base64 para direcciones) a texto normal. */
function descifrar(datos: string): string | null {
  try {
    const bin = atob(datos.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch { return null }
}

/** Carga el plan del mes de «La vida que sueño» desde el enlace del prompt mensual. */
export default function CargarVida() {
  const { datos } = useParams()
  const nav = useNavigate()
  const [cfg, saveCfg] = useSettings<VidaCfg>('vida')
  const [estado, setEstado] = useState<'' | 'guardando' | 'error'>('')
  const plan = useMemo(() => { const t = datos ? descifrar(datos) : null; return t ? leerPlan(t) : null }, [datos])

  const guardar = async () => {
    if (!plan) return
    setEstado('guardando')
    try { await guardarPlan(plan); await saveCfg({ mes: plan.mes }); nav('/vida', { replace: true }) } catch { setEstado('error') }
  }
  const acciones = plan?.semanas.reduce((n, s) => n + s.acciones.length, 0) ?? 0

  return (
    <div>
      <h1>Cargar el plan del mes</h1>
      {!plan ? (
        <div className="card">
          <p>El enlace no trae un plan válido. No se ha cambiado nada.</p>
          <Link className="btn secondary" to="/vida">Ir a La vida que sueño</Link>
        </div>
      ) : (
        <div className="card">
          <p>Plan de <strong>{nombreMes(plan.mes)}</strong>{plan.frase ? <>: «{plan.frase}»</> : null}</p>
          {(plan.areas ?? []).length > 0 && <p className="muted">Áreas activas: {plan.areas!.map((a) => a.nombre).join(' · ')}</p>}
          <p className="muted small">{plan.semanas.length} {plan.semanas.length === 1 ? 'semana' : 'semanas'} y {acciones} {acciones === 1 ? 'acción' : 'acciones'}, del {fmtDate(plan.semanas[0].desde)} al {fmtDate(plan.semanas[plan.semanas.length - 1].hasta)}.</p>
          <p className="muted small">Las semanas que trae se suman al mes; si ya había una semana con la misma fecha, la sustituyen. Lo que ya marcaste y tus logros se conservan.</p>
          {estado === 'error' && <div className="notice small">No se ha podido guardar. Revisa la conexión y vuelve a pulsar.</div>}
          <div className="row">
            <button type="button" className="btn" disabled={!cfg || estado === 'guardando'} onClick={() => void guardar()}>{estado === 'guardando' ? 'Guardando…' : 'Guardar el plan'}</button>
            <Link className="btn ghost" to="/vida">Cancelar</Link>
          </div>
        </div>
      )}
    </div>
  )
}
