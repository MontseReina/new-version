import { useEffect, useState, type ReactNode } from 'react'
import { AYUNO_MAX_POR_DEFECTO, aHora, aMin, ayunoNocturno, primeraTomaHoy, ultimaComida, type NutriCfg, type NutriDia } from './logica'

/** Minutos que pueden pasar desde que se levanta hasta la primera toma; a partir de los 45, en ámbar. */
const LEVANTAR_MAX_MIN = 60
const LEVANTAR_AVISO_MIN = 45

const R = 88
const LARGO = 2 * Math.PI * R
const dos = (n: number) => String(n).padStart(2, '0')

/** Un aro con el tiempo en el centro. `seg` = segundos transcurridos; sin `enMarcha` queda fijo y no enseña segundos. */
function Aro({ seg, maxH, enMarcha, vacio, minutos }: { seg: number; maxH: number; enMarcha: boolean; vacio?: boolean; minutos?: boolean }) {
  const parte = vacio ? 0 : Math.min(1, seg / (maxH * 3600))
  if (minutos) return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle className="reloj-fondo" cx="100" cy="100" r={R} />
      <circle className="reloj-aro" cx="100" cy="100" r={R} strokeDasharray={LARGO} strokeDashoffset={LARGO * (1 - parte)} transform="rotate(-90 100 100)" />
      <text className="reloj-uni" x="100" y="60" textAnchor="middle">minutos</text>
      <text className="reloj-num" x="100" y="100" textAnchor="middle">{vacio ? '––' : Math.floor(seg / 60)}</text>
      {!vacio && <text className="reloj-seg" x="100" y="136" textAnchor="middle">{enMarcha ? `${dos(seg % 60)} s` : 'parado'}</text>}
    </svg>
  )
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

/** Tres relojes con la hora real. Arriba, desde que se levantó (su primera tensión) hasta la primera toma, con
 *  la hora como tope. Debajo, a la izquierda, el ayuno de la noche: desde la última comida de ayer hasta la primera
 *  toma de hoy, y ahí se para. A la derecha, el tiempo desde la última comida, siempre en marcha.
 *  `levantar`: minuto del día en que se levantó (null si aún no consta) y de dónde sale. */
export function Reloj({ cfg, ayer, dia, levantar }: { cfg: NutriCfg; ayer: NutriDia | null; dia: NutriDia; levantar: { min: number; de: 'tension' | 'hidratacion' } | null }) {
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
  // Desde que me levanté hasta la primera toma.
  let arriba: ReactNode
  const primera = primeraTomaHoy(cfg, dia)
  if (!levantar) {
    arriba = (
      <div className="reloj-uno ancho">
        <Aro seg={0} maxH={LEVANTAR_MAX_MIN / 60} enMarcha={false} vacio minutos />
        <div><strong>Desde que me levanté</strong><div className="muted small">Empieza al anotar tu primera tensión («Al levantarme» en Disautonomía → Constantes).</div></div>
      </div>
    )
  } else {
    const enMarcha = !primera
    const minHasta = primera ? Math.max(primera.ini, levantar.min) : ahoraMin
    const seg = Math.max(0, (minHasta - levantar.min) * 60 + (enMarcha ? s : 0))
    const lv = seg > LEVANTAR_MAX_MIN * 60 ? 'rojo' : seg >= LEVANTAR_AVISO_MIN * 60 ? 'amarillo' : 'verde'
    const de = levantar.de === 'tension' ? 'primera tensión' : 'botón «al levantarme» de Hidratación'
    arriba = (
      <div className={'reloj-uno ancho ' + lv} role="timer" aria-label={`Desde que me levanté: ${Math.floor(seg / 60)} minutos`}>
        <Aro seg={seg} maxH={LEVANTAR_MAX_MIN / 60} enMarcha={enMarcha} minutos />
        <div>
          <strong>Desde que me levanté</strong>
          <div className="small">A las {aHora(levantar.min)} ({de}).</div>
          {enMarcha
            ? (lv === 'rojo'
              ? <div className="small reloj-aviso">Ha pasado más de una hora. Toca tu primera toma.</div>
              : <div className="muted small">Primera toma antes de las {aHora((levantar.min + LEVANTAR_MAX_MIN) % 1440)}.</div>)
            : <div className={'small ' + (lv === 'rojo' ? 'reloj-aviso' : 'muted')}>Parado con: {primera!.nombre.toLowerCase()}, {aHora(primera!.ini)}{lv === 'rojo' ? '. Más de una hora.' : '.'}</div>}
        </div>
      </div>
    )
  }
  return <div className="card reloj">{arriba}{izq}{der}</div>
}
