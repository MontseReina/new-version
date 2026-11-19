import { useEffect, useState } from 'react'
import { MINUTOS_DE_PIE } from './logica'

/** Pitidos ya programados en esta sesión (se programan en el reloj de audio, que sigue aunque la página vaya lenta). */
let audio: AudioContext | null = null

/** Tres pitidos cortos a los `seg` segundos del reloj de audio. */
function pitidos(ctx: AudioContext, seg: number) {
  for (let n = 0; n < 3; n++) {
    const t = ctx.currentTime + seg + n * 0.35
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + 0.3)
  }
}

export const ahoraHMS = () => new Date().toTimeString().slice(0, 8)
const aSeg = (h: string) => { const [a, b, c] = h.split(':').map(Number); return a * 3600 + b * 60 + (c || 0) }
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const FIN = MINUTOS_DE_PIE[MINUTOS_DE_PIE.length - 1] * 60

/** Programa los pitidos de los 5 y 10 minutos desde ahora. Hay que llamarlo desde un toque o al escribir
 *  (el navegador solo deja sonar audio que empieza con un gesto de la usuaria). */
export function programarPitidos() {
  try {
    void audio?.close()
    audio = new AudioContext()
    for (const m of MINUTOS_DE_PIE) pitidos(audio, m * 60)
  } catch { /* sin sonido: queda el aviso al móvil */ }
}

/**
 * Test de bipedestación de la mañana. El reloj empieza solo al anotar la toma de «Al levantarme» (tumbada) y avisa
 * a los 5 y a los 10 minutos con pitidos en la app (si sigue abierta) y con un aviso al móvil (función `avisos`).
 * `banner`: arriba de Constantes, solo mientras corre el reloj. `ficha`: dentro de «Poslevantarme», siempre.
 */
export function TestDePie({ inicio, hoy, reiniciar, modo }: { inicio: string | null; hoy: boolean; reiniciar: (hms: string) => void; modo: 'banner' | 'ficha' }) {
  const [ahora, setAhora] = useState(() => aSeg(ahoraHMS()))
  const seg = inicio && hoy ? ahora - aSeg(inicio) : null
  const corriendo = seg != null && seg >= 0 && seg < FIN + 120
  const terminado = seg != null && seg >= FIN + 120
  useEffect(() => {
    if (!inicio || !hoy || terminado) return
    const t = setInterval(() => setAhora(aSeg(ahoraHMS())), 1000)
    return () => clearInterval(t)
  }, [inicio, hoy, terminado])
  if (modo === 'banner' && !corriendo) return null

  const deNuevo = () => { programarPitidos(); const h = ahoraHMS(); setAhora(aSeg(h)); reiniciar(h) }
  // Qué toca ahora: la toma de los 5 o de los 10 minutos (durante dos minutos), o la cuenta atrás hasta la siguiente.
  const toca = seg == null ? null : MINUTOS_DE_PIE.find((m) => seg >= m * 60 && seg < m * 60 + 120) ?? null
  const siguiente = seg == null ? null : MINUTOS_DE_PIE.find((m) => seg < m * 60) ?? null

  return (
    <div className={'test-pie' + (modo === 'banner' ? ' banner' : '') + (toca ? ' toca' : '')}>
      <div className="test-pie-reloj">
        <span className="medida-sub">Test de pie</span>
        {corriendo && <b className="test-pie-tiempo">{mmss(seg!)}</b>}
      </div>
      {!inicio || !hoy ? (
        <p className="small" style={{ margin: '.2rem 0 0' }}>{hoy
          ? 'El reloj empieza solo al anotar la toma de «Al levantarme». Después ponte de pie, quieta: te aviso a los 5 y a los 10 minutos.'
          : 'Sin test de pie este día.'}</p>
      ) : (
        <>
          <div className="small muted">Desde las {inicio.slice(0, 5)} (toma de «Al levantarme»)</div>
          {corriendo && (toca
            ? <div className="test-pie-ahora">Toma la tensión de los {toca} minutos</div>
            : siguiente ? <div className="small">Toma de los {siguiente} minutos en <b>{mmss(siguiente * 60 - seg!)}</b></div>
            : null)}
          {terminado && <div className="small muted">Test terminado.</div>}
          <button type="button" className="linkbtn small" onClick={deNuevo}>Empezar el reloj desde ahora</button>
        </>
      )}
      {modo === 'ficha' && <p className="small muted" style={{ margin: '.4rem 0 0' }}>Si te mareas, notas que se te nubla la vista o te encuentras mal, deja el test y túmbate con las piernas en alto. Mejor junto a la cama y con alguien cerca.</p>}
    </div>
  )
}
