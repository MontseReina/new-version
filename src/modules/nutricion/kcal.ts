/** Kilocalorías estimadas: las de los platos del menú (cifra guardada en los ajustes de cada plato) por la parte
 *  que se tomó. Son un suelo que alcanzar, nunca un tope. La referencia del día es la cifra pautada por
 *  nutrición clínica (`kcal_min`) o, sin ella, lo previsto en el menú de ese día. */
import { leerAlimentos, type Grupo, type Leido } from './alimentos'
import { GRACIA_MIN, hecha, limite, platosDe, tomasDe, type Estado, type MenuHoy, type NutriCfg, type NutriDia, type TomaDef, type TomaDia } from './logica'

export const PARTE: { [k in Estado]: number } = { entera: 1, tres_cuartos: 0.75, media: 0.5, no: 0 }
/** Por debajo de este porcentaje de lo previsto se avisa de que va por debajo. */
export const RANGO_POR_DEFECTO = 90

export interface KcalDia {
  /** Lo comido según lo registrado (sin las tomas de `sinDato`). */
  comido: number
  /** Tomas que no se pueden contar: «Otro» sin ningún alimento reconocido, sin decir cuánto, o un plato sin cifra. */
  sinDato: string[]
  /** Tomas con «Otro» en las que algún trozo no se ha reconocido: cuentan solo lo reconocido. */
  enParte: string[]
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

/** Cantidad de cada parte del plato dibujado: nada, poca, la que toca y (hidratos) más de la que toca. */
const FACTOR_PLATO = { veg: [0, 0.5, 1], prot: [0, 0.5, 1], hid: [0, 0.5, 1, 1.5] } as const
const PARTE_DEL_PLATO: Partial<Record<Grupo, keyof typeof FACTOR_PLATO>> = { verdura: 'veg', proteina: 'prot', hidrato: 'hid' }

export interface LeidoContado extends Leido {
  /** Parte que se cuenta: la del plato dibujado (comida y cena) o la de Entera, ¾ o Media. 1 si se escribió un número. */
  factor: number
  /** De dónde sale el factor. */
  segun: 'numero' | 'plato' | 'toma' | null
  kcalContadas: number
}

/** Kilocalorías de lo escrito en «Otro»: cada alimento por su ración casera (o por el número escrito) y por la
 *  cantidad marcada en el plato dibujado (verdura, proteína, hidratos) o, si no, en Entera, ¾ o Media. */
export function kcalOtro(t: TomaDef, x?: TomaDia): { items: LeidoContado[]; sinReconocer: string[]; total: number } {
  const { leidos, sinReconocer } = leerAlimentos(x?.otro ?? '')
  const deToma = x?.estado && x.estado !== 'no' ? PARTE[x.estado] : 1
  const items = leidos.map((l): LeidoContado => {
    if (l.conNumero) return { ...l, factor: 1, segun: 'numero', kcalContadas: l.kcal }
    const parte = t.plato ? PARTE_DEL_PLATO[l.alimento.grupo] : undefined
    const nivel = parte ? x?.plato?.[parte] : null
    const factor = parte && nivel != null ? FACTOR_PLATO[parte][nivel] ?? 1 : deToma
    const segun = parte && nivel != null ? 'plato' : deToma !== 1 ? 'toma' : null
    return { ...l, factor, segun, kcalContadas: Math.round(l.kcal * factor) }
  })
  return { items, sinReconocer, total: items.reduce((s, i) => s + i.kcalContadas, 0) }
}

const kcalDePlatos = (cfg: NutriCfg, ids: string[]) => {
  let s = 0
  for (const id of ids) { const k = cfg.platos?.[id]?.kcal; if (k == null) return null; s += k }
  return s
}

/** Kilocalorías de un día. `ahoraMin` = minutos del día para «lo que va de día»; `null` = el día entero. */
export function kcalDia(cfg: NutriCfg, d: NutriDia, menu: MenuHoy, ahoraMin: number | null): KcalDia {
  let comido = 0, previsto: number | null = 0, hasta: number | null = 0, fuera = 0
  const sinDato: string[] = [], enParte: string[] = []
  for (const t of tomasDe(cfg)) {
    const x = d.tomas?.[t.id]
    const delMenu = kcalDePlatos(cfg, platosDe(cfg, menu, t.id).map((p) => p.id))
    previsto = previsto == null || delMenu == null ? null : previsto + delMenu
    const tocaba = hecha(x) || x?.estado === 'no' || ahoraMin == null || (limite(t) != null && ahoraMin >= limite(t)! + GRACIA_MIN)
    if (tocaba) hasta = hasta == null || delMenu == null ? null : hasta + delMenu

    if (!x || x.estado === 'no' || !hecha(x)) continue
    if (x.otro?.trim()) {
      // «Otro» sustituye a lo del menú: cuenta lo que se reconoce de lo escrito.
      const o = kcalOtro(t, x)
      if (!o.items.length) { sinDato.push(t.nombre); fuera += delMenu ?? 0; continue }
      if (o.sinReconocer.length) enParte.push(t.nombre)
      comido += o.total
      continue
    }
    if (!x.estado) { sinDato.push(t.nombre); fuera += delMenu ?? 0; continue }
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
    comido: Math.round(comido), sinDato, enParte, previsto, previstoHasta: hasta, referencia, deMenu: !min,
    referenciaHasta: parte(hasta == null ? null : hasta - fuera), referenciaContable: parte(previsto == null ? null : previsto - fuera),
  }
}

export const fmtKcal = (n: number) => Math.round(n).toLocaleString('es-ES')
