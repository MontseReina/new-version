/** Avisos al móvil: qué aviso toca en cada momento. Lo usa la función del servidor `avisos`, que lo revisa
 *  cada cinco minutos, y la página Avisos para enseñar la lista. Sin datos personales: horas, pautas y
 *  menús salen de los ajustes y registros de cada usuaria. */
import { filaLevantar, total, type HidraCfg, type HidraDia } from '../hidratacion/logica'
import { fmtKcal, kcalDia, RANGO_POR_DEFECTO } from '../nutricion/kcal'
import {
  AYUNO_MAX_POR_DEFECTO, CENA_MAX_POR_DEFECTO, GRACIA_MIN, aHora, aMin, finDe, hecha, limite, tomasDe, ultimaComida,
  type MenuHoy, type NutriCfg, type NutriDia,
} from '../nutricion/logica'
import { DORMIR_TRAS_CENA_MIN, type ObjCfg } from '../objetivos/logica'

export type AvisoId = 'ayuno' | 'primera' | 'agua' | 'kcal' | 'dormir' | 'pendiente' | 'cena'

export const AVISOS: { id: AvisoId; nombre: string; detalle: string; porDefecto: boolean }[] = [
  { id: 'ayuno', nombre: 'Horas sin comer', detalle: 'Media hora antes de cumplir las horas de ayuno, al cumplirlas y cada hora que pase después sin comer.', porDefecto: true },
  { id: 'primera', nombre: 'Primera toma del día', detalle: 'Si pasa una hora desde que te levantas sin ninguna toma. La hora de levantarte es la del botón «Vaso de agua y chupito de mar al levantarme» de Hidratación.', porDefecto: true },
  { id: 'agua', nombre: 'Agua a mediodía', detalle: 'A la hora que digas, si no llegas a la cantidad mínima.', porDefecto: true },
  { id: 'kcal', nombre: 'Kilocalorías del día', detalle: 'A media tarde, si vas en rango o por debajo de lo previsto hasta esa hora; y el balance del día después de cenar. Nunca avisa por pasarte.', porDefecto: true },
  { id: 'dormir', nombre: 'Ya puedes acostarte', detalle: 'Cuando pasan las horas mínimas desde que terminas de cenar.', porDefecto: true },
  { id: 'pendiente', nombre: 'Comida principal sin anotar', detalle: 'Desayuno, comida o cena sin anotar media hora después de su hora.', porDefecto: true },
  { id: 'cena', nombre: 'Hora de cenar', detalle: 'Media hora antes de la hora máxima de terminar la cena, si aún no has empezado.', porDefecto: true },
]

export type AvisosCfg = {
  activos?: { [k in AvisoId]?: boolean }
  /** `discreto`: en la pantalla bloqueada solo sale el apartado, sin detalles. */
  texto?: 'completo' | 'discreto'
  silencio_desde?: string
  silencio_hasta?: string
  agua_hora?: string
  agua_ml?: number
  kcal_hora?: string
  rango_pct?: number
}
export const SILENCIO_DESDE = '23:30'
export const SILENCIO_HASTA = '07:30'
export const AGUA_HORA = '12:00'
export const AGUA_ML = 500
export const KCAL_HORA = '17:30'

export const activo = (c: AvisosCfg, id: AvisoId) => c.activos?.[id] ?? AVISOS.find((a) => a.id === id)!.porDefecto

export interface Aviso {
  /** Una vez al día por clave. */
  clave: string
  id: AvisoId
  titulo: string
  cuerpo: string
  /** Página que abre al tocarlo. */
  ruta: string
}

export interface Contexto {
  hoy: string
  ahoraMin: number
  cfg: AvisosCfg
  nutriCfg: NutriCfg
  hidraCfg: HidraCfg | null
  objCfg: ObjCfg
  menu: MenuHoy
  nutriHoy: NutriDia
  nutriAyer: NutriDia | null
  hidraHoy: HidraDia
}

const enSilencio = (c: AvisosCfg, m: number) => {
  const a = aMin(c.silencio_desde ?? SILENCIO_DESDE), b = aMin(c.silencio_hasta ?? SILENCIO_HASTA)
  if (a == null || b == null || a === b) return false
  return a < b ? m >= a && m < b : m >= a || m < b
}
/** ¿Estamos dentro de la franja [desde, desde + dura) minutos? */
const dentro = (m: number, desde: number, dura: number) => m >= desde && m < desde + dura

/** Hora a la que se levantó hoy: la del toque «al levantarme» de Hidratación. */
export function horaLevantar(hc: HidraCfg | null, d: HidraDia): number | null {
  const i = filaLevantar(hc)
  const k = i >= 0 ? 'pauta:' + i : 'levantar'
  const t = (d.horas ?? []).find((x) => x.k === k)
  return aMin(t?.h)
}

