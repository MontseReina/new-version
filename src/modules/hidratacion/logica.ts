/** Hidratación: forma de los datos y cálculos. Sin datos personales: los objetivos y la pauta
 *  de cada usuaria viven en sus ajustes (base de datos), no en el código. */

export type HidraDia = {
  agua_ml?: number | null
  mar_ml?: number | null
  caldo_tazas?: number | null
  infusion_tazas?: number | null
  /** Infusión de manzanilla con cardo mariano, aparte de las demás infusiones. */
  cardo_tazas?: number | null
  /** Total tecleado a mano; si es null se usa la suma automática. */
  total_ml?: number | null
  /** Filas de la pauta ya anotadas hoy (por posición). */
  pauta?: { [i: string]: boolean }
  /** Hora de cada toque de los botones rápidos y de la pauta (solo el día en curso). Los días
   *  anteriores a esta lista, y lo tecleado a mano, no tienen hora. */
  horas?: Toque[]
  /** Vaso de agua y chupito de mar al levantarse, cuando la pauta no tiene una fila para ello. */
  al_levantar?: boolean
}

/** Un toque con su hora (HH:MM): qué se bebió (`agua`, `mar`, `caldo`, `infusion`, `cardo` o `pauta:<fila>`) y cuánto. */
export type Toque = { h: string; k: string; ml: number }

export type PautaFila = { momento: string; que: string; agua_ml?: number; mar_ml?: number }

export type HidraCfg = {
  objetivo_ml?: number
  /** Agua de mar: mínimo y tope diarios. 0 = sin objetivo. */
  mar_min_ml?: number
  mar_tope_ml?: number
  pauta?: PautaFila[]
  reglas?: string[]
}

export const TAZA_ML = 200
export const CHUPITO_ML = 10
export const OBJETIVO_POR_DEFECTO = 1500

export type Nivel = 'verde' | 'amarillo' | 'rojo'

export const objetivo = (c: HidraCfg | null) => c?.objetivo_ml || OBJETIVO_POR_DEFECTO
export const suma = (d: HidraDia) =>
  (d.agua_ml ?? 0) + (d.mar_ml ?? 0) + ((d.caldo_tazas ?? 0) + (d.infusion_tazas ?? 0) + (d.cardo_tazas ?? 0)) * TAZA_ML
export const total = (d: HidraDia) => d.total_ml ?? suma(d)
export const nivel = (t: number, obj: number): Nivel => (t >= obj ? 'verde' : t >= obj * 0.7 ? 'amarillo' : 'rojo')

// ---------- Al levantarse ----------
/** Fila de la pauta que corresponde al momento de levantarse, o -1 si la pauta no tiene ninguna. */
export const filaLevantar = (c: HidraCfg | null) => (c?.pauta ?? []).findIndex((f) => /levant|despert/i.test(f.momento))
/** ¿Está anotado lo de «al levantarme»? Se lee de su fila de la pauta; sin fila, de la marca del día. */
export const levantarHecho = (c: HidraCfg | null, d: HidraDia) => { const i = filaLevantar(c); return i >= 0 ? !!d.pauta?.[i] : !!d.al_levantar }
/** Marca o desmarca lo de «al levantarme» sumando o restando sus cantidades (las de su fila de la pauta o,
 *  sin fila, un vaso de agua y un chupito de mar). `hora` (HH:MM) solo al marcar el día en curso. */
export function tocarLevantar(c: HidraCfg | null, d: HidraDia, hora: string | null): HidraDia {
  const i = filaLevantar(c)
  const f = i >= 0 ? c!.pauta![i] : null
  const hecho = levantarHecho(c, d)
  const s = hecho ? -1 : 1
  const agua = (f ? f.agua_ml ?? 0 : TAZA_ML) * s, mar = (f ? f.mar_ml ?? 0 : CHUPITO_ML) * s
  const k = f ? 'pauta:' + i : 'levantar'
  const horas = (d.horas ?? []).filter((x) => x.k !== k)
  if (!hecho && hora) horas.push({ h: hora, k, ml: agua + mar })
  return {
    agua_ml: Math.max(0, (d.agua_ml ?? 0) + agua),
    mar_ml: Math.max(0, (d.mar_ml ?? 0) + mar),
    ...(f ? { pauta: { ...(d.pauta ?? {}), [i]: !hecho } } : { al_levantar: !hecho }),
    horas,
    ...(d.total_ml != null ? { total_ml: Math.max(0, d.total_ml + agua + mar) } : {}),
  }
}
