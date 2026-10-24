/** Registro del día: lo que queda por rellenar, apartado por apartado, como el «Te queda por rellenar» de Huma.
 *  No cambia qué cuenta como registrado en cada área: solo lo reúne. Sin datos personales. */
import type { HidraCfg, HidraDia } from '../hidratacion/logica'
import { levantarHecho, objetivo, total } from '../hidratacion/logica'
import type { IntroCfg, IntroDia } from '../introspeccion/logica'
import { ejercicioActivo, escritas, paginas, PAGINAS } from '../introspeccion/logica'
import type { NutriCfg, NutriDia } from '../nutricion/logica'
import { hecha, limite, tomasDe, GRACIA_MIN } from '../nutricion/logica'
import type { SintCfg, SintDia } from '../sintomas/logica'
import { cumplimiento as cumplSintomas, gruposDe } from '../sintomas/logica'
import type { SuplCfg, SuplDia } from '../suplementos/logica'
import { clave, delDia, momentosDe, MOMENTOS } from '../suplementos/logica'

export interface EstadoApartado {
  id: string
  /** Ruta de su pantalla, sin barra inicial. */
  to: string
  ico: string
  nombre: string
  completo: boolean
  /** Cosas que quedan por apuntar (0 si está completo). */
  faltan: number
  /** Qué falta, en una línea. */
  falta: string
  /** Algo que ya tocaba (una toma pasada su hora): se resalta. */
  urge?: boolean
}

export interface DatosDia {
  sintomas: SintDia; sintCfg: SintCfg | null
  suplementos: SuplDia; suplCfg: SuplCfg | null
  nutricion: NutriDia; nutriCfg: NutriCfg | null
  hidratacion: HidraDia; hidraCfg: HidraCfg | null
  introspeccion: IntroDia; introCfg: IntroCfg | null
}

type Base = Pick<EstadoApartado, 'id' | 'to' | 'ico' | 'nombre'>
function hecho(a: Base): EstadoApartado {
  return { ...a, completo: true, faltan: 0, falta: '' }
}

/** «a», «a y b», «a, b y c». */
export const enumera = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`)
const minus = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const NOMBRE_MOMENTO: { [k: string]: string } = Object.fromEntries(MOMENTOS)

/**
 * Estado de cada apartado del día, en el orden en que se rellenan.
 * `ahoraMin`: minutos del día, solo para el día en curso (marca las tomas que ya tocaban).
 */
export function apartadosDelDia(x: DatosDia, date: string, ahoraMin: number | null): EstadoApartado[] {
  const out: EstadoApartado[] = []

  // Signos y síntomas: los apartados que piden respuesta cada día.
  {
    const base = { id: 'sintomas', to: 'sintomas', ico: '📝', nombre: 'Signos y síntomas' }
    const c = cumplSintomas(gruposDe(x.sintCfg), x.sintomas)
    out.push(c.faltan.length ? { ...base, completo: false, faltan: c.faltan.length, falta: `Falta: ${enumera(c.faltan.map(minus))}` } : hecho(base))
  }

  // Suplementos: tomas de hoy sin marcar (hecha, no hecha o no precisa).
  {
    const base = { id: 'suplementos', to: 'suplementos', ico: '💊', nombre: 'Suplementos' }
    const t = x.suplementos.tomas ?? {}
    const claves = delDia(x.suplCfg?.lista ?? [], date).flatMap((p) => momentosDe(p).map((m) => ({ k: clave(p, m), m })))
    const sin = claves.filter(({ k }) => !t[k])
    if (claves.length && sin.length) {
      const orden = (m: string) => { const i = MOMENTOS.findIndex(([k]) => k === m); return i < 0 ? 99 : i }
      const momentos = [...new Set([...sin].sort((a, b) => orden(a.m) - orden(b.m)).map(({ m }) => NOMBRE_MOMENTO[m] ?? 'a demanda'))]
      out.push({ ...base, completo: false, faltan: sin.length, falta: `${claves.length - sin.length} de ${claves.length} tomas marcadas · faltan ${enumera(momentos.map(minus))}` })
    } else if (claves.length) out.push(hecho(base))
  }

  // Nutrición: tomas sin anotar (hechas, en parte o «no»).
  {
    const base = { id: 'nutricion', to: 'nutricion', ico: '🥣', nombre: 'Nutrición' }
    const defs = x.nutriCfg ? tomasDe(x.nutriCfg) : []
    const sin = defs.filter((d) => { const v = x.nutricion.tomas?.[d.id]; return !hecha(v) && v?.estado !== 'no' })
    const tarde = ahoraMin == null ? [] : sin.filter((d) => { const l = limite(d); return l != null && ahoraMin > l + GRACIA_MIN })
    if (defs.length && sin.length) {
      out.push({
        ...base, completo: false, faltan: sin.length, urge: tarde.length > 0,
        falta: `${defs.length - sin.length} de ${defs.length} tomas · ${tarde.length ? `ya tocaba: ${enumera(tarde.map((d) => minus(d.nombre)))}` : `faltan ${enumera(sin.map((d) => minus(d.nombre)))}`}`,
      })
    } else if (defs.length) out.push(hecho(base))
  }

  // Hidratación: el objetivo del día y el vaso con el chupito de mar al levantarse.
  {
    const base = { id: 'hidratacion', to: 'hidratacion', ico: '💧', nombre: 'Hidratación' }
    const obj = objetivo(x.hidraCfg), tot = total(x.hidratacion)
    const partes: string[] = []
    if (!levantarHecho(x.hidraCfg, x.hidratacion)) partes.push('vaso y chupito al levantarte')
    if (tot < obj) partes.push(`${tot.toLocaleString('es-ES')} de ${obj.toLocaleString('es-ES')} ml`)
    out.push(partes.length ? { ...base, completo: false, faltan: partes.length, falta: partes.join(' · ') } : hecho(base))
  }

  // Trabajo introspectivo: diario de la mañana, tres agradecimientos y el ejercicio de ahora.
  {
    const base = { id: 'introspeccion', to: 'introspeccion', ico: '💛', nombre: 'Trabajo introspectivo' }
    const partes: string[] = []
    const p = paginas(x.introspeccion.diario)
    if (p < PAGINAS) partes.push(p > 0 ? `diario (${Math.floor(p)} de ${PAGINAS} páginas)` : 'diario de la mañana')
    const g = escritas(x.introspeccion)
    if (g < 3) partes.push(`agradecimientos (${g} de 3)`)
    const act = ejercicioActivo(x.introCfg)
    if (act && !x.introspeccion.hechos?.[act.id]) partes.push('ejercicio de ahora')
    out.push(partes.length ? { ...base, completo: false, faltan: partes.length, falta: `Falta: ${enumera(partes)}` } : hecho(base))
  }
  return out
}
