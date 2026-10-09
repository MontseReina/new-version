import { useEffect, useState, type ReactNode } from 'react'
import { AYUNO_MAX_POR_DEFECTO, aHora, aMin, ayunoNocturno, ultimaComida, type NutriCfg, type NutriDia } from './logica'

const R = 88
const LARGO = 2 * Math.PI * R
const dos = (n: number) => String(n).padStart(2, '0')

/** Un aro con el tiempo en el centro. `seg` = segundos transcurridos; sin `enMarcha` queda fijo y no enseña segundos. */
function Aro({ seg, maxH, enMarcha, vacio }: { seg: number; maxH: number; enMarcha: boolean; vacio?: boolean }) {
  const parte = vacio ? 0 : Math.min(1, seg / (maxH * 3600))
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle className="reloj-fondo" cx="100" cy="100" r={R} />
      <circle className="reloj-aro" cx="100" cy="100" r={R} strokeDasharray={LARGO} strokeDashoffset={LARGO * (1 - parte)} transform="rotate(-90 100 100)" />
      <text className="reloj-uni" x="100" y="60" textAnchor="middle">horas</text>
      <text className="reloj-num" x="100" y="100" textAnchor="middle">{vacio ? '–:––' : `${Math.floor(seg / 3600)}:${dos(Math.floor(seg / 60) % 60)}`}</text>
      {!vacio && <text className="reloj-seg" x="100" y="136" textAnchor="middle">{enMarcha ? `${dos(seg % 60)} s` : 'parado'}</text>}
    </svg>
  )
}
const nivel = (seg: number, maxH: number) => (seg > maxH * 3600 ? 'rojo' : seg >= (maxH - 1) * 3600 ? 'amarillo' : 'verde')

/** Dos relojes con la hora real. A la izquierda, el ayuno de la noche: desde la última comida de ayer hasta la
 *  primera toma de hoy, y ahí se para. A la derecha, el tiempo desde la última comida, siempre en marcha. */
export function Reloj({ cfg, ayer, dia }: { cfg: NutriCfg; ayer: NutriDia | null; dia: NutriDia }) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => setAhora(new Date()), 1000); return () => window.clearInterval(t) }, [])
  const maxH = cfg.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes()
  const s = ahora.getSeconds()
  const noche = ayunoNocturno(cfg, ayer, dia, ahoraMin)
  const ultima = ultimaComida(cfg, ayer, dia, ahoraMin)

  let izq: ReactNode
  if (!noche) {
    izq = <div className="reloj-uno"><Aro seg={0} maxH={maxH} enMarcha={false} vacio /><strong>Ayuno de la noche</strong><div className="muted small">Ayer no hay ninguna comida con hora.</div></div>
  } else {
    const seg = noche.minutos * 60 + (noche.enMarcha ? s : 0)
    const lv = nivel(seg, maxH)
    const tope = aHora(((aMin(noche.desdeHora) ?? 0) + maxH * 60) % 1440)
    izq = (
      <div className={'reloj-uno ' + lv} role="timer" aria-label={`Ayuno de la noche: ${Math.floor(seg / 3600)} horas y ${Math.floor(seg / 60) % 60} minutos`}>
        <Aro seg={seg} maxH={maxH} enMarcha={noche.enMarcha} />
        <strong>Ayuno de la noche</strong>
        <div className="small">Desde: {noche.desdeNombre.toLowerCase()} de ayer, {noche.desdeHora}.</div>
        {noche.enMarcha
          ? (lv === 'rojo'
            ? <div className="small reloj-aviso">Has pasado de las {maxH} horas. Toca comer.</div>
            : <div className="muted small">En marcha. Primera toma antes de las {tope}.</div>)
          : <div className={'small ' + (lv === 'rojo' ? 'reloj-aviso' : 'muted')}>Parado con: {noche.finNombre!.toLowerCase()}, {noche.finHora}.{lv === 'rojo' ? ` Más de ${maxH} horas.` : ''}</div>}
      </div>
    )
  }

  let der: ReactNode
  if (!ultima) {
    der = <div className="reloj-uno"><Aro seg={0} maxH={maxH} enMarcha={false} vacio /><strong>Desde la última comida</strong><div className="muted small">Aún no hay ninguna comida con hora.</div></div>
  } else {
    const seg = ultima.minutos * 60 + s
    der = (
      <div className={'reloj-uno ' + nivel(seg, maxH)} role="timer" aria-label={`Desde la última comida: ${Math.floor(seg / 3600)} horas y ${Math.floor(seg / 60) % 60} minutos`}>
        <Aro seg={seg} maxH={maxH} enMarcha />
        <strong>Desde la última comida</strong>
        <div className="small">{ultima.nombre}{ultima.ayer ? ' de ayer' : ''}, {ultima.hora}.</div>
        <div className="muted small">Ahora son las {dos(ahora.getHours())}:{dos(ahora.getMinutes())}.</div>
      </div>
    )
  }
  return <div className="card reloj">{izq}{der}</div>
}
