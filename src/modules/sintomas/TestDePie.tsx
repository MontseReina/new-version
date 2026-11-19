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

const ahoraHMS = () => new Date().toTimeString().slice(0, 8)
const aSeg = (h: string) => { const [a, b, c] = h.split(':').map(Number); return a * 3600 + b * 60 + (c || 0) }
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Test de bipedestación de la mañana, dentro de «Poslevantarme»: al ponerse de pie se guarda la hora y se avisa
 * a los 5 y a los 10 minutos con pitidos en la app (si sigue abierta) y con un aviso al móvil (función `avisos`).
 */
export function TestDePie({ inicio, hoy, empezar }: { inicio: string | null; hoy: boolean; empezar: (hms: string) => void }) {
  const [ahora, setAhora] = useState(() => aSeg(ahoraHMS()))
  const seg = inicio && hoy ? ahora - aSeg(inicio) : null
  const fin = MINUTOS_DE_PIE[MINUTOS_DE_PIE.length - 1] * 60
  const activo = seg != null && seg >= 0 && seg < fin + 120
  useEffect(() => {
    if (!activo) return
    const t = setInterval(() => setAhora(aSeg(ahoraHMS())), 1000)
    return () => clearInterval(t)
  }, [activo])

  const arrancar = () => {
    try {
      audio?.close()
      audio = new AudioContext()
      // Un pitido suave al empezar confirma que el sonido funciona; luego, a los 5 y a los 10 minutos.
      pitidos(audio, 0)
      for (const m of MINUTOS_DE_PIE) pitidos(audio, m * 60)
    } catch { /* sin sonido: queda el aviso al móvil */ }
    const h = ahoraHMS()
    setAhora(aSeg(h))
    empezar(h)
  }

  // Qué toca ahora: la toma de los 5 o de los 10 minutos (durante dos minutos), o la cuenta atrás hasta la siguiente.
  const toca = seg == null ? null : MINUTOS_DE_PIE.find((m) => seg >= m * 60 && seg < m * 60 + 120) ?? null
  const siguiente = seg == null ? null : MINUTOS_DE_PIE.find((m) => seg < m * 60) ?? null

  return (
    <div className={'test-pie' + (toca ? ' toca' : '')}>
      <div className="medida-sub">Test de pie</div>
      {!inicio ? (
        <>
          <p className="small" style={{ margin: '.2rem 0 .5rem' }}>Después de la toma tumbada, ponte de pie y quédate quieta. Toca el botón al levantarte: te aviso a los 5 y a los 10 minutos para tomarte la tensión.</p>
          {hoy && <button type="button" className="btn" onClick={arrancar}>Me pongo de pie ahora</button>}
        </>
      ) : (
        <>
          <div className="test-pie-reloj">
            <span className="small muted">De pie desde las {inicio.slice(0, 5)}</span>
            {activo && <b className="test-pie-tiempo">{mmss(seg!)}</b>}
          </div>
          {activo && (toca
            ? <div className="test-pie-ahora">Toma la tensión de los {toca} minutos</div>
            : siguiente ? <div className="small">Toma de los {siguiente} minutos en <b>{mmss(siguiente * 60 - seg!)}</b></div>
            : null)}
          {!activo && hoy && seg != null && seg >= fin + 120 && <div className="small muted">Test terminado.</div>}
          {hoy && <button type="button" className="linkbtn small" onClick={arrancar}>Volver a empezar</button>}
        </>
      )}
      <p className="small muted" style={{ margin: '.4rem 0 0' }}>Si te mareas, notas que se te nubla la vista o te encuentras mal, deja el test y túmbate con las piernas en alto. Mejor junto a la cama y con alguien cerca.</p>
    </div>
  )
}
