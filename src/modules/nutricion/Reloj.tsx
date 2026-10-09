import { useEffect, useState } from 'react'
import { AYUNO_MAX_POR_DEFECTO, aHora, ultimaComida, type NutriCfg, type NutriDia } from './logica'

const R = 88
const LARGO = 2 * Math.PI * R
const dos = (n: number) => String(n).padStart(2, '0')

/** Reloj en marcha con el tiempo que ha pasado desde la última comida: la más reciente de hoy o,
 *  si hoy aún no hay ninguna, la cena de ayer. El aro se llena hasta el máximo de horas pautado. */
export function Reloj({ cfg, ayer, dia }: { cfg: NutriCfg; ayer: NutriDia | null; dia: NutriDia }) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => setAhora(new Date()), 1000); return () => window.clearInterval(t) }, [])
  const maxH = cfg.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO
  const u = ultimaComida(cfg, ayer, dia, ahora.getHours() * 60 + ahora.getMinutes())
  const hora = dos(ahora.getHours()) + ':' + dos(ahora.getMinutes())

  if (!u) {
    return (
      <div className="card reloj">
        <div className="reloj-texto">
          <strong>Desde tu última comida</strong>
          <p className="muted small">Aún no hay ninguna comida con hora, ni de hoy ni de ayer. En cuanto anotes la hora de una, el reloj empieza a contar.</p>
          <p className="muted small">Ahora son las {hora}.</p>
        </div>
      </div>
    )
  }
  const seg = u.minutos * 60 + ahora.getSeconds()
  const parte = Math.min(1, seg / (maxH * 3600))
  const lv = seg > maxH * 3600 ? 'rojo' : seg >= (maxH - 1) * 3600 ? 'amarillo' : 'verde'
  const tope = aHora((Number(u.hora.slice(0, 2)) * 60 + Number(u.hora.slice(3)) + maxH * 60) % 1440)
  return (
    <div className={'card reloj ' + lv} role="timer" aria-label={`Han pasado ${Math.floor(seg / 3600)} horas y ${Math.floor(seg / 60) % 60} minutos desde tu última comida`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="reloj-fondo" cx="100" cy="100" r={R} />
        <circle className="reloj-aro" cx="100" cy="100" r={R} strokeDasharray={LARGO} strokeDashoffset={LARGO * (1 - parte)} transform="rotate(-90 100 100)" />
        <text className="reloj-num" x="100" y="100" textAnchor="middle">{Math.floor(seg / 3600)}:{dos(Math.floor(seg / 60) % 60)}</text>
        <text className="reloj-seg" x="100" y="136" textAnchor="middle">{dos(seg % 60)} s</text>
        <text className="reloj-uni" x="100" y="60" textAnchor="middle">horas</text>
      </svg>
      <div className="reloj-texto">
        <strong>{u.ayer ? 'Llevas en ayunas' : 'Desde tu última comida'}</strong>
        <div className="small">{u.nombre}{u.ayer ? ' de ayer' : ''}, a las {u.hora}.</div>
        <div className="muted small">Ahora son las {hora}.</div>
        {lv === 'rojo'
          ? <div className="small reloj-aviso">Has pasado de las {maxH} horas. Toca comer.</div>
          : u.ayer && <div className="muted small">Primera toma antes de las {tope}, para no pasar de {maxH} horas.</div>}
      </div>
    </div>
  )
}
