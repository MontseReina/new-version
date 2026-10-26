import { useState } from 'react'
import type { Bloque, Ejercicio } from './logica'

/** Emoji y color de cada bloque por su orden, si el bloque no trae los suyos. */
const EMOJI_BLOQUE = ['🕊️', '🍃', '🌻']
export const emojiBloque = (b: Bloque | undefined, i: number) => b?.emoji ?? EMOJI_BLOQUE[i] ?? '✨'
export const tonoBloque = (i: number) => 'tono' + ((i % 3) + 1)

/** Ficha de un ejercicio: arriba, lo que hay que hacer en una frase y para qué; el paso a paso, el
 *  «si te atascas» y la fuente quedan plegados en «Ver cómo se hace». */
export function Ficha({ e }: { e: Ejercicio }) {
  const [ver, setVer] = useState(false)
  const datos = [e.minutos ? `⏱ ${e.minutos} min` : '', e.cuando ? `🕐 ${e.cuando}` : ''].filter(Boolean)
  const hayMas = !!(e.pasos?.length || e.truco || e.responde || e.fuente || (e.frase && e.texto))
  return (
    <div className="ficha-cuerpo">
      {(e.frase || e.texto) && <p className="ficha-frase">{e.frase ?? e.texto}</p>}
      {e.para && <p className="ficha-para-linea"><span aria-hidden="true">🎯 </span>{e.para}</p>}
      {datos.length > 0 && <div className="ficha-datos">{datos.map((d) => <span key={d}>{d}</span>)}</div>}
      {hayMas && (
        <button type="button" className="ficha-ver" aria-expanded={ver} onClick={() => setVer(!ver)}>
          {ver ? '▾ Ocultar cómo se hace' : '▸ Ver cómo se hace'}
        </button>
      )}
      {ver && (
        <div className="ficha-mas">
          {e.pasos?.length ? (
            <div className="ficha-pasos">
              <span className="ficha-sub">👣 Paso a paso</span>
              <ol>{e.pasos.map((p, i) => <li key={i}><span className="ficha-n" aria-hidden="true">{i + 1}</span><span>{p}</span></li>)}</ol>
            </div>
          ) : e.frase && e.texto ? <p className="intro-texto">{e.texto}</p> : null}
          {e.truco && (
            <div className="ficha-truco">
              <span className="ficha-sub">💡 Si te atascas</span>
              <p>{e.truco}</p>
            </div>
          )}
          {e.responde && <p className="ficha-meta"><b>Responde a:</b> {e.responde}</p>}
          {e.fuente && <p className="ficha-meta"><b>De dónde sale:</b> {e.fuente}</p>}
        </div>
      )}
    </div>
  )
}
