import { useEffect, useState } from 'react'
import { AYUNO_MAX_POR_DEFECTO, aMin, ayunoNocturno, type NutriCfg, type NutriDia } from './logica'

const R = 88
const LARGO = 2 * Math.PI * R
const dos = (n: number) => String(n).padStart(2, '0')

/** Reloj del ayuno de la noche: horas, minutos y segundos desde la última comida del día anterior hasta la
 *  primera toma del día. Hoy, mientras no haya primera toma, corre con la hora real; al anotarla, se para. */
export function Reloj({ cfg, ayer, dia, esHoy }: { cfg: NutriCfg; ayer: NutriDia | null; dia: NutriDia; esHoy: boolean }) {
  const n = ayunoNocturno(cfg, ayer, dia)
  const enMarcha = !!n && n.minutos == null && esHoy
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    if (!enMarcha) return
    setAhora(new Date())
    const t = window.setInterval(() => setAhora(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [enMarcha])
  const maxH = cfg.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO
  const anterior = esHoy ? 'de ayer' : 'del día anterior'

  // Segundos transcurridos: fijos si ya hay primera toma; con la hora real si sigue en marcha; `null` si no se sabe.
  const seg = !n ? null
    : n.minutos != null ? n.minutos * 60
    : enMarcha ? (ahora.getHours() * 60 + ahora.getMinutes() + 1440 - (aMin(n.desdeHora) ?? 0)) * 60 + ahora.getSeconds()
    : null
  const lv = seg == null ? '' : seg > maxH * 3600 ? 'rojo' : seg >= (maxH - 1) * 3600 ? 'amarillo' : 'verde'
  const parte = seg == null ? 0 : Math.min(1, seg / (maxH * 3600))
  return (
    <div className={'card reloj ' + lv} role="timer" aria-label={seg == null ? 'Horas de ayuno: sin datos' : `Horas de ayuno: ${Math.floor(seg / 3600)} horas y ${Math.floor(seg / 60) % 60} minutos`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="reloj-fondo" cx="100" cy="100" r={R} />
        <circle className="reloj-aro" cx="100" cy="100" r={R} strokeDasharray={LARGO} strokeDashoffset={LARGO * (1 - parte)} transform="rotate(-90 100 100)" />
        <text className="reloj-uni" x="100" y="62" textAnchor="middle">horas de ayuno</text>
        <text className="reloj-num" x="100" y="102" textAnchor="middle">{seg == null ? '–:––:––' : `${Math.floor(seg / 3600)}:${dos(Math.floor(seg / 60) % 60)}:${dos(seg % 60)}`}</text>
        {seg != null && <text className="reloj-uni" x="100" y="138" textAnchor="middle">{enMarcha ? 'en marcha' : 'parado'}</text>}
      </svg>
      <div className="reloj-texto">
        {n
          ? <>
              <div>Desde: <strong>{n.desdeNombre.toLowerCase()} {anterior}, {n.desdeHora}</strong></div>
              <div>Hasta: {n.finHora ? <strong>{n.finNombre!.toLowerCase()}, {n.finHora}</strong> : <span className="muted">{esHoy ? 'la primera toma de hoy' : 'sin hora de la primera toma'}</span>}</div>
            </>
          : <div className="muted small">No hay ninguna comida con hora {anterior}: el reloj no puede contar.</div>}
      </div>
    </div>
  )
}
