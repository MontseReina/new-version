import { useEffect, useState } from 'react'
import { nowHM, todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { CHUPITO_ML, TAZA_ML, nivel, objetivo, tocarLevantar, total, type HidraCfg, type HidraDia } from './logica'

export type Bebida = 'agua' | 'mar' | 'caldo' | 'infusion' | 'cardo'

/** Registro de hidratación de un día y sus acciones (botones rápidos, pauta, al levantarse, deshacer).
 *  Lo comparten la pantalla de Hidratación y el bloque reducido de Disautonomía. */
export function useHidra(date: string) {
  const daily = useDaily<HidraDia>('hidratacion', date)
  const { value: d, set } = daily
  const [cfg, saveCfg] = useSettings<HidraCfg>('hidratacion')
  const obj = objetivo(cfg)
  const t = total(d)
  const pauta = cfg?.pauta ?? []

  // Cada toque suma a su casilla (y al total si está tecleado a mano). Se deshace el último.
  const [ultimo, setUltimo] = useState<{ previo: HidraDia; txt: string } | null>(null)
  useEffect(() => setUltimo(null), [date])
  // Cada toque de hoy guarda su hora, para poder cruzarla con las comidas. `k` dice qué se bebió.
  const aplicar = (patch: HidraDia, ml: number, txt: string, k?: string) => {
    setUltimo({ previo: d, txt })
    const horas = k && date === todayStr() ? { horas: [...(d.horas ?? []), { h: nowHM(), k, ml }] } : {}
    set({ ...patch, ...horas, ...(d.total_ml != null ? { total_ml: Math.max(0, d.total_ml + ml) } : {}) })
  }
  /** Suma una bebida. En el agua, `ml` dice cuánto (por defecto un vaso). */
  const sumar = (k: Bebida, txt: string, ml?: number) => {
    if (k === 'agua') { const v = ml ?? TAZA_ML; aplicar({ agua_ml: (d.agua_ml ?? 0) + v }, v, txt, k) }
    if (k === 'mar') aplicar({ mar_ml: (d.mar_ml ?? 0) + CHUPITO_ML }, CHUPITO_ML, txt, k)
    if (k === 'caldo') aplicar({ caldo_tazas: (d.caldo_tazas ?? 0) + 1 }, TAZA_ML, txt, k)
    if (k === 'infusion') aplicar({ infusion_tazas: (d.infusion_tazas ?? 0) + 1 }, TAZA_ML, txt, k)
    if (k === 'cardo') aplicar({ cardo_tazas: (d.cardo_tazas ?? 0) + 1 }, TAZA_ML, txt, k)
  }
  const deshacer = () => {
    if (!ultimo) return
    const p = ultimo.previo
    set({ agua_ml: p.agua_ml ?? null, mar_ml: p.mar_ml ?? null, caldo_tazas: p.caldo_tazas ?? null, infusion_tazas: p.infusion_tazas ?? null, cardo_tazas: p.cardo_tazas ?? null, total_ml: p.total_ml ?? null, pauta: p.pauta ?? {}, horas: p.horas ?? [], al_levantar: p.al_levantar ?? false })
    setUltimo(null)
  }
  // Pauta: un toque anota las cantidades de esa fila; otro toque las quita.
  const tocarPauta = (i: number) => {
    const f = pauta[i]
    const hecho = !!d.pauta?.[i]
    const s = hecho ? -1 : 1
    const agua = (f.agua_ml ?? 0) * s, m = (f.mar_ml ?? 0) * s
    // Al quitar una fila de la pauta se quita también su hora.
    const sinHora = hecho ? { horas: (d.horas ?? []).filter((x) => x.k !== 'pauta:' + i) } : {}
    aplicar(
      { agua_ml: Math.max(0, (d.agua_ml ?? 0) + agua), mar_ml: Math.max(0, (d.mar_ml ?? 0) + m), pauta: { ...(d.pauta ?? {}), [i]: !hecho }, ...sinHora },
      agua + m,
      hecho ? `quitar «${f.momento}»` : f.momento,
      hecho ? undefined : 'pauta:' + i,
    )
  }
  const levantar = () => { setUltimo(null); set(tocarLevantar(cfg, d, date === todayStr() ? nowHM() : null)) }
  /** Hora a la que se anotó una fila de la pauta, si se anotó hoy con hora. */
  const horaPauta = (i: number) => (d.horas ?? []).find((x) => x.k === 'pauta:' + i)?.h ?? null

  /** Tras reordenar o quitar filas de la pauta, mueve con ellas lo anotado en el día abierto (las marcas van por posición).
   *  `antes[k]` = posición que tenía la fila que ahora está en `k`. */
  const recolocar = (antes: number[]) => {
    const nueva = (i: number) => antes.indexOf(i)
    const pautaDia: { [i: string]: boolean } = {}
    for (const [k, v] of Object.entries(d.pauta ?? {})) { const n = nueva(Number(k)); if (n >= 0) pautaDia[n] = v }
    const horas = (d.horas ?? []).flatMap((x) => {
      if (!x.k.startsWith('pauta:')) return [x]
      const n = nueva(Number(x.k.slice(6)))
      return n >= 0 ? [{ ...x, k: 'pauta:' + n }] : []
    })
    set({ pauta: pautaDia, horas })
  }

  return { ...daily, recolocar, cfg, saveCfg, obj, t, lv: nivel(t, obj), pauta, sumar, deshacer, ultimo, tocarPauta, levantar, horaPauta }
}
