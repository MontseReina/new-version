import type { Bloque, Ejercicio } from './logica'

/** Emoji y color de cada bloque por su orden, si el bloque no trae los suyos. */
const EMOJI_BLOQUE = ['🕊️', '🍃', '🌻']
export const emojiBloque = (b: Bloque | undefined, i: number) => b?.emoji ?? EMOJI_BLOQUE[i] ?? '✨'
export const tonoBloque = (i: number) => 'tono' + ((i % 3) + 1)

/** Ficha de un ejercicio, al estilo de las fichas de terapia: para qué sirve, paso a paso, si te atascas y fuente. */
export function Ficha({ e, abierta = true }: { e: Ejercicio; abierta?: boolean }) {
  const datos = [e.minutos ? `⏱ ${e.minutos} min` : '', e.cuando ? `🕐 ${e.cuando}` : ''].filter(Boolean)
  return (
    <div className="ficha-cuerpo">
      {datos.length > 0 && <div className="ficha-datos">{datos.map((d) => <span key={d}>{d}</span>)}</div>}
      {e.para && (
        <div className="ficha-para">
          <span className="ficha-sub">🎯 Para qué te sirve</span>
          <p>{e.para}</p>
        </div>
      )}
      {abierta && (
        <>
          {e.pasos?.length ? (
            <div className="ficha-pasos">
              <span className="ficha-sub">👣 Paso a paso</span>
              <ol>{e.pasos.map((p, i) => <li key={i}><span className="ficha-n" aria-hidden="true">{i + 1}</span><span>{p}</span></li>)}</ol>
            </div>
          ) : e.texto ? <p className="intro-texto">{e.texto}</p> : null}
          {e.truco && (
            <div className="ficha-truco">
              <span className="ficha-sub">💡 Si te atascas</span>
              <p>{e.truco}</p>
            </div>
          )}
          {e.responde && <p className="ficha-meta"><b>Responde a:</b> {e.responde}</p>}
          {e.fuente && <p className="ficha-meta"><b>De dónde sale:</b> {e.fuente}</p>}
        </>
      )}
    </div>
  )
}
