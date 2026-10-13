/** Kilocalorías estimadas: las de los platos del menú (cifra guardada en los ajustes de cada plato) por la parte
 *  que se tomó. Son un suelo que alcanzar, nunca un tope. La referencia del día es la cifra pautada por
 *  nutrición clínica (`kcal_min`) o, sin ella, lo previsto en el menú de ese día. */
import { GRACIA_MIN, hecha, limite, platosDe, tomasDe, type Estado, type MenuHoy, type NutriCfg, type NutriDia } from './logica'

export const PARTE: { [k in Estado]: number } = { entera: 1, tres_cuartos: 0.75, media: 0.5, no: 0 }
/** Por debajo de este porcentaje de lo previsto se avisa de que va por debajo. */
export const RANGO_POR_DEFECTO = 90

export interface KcalDia {
  /** Lo comido según lo registrado (sin las tomas de `sinDato`). */
  comido: number
  /** Tomas que no se pueden contar: «Otro» escrito, sin decir cuánto, o un plato sin cifra. */
  sinDato: string[]
  /** Lo previsto en el menú del día entero. `null` si algún plato del menú no tiene cifra. */
  previsto: number | null
  /** Lo previsto en las tomas que ya deberían estar hechas (o que ya lo están). */
  previstoHasta: number | null
  /** La referencia del día: la cifra pautada o, sin ella, el menú. */
  referencia: number | null
  /** La referencia sale del menú (no hay cifra pautada). */
  deMenu: boolean
  /** Referencia para lo que va de día: la parte de la referencia que corresponde a las tomas que ya tocaban,
   *  sin las de `sinDato` (no se puede comparar lo que no se puede contar). */
  referenciaHasta: number | null
  /** La referencia del día entero sin las tomas de `sinDato`. */
  referenciaContable: number | null
}

const kcalDePlatos = (cfg: NutriCfg, ids: string[]) => {
  let s = 0
  for (const id of ids) { const k = cfg.platos?.[id]?.kcal; if (k == null) return null; s += k }
  return s
}

/** Kilocalorías de un día. `ahoraMin` = minutos del día para «lo que va de día»; `null` = el día entero. */
export function kcalDia(cfg: NutriCfg, d: NutriDia, menu: MenuHoy, ahoraMin: number | null): KcalDia {
  let comido = 0, previsto: number | null = 0, hasta: number | null = 0, fuera = 0
  const sinDato: string[] = []
  for (const t of tomasDe(cfg)) {
    const x = d.tomas?.[t.id]
    const delMenu = kcalDePlatos(cfg, platosDe(cfg, menu, t.id).map((p) => p.id))
    previsto = previsto == null || delMenu == null ? null : previsto + delMenu
    const tocaba = hecha(x) || x?.estado === 'no' || ahoraMin == null || (limite(t) != null && ahoraMin >= limite(t)! + GRACIA_MIN)
    if (tocaba) hasta = hasta == null || delMenu == null ? null : hasta + delMenu

    if (!x || x.estado === 'no' || !hecha(x)) continue
    if (!x.estado || x.otro?.trim()) { sinDato.push(t.nombre); fuera += delMenu ?? 0; continue }
    const ids = (x.platos?.length ? x.platos : platosDe(cfg, menu, t.id).map((p) => p.id)).filter((id) => x.postre?.[id] !== 'no')
    const k = kcalDePlatos(cfg, ids)
    if (k == null) { sinDato.push(t.nombre); fuera += delMenu ?? 0; continue }
    comido += k * PARTE[x.estado]
  }
  const min = cfg.kcal_min || null
  const referencia = min ?? previsto
  // Las cifras de referencia se reparten entre las tomas en la proporción del menú.
  const parte = (kcalMenu: number | null) => (referencia == null || previsto == null || kcalMenu == null ? null : previsto ? Math.round(referencia * (Math.max(0, kcalMenu) / previsto)) : 0)
  return {
    comido: Math.round(comido), sinDato, previsto, previstoHasta: hasta, referencia, deMenu: !min,
    referenciaHasta: parte(hasta == null ? null : hasta - fuera), referenciaContable: parte(previsto == null ? null : previsto - fuera),
  }
}

export const fmtKcal = (n: number) => Math.round(n).toLocaleString('es-ES')
