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