/** Todos los avisos que tocan ahora, antes de quitar los ya enviados. */
export function avisosAhora(x: Contexto): Aviso[] {
  const { ahoraMin: m, cfg, nutriCfg: nc } = x
  if (enSilencio(cfg, m)) return []
  const out: Aviso[] = []
  const defs = tomasDe(nc)
  const algunaHoy = defs.some((t) => hecha(x.nutriHoy.tomas?.[t.id]))

  // 1. Horas sin comer: desde la última comida con hora (la cena de ayer si hoy aún no ha comido).
  if (activo(cfg, 'ayuno')) {
    const u = ultimaComida(nc, x.nutriAyer, x.nutriHoy, m)
    const max = (nc.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO) * 60
    if (u) {
      const cenaId = defs[defs.length - 1]?.id
      const sinCena = u.ayer && cenaId != null && !hecha(x.nutriAyer?.tomas?.[cenaId])
      const nota = sinCena ? ' (La cena de ayer no está anotada.)' : ''
      const primera = (defs[0]?.nombre ?? 'primera toma').toLowerCase()
      if (dentro(u.minutos, max - 30, 30)) {
        out.push({ clave: 'ayuno-antes', id: 'ayuno', titulo: 'Ayuno', ruta: 'nutricion',
          cuerpo: algunaHoy
            ? `A las ${aHora(m + max - u.minutos)} se cumplen ${max / 60} horas desde tu última comida. Buen momento para preparar algo rico 🌿${nota}`
            : `A las ${aHora(m + max - u.minutos)} se cumplen tus ${max / 60} horas de descanso digestivo. Buen momento para preparar tu ${primera} 🌿${nota}` })
      } else if (u.minutos >= max) {
        const h = Math.floor(u.minutos / 60)
        if (u.minutos - h * 60 < 30 && h <= 20) {
          out.push({ clave: 'ayuno-' + h, id: 'ayuno', titulo: 'Ayuno', ruta: 'nutricion',
            cuerpo: (h * 60 === max
              ? (algunaHoy ? `¡${h} horas desde tu última comida! Ahora toca nutrirte.` : `¡${h} horas de descanso cumplidas! Ahora toca nutrirte: tu ${primera} te espera.`)
              : `Han pasado ${h} horas desde tu última comida. Tu cuerpo agradecerá un poco de alimento ahora; date ese cuidado.`) + nota })
        }
      }
    }
  }

  // 2. Primera toma: una hora después de levantarse sin ninguna toma.
  if (activo(cfg, 'primera') && !algunaHoy) {
    const w = horaLevantar(x.hidraCfg, x.hidraHoy)
    if (w != null && dentro(m, w + 60, 90)) {
      out.push({ clave: 'primera', id: 'primera', titulo: 'Primera toma', ruta: 'nutricion',
        cuerpo: `Buenos días ☀️ Hace una hora que te levantaste: tu primera toma es el primer gesto de cuidado del día.` })
    }
  }

  // 3. Agua a mediodía.
  if (activo(cfg, 'agua')) {
    const h = aMin(cfg.agua_hora ?? AGUA_HORA) ?? 720, min = cfg.agua_ml ?? AGUA_ML
    const t = total(x.hidraHoy)
    if (dentro(m, h, 90) && t < min) {
      out.push({ clave: 'agua', id: 'agua', titulo: 'Hidratación', ruta: 'hidratacion',
        cuerpo: `Mediodía: llevas ${t} ml. ${min - t <= 250 ? 'Un vaso más' : `Unos ${min - t} ml más`} y llegas a los ${min} 💧` })
    }
  }

  // 4. Kilocalorías: a media tarde, lo que va de día; después de cenar, el día entero.
  if (activo(cfg, 'kcal')) {
    const rango = (cfg.rango_pct ?? RANGO_POR_DEFECTO) / 100
    const sin = (s: string[]) => (s.length ? ` (Sin contar: ${s.join(', ').toLowerCase()}.)` : '')
    const h = aMin(cfg.kcal_hora ?? KCAL_HORA) ?? 1050
    if (dentro(m, h, 60)) {
      const k = kcalDia(nc, x.nutriHoy, x.menu, m)
      if (k.referenciaHasta) {
        const ok = k.comido >= k.referenciaHasta * rango
        out.push({ clave: 'kcal-tarde', id: 'kcal', titulo: 'Kilocalorías', ruta: 'nutricion',
          cuerpo: ok
            ? `¡Vas genial! Unas ${fmtKcal(k.comido)} kcal de las ${fmtKcal(k.referenciaHasta)} previstas hasta ahora. Sigue así 💪${sin(k.sinDato)}`
            : `Llevas unas ${fmtKcal(k.comido)} kcal. Con el snack y la cena entera te acercas a lo previsto: cada bocado suma.${sin(k.sinDato)}` })
      }
    }
    // Balance del día: media hora después de terminar la cena o, sin cena anotada, a la hora máxima de cenar + 30 min.
    const cena = defs[defs.length - 1]
    const xc = cena ? x.nutriHoy.tomas?.[cena.id] : undefined
    const finCena = hecha(xc) ? finDe(xc) : null
    const tope = (aMin(nc.cena_fin_max ?? CENA_MAX_POR_DEFECTO) ?? 1260) + 30
    const cuando = finCena != null ? finCena + 30 : tope
    if (dentro(m, cuando, 90)) {
      const k = kcalDia(nc, x.nutriHoy, x.menu, null)
      const ref = k.referenciaContable
      if (ref) {
        const pct = Math.round((k.comido / ref) * 100)
        const de = k.deMenu ? 'del menú' : 'pautadas'
        out.push({ clave: 'kcal-dia', id: 'kcal', titulo: 'Kilocalorías del día', ruta: 'nutricion',
          cuerpo: (k.comido >= ref * rango
            ? `¡Día cumplido! Unas ${fmtKcal(k.comido)} kcal (${pct} %). Gracias por cuidarte hoy 🌸`
            : `Hoy has llegado a unas ${fmtKcal(k.comido)} kcal (${pct} %). Mañana es otra oportunidad para nutrirte un poquito más.`)
            + (finCena == null ? ' Si ya has cenado, anótalo en la app 😊' : '') + sin(k.sinDato) })
      }
    }
  }

  // 5. Ya puedes acostarte: las horas mínimas después de terminar la cena.
  if (activo(cfg, 'dormir')) {
    const cena = defs[defs.length - 1]
    const xc = cena ? x.nutriHoy.tomas?.[cena.id] : undefined
    const fin = hecha(xc) ? aMin(xc?.fin) : null
    const tras = x.objCfg.dormir_tras_cena_min ?? DORMIR_TRAS_CENA_MIN
    if (fin != null && dentro(m, fin + tras, 60)) {
      out.push({ clave: 'dormir', id: 'dormir', titulo: 'A dormir', ruta: 'nutricion',
        cuerpo: `Ya han pasado ${tras % 60 ? `${Math.floor(tras / 60)} h ${tras % 60} min` : `${tras / 60} horas`} desde la cena. Buen momento para irte a descansar. Que duermas bien 🌙` })
    }
  }

  // 6. Comida principal sin anotar.
  if (activo(cfg, 'pendiente')) {
    // La cena no, si ya está el aviso de la hora de cenar.
    const ultima = defs[defs.length - 1]
    for (const t of defs.filter((t) => t.principal && !(t === ultima && activo(cfg, 'cena')))) {
      const xt = x.nutriHoy.tomas?.[t.id], l = limite(t)
      if (l != null && !hecha(xt) && xt?.estado !== 'no' && dentro(m, l + GRACIA_MIN, 60)) {
        out.push({ clave: 'pendiente-' + t.id, id: 'pendiente', titulo: t.nombre, ruta: 'nutricion',
          cuerpo: `¿Qué tal ${t.nombre.toLowerCase() === 'comida' ? 'la comida' : t.nombre.toLowerCase() === 'cena' ? 'la cena' : 'el ' + t.nombre.toLowerCase()}? Cuando puedas, anótalo en la app 😊` })
      }
    }
  }

  // 7. Hora de cenar.
  if (activo(cfg, 'cena')) {
    const cena = defs[defs.length - 1]
    const xc = cena ? x.nutriHoy.tomas?.[cena.id] : undefined
    const max = aMin(nc.cena_fin_max ?? CENA_MAX_POR_DEFECTO) ?? 1260
    if (cena && !hecha(xc) && aMin(xc?.ini) == null && dentro(m, max - 30, 30)) {
      out.push({ clave: 'cena', id: 'cena', titulo: 'Cena', ruta: 'nutricion',
        cuerpo: `Son las ${aHora(max - 30)}: buen momento para empezar a cenar con calma y terminar antes de las ${aHora(max)}.` })
    }
  }
  return out
}

/** Quita los ya enviados hoy y evita dos avisos de comer seguidos: la «primera toma» no sale si un aviso
 *  de ayuno salió hace menos de 45 minutos (o sale a la vez). `enviados` = clave → minuto del día. */
export function filtrar(avisos: Aviso[], enviados: { [clave: string]: number }, ahoraMin: number): Aviso[] {
  const nuevos = avisos.filter((a) => enviados[a.clave] == null)
  const ayunoReciente = nuevos.some((a) => a.id === 'ayuno') || Object.entries(enviados).some(([k, v]) => k.startsWith('ayuno-') && ahoraMin - v < 45)
  return nuevos.filter((a) => !(a.id === 'primera' && ayunoReciente))
}

/** Texto discreto para la pantalla bloqueada. */
export const discreto = (a: Aviso): Aviso => ({ ...a, titulo: 'New Version', cuerpo: `Tienes un aviso de ${a.ruta === 'hidratacion' ? 'Hidratación' : 'Nutrición'}.` })
