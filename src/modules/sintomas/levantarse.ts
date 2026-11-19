import { filaLevantar, type HidraCfg, type HidraDia } from '../hidratacion/logica'
import type { SintDia } from './logica'

const aMin = (h?: string | null) => { const p = /^(\d{1,2}):(\d{2})/.exec(h ?? ''); return p ? Number(p[1]) * 60 + Number(p[2]) : null }

/**
 * Hora (en minutos del día) a la que se levantó: la de la toma de constantes «Al levantarme» de Disautonomía
 * (su primera tensión del día, desde la 0.24.0). Sin ella, la del toque «al levantarme» de Hidratación.
 */
export function horaLevantarse(sint: SintDia | null | undefined, hc: HidraCfg | null, hidra: HidraDia | null | undefined): { min: number; de: 'tension' | 'hidratacion' } | null {
  const t = aMin((sint?.constantes ?? []).find((c) => c.momento === 'levantarme')?.hora)
  if (t != null) return { min: t, de: 'tension' }
  const i = filaLevantar(hc)
  const k = i >= 0 ? 'pauta:' + i : 'levantar'
  const h = aMin((hidra?.horas ?? []).find((x) => x.k === k)?.h)
  return h != null ? { min: h, de: 'hidratacion' } : null
}
