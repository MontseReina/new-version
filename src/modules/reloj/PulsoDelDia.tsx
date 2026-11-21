import type { OuraDia } from '../oura/tipos'
import { horaMas } from '../oura/graficos'
import { CurvaDoble } from './CurvaDoble'
import type { RelojDia } from './tipos'

const COLOR_RELOJ = 'var(--red)'
const COLOR_OURA = 'var(--green)'
const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const nums = (xs?: (number | null)[]) => (xs ?? []).filter((v): v is number => v != null)

/**
 * Pulso del día en Disautonomía (encima de Constantes): una curva con dos líneas, la del reloj (roja) y la de Oura;
 * debajo, la curva de la variabilidad de la noche (de las 18:00 del día anterior a las 18:00), también reloj y Oura; y debajo una tabla con los mismos datos de cada uno, el reloj a la izquierda y Oura a la derecha.
 * Las tomas de tensión del reloj salen dentro de Constantes. Sin datos de ninguno, nada.
 */
/** Eje de la noche para la variabilidad: de las 18:00 del día anterior a las 18:00 de este día, cada 10 minutos (144 casillas). */
const VFC_INICIO = 18 * 60, VFC_PASO = 10, VFC_N = 144
const casilla = (hm: string, delDiaAnterior: boolean) => {
  const m = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))
  const t = delDiaAnterior ? m - VFC_INICIO : m + (24 * 60 - VFC_INICIO)
  const i = Math.round(t / VFC_PASO)
  return i >= 0 && i < VFC_N ? i : null
}
/** Variabilidad del reloj en el eje de la noche: la de la tarde-noche anterior (desde las 18:00) y la de este día hasta las 18:00. */
function vfcReloj(r: RelojDia | null, ayer: RelojDia | null): (number | null)[] {
  const v: (number | null)[] = Array(VFC_N).fill(null)
  for (const [h, ms] of ayer?.vfc ?? []) if (h >= '18:00') { const i = casilla(h, true); if (i != null) v[i] = ms }
  for (const [h, ms] of r?.vfc ?? []) if (h < '18:00') { const i = casilla(h, false); if (i != null) v[i] = ms }
  return v
}
/** Variabilidad de Oura (una cada 5 minutos desde que se acostó) en el mismo eje, media por casilla de 10 minutos. */
function vfcOura(o: OuraDia | null): (number | null)[] {
  const v: (number | null)[] = Array(VFC_N).fill(null)
  const serie = o?.noche?.vfc5, ini = o?.noche?.dormir
  if (!serie?.length || !ini) return v
  const m0 = Number(ini.slice(0, 2)) * 60 + Number(ini.slice(3, 5))
  const suma: number[] = Array(VFC_N).fill(0), n: number[] = Array(VFC_N).fill(0)
  serie.forEach((ms, k) => {
    if (ms == null) return
    const m = m0 + k * 5
    const t = m0 >= VFC_INICIO ? m - VFC_INICIO : m + (24 * 60 - VFC_INICIO)
    const i = Math.floor(t / VFC_PASO)
    if (i >= 0 && i < VFC_N) { suma[i] += ms; n[i]++ }
  })
  return suma.map((s, i) => (n[i] ? Math.round(s / n[i]) : null))
}

/** Pulso del día minuto a minuto (1440 casillas desde las 00:00). */
const DIA_MIN = 1440
/** Pulso a partir del cual una lectura se marca aparte en la curva (como los ratos de la tabla). */
const FC_ALTA = 100
/** Más de este hueco sin lecturas del reloj (minutos) corta la línea. */
const FC_HUECO_MIN = 60

/**
 * Cada medición de pulso del reloj en su minuto: la línea va por el valor de la lectura y, si en ese minuto
 * se llegó a 100 lpm o más, el máximo se marca con un círculo. Sin lecturas sueltas, la media de cada media hora.
 */
function fcRelojMinutos(r: RelojDia | null): { valores: (number | null)[]; picos: (number | null)[] } {
  const valores: (number | null)[] = Array(DIA_MIN).fill(null)
  const picos: (number | null)[] = Array(DIA_MIN).fill(null)
  const fp = r?.fc_puntos ?? []
  if (fp.length) {
    for (const [h, med, max] of fp) {
      const i = Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
      if (!(i >= 0 && i < DIA_MIN)) continue
      valores[i] = med
      if (max >= FC_ALTA) picos[i] = max
    }
  } else (r?.fc_dia ?? []).forEach((v, k) => { if (v != null && k * 30 < DIA_MIN) valores[k * 30] = v })
  return { valores, picos }
}
/** La curva de Oura (una media cada 30 minutos) en el mismo eje de minutos. */
function fcOuraMinutos(o: OuraDia | null): (number | null)[] {
  const v: (number | null)[] = Array(DIA_MIN).fill(null)
  ;(o?.fc_dia ?? []).forEach((x, k) => { if (x != null && k * 30 < DIA_MIN) v[k * 30] = x })
  return v
}

export function PulsoDelDia({ reloj: r, oura: o, relojAyer = null }: { reloj: RelojDia | null; oura: OuraDia | null; relojAyer?: RelojDia | null }) {
  const { valores: fcR, picos: picosR } = fcRelojMinutos(r)
  const fcO = fcOuraMinutos(o)
  const vfcR = (r?.vfc ?? []).map((p) => p[1])
  const satR = (r?.spo2 ?? []).map((p) => p[1])
  const okO = nums(o?.fc_dia)
  const maxO = Math.max(...okO, ...(o?.fc_altas ?? []).map((a) => a.fc))
  const filas: { k: string; r: string | null; o: string | null; nota?: string }[] = [
    { k: 'Pulso en reposo', r: r?.fc?.reposo != null ? `${r.fc.reposo} lpm` : null, o: o?.noche?.fc_min != null ? `${o.noche.fc_min} lpm` : null, nota: 'Oura: el más bajo de la noche' },
    { k: 'Pulso mín · media · máx', r: r?.fc?.min != null ? `${r.fc.min} · ${r.fc.media} · ${r.fc.max}` : null, o: okO.length ? `${Math.min(...okO)} · ${media(okO)} · ${maxO}` : null },
    { k: 'Ratos a 100 lpm o más', r: r ? String(r.fc_altas?.length ?? 0) : null, o: o ? String(o.fc_altas?.length ?? 0) : null },
    { k: 'Variabilidad (VFC)', r: vfcR.length ? `${media(vfcR)} ms` : null, o: o?.noche?.vfc_media != null ? `${o.noche.vfc_media} ms` : null, nota: 'media de la noche' },
    { k: 'Saturación', r: satR.length ? `${media(satR)} % · mín ${Math.min(...satR)} %` : null, o: o?.spo2?.media != null ? `${Math.round(o.spo2.media)} %` : null },
    { k: 'Tensiones', r: r?.ta?.length ? `${r.ta.length} (en Constantes)` : null, o: null },
  ].filter((f) => f.r != null || f.o != null)
  const hayCurva = nums(fcR).length > 0 || okO.length > 0
  // Se recorta el eje a las horas con datos (con media hora de margen), para que la noche ocupe todo el ancho.
  const vR0 = vfcReloj(r, relojAyer), vO0 = vfcOura(o)
  const con = vR0.map((v, i) => (v != null || vO0[i] != null ? i : -1)).filter((i) => i >= 0)
  const desde = con.length ? Math.max(0, con[0] - 3) : 0
  const hasta = con.length ? Math.min(VFC_N, con[con.length - 1] + 4) : 0
  const vR = vR0.slice(desde, hasta), vO = vO0.slice(desde, hasta)
  const vfcIni = horaMas('18:00', desde * VFC_PASO)
  const hayVfc = con.length > 0
  if (!hayCurva && !hayVfc && !filas.length) return null
  return (
    <div className="card pulso-dia">
      <h3 style={{ margin: 0 }}>❤️ Pulso del día <span className="tag">automático</span></h3>
      {hayCurva && <CurvaDoble titulo="Frecuencia cardíaca" unidad="lpm" inicio="00:00" paso={1} alto={110}
        ventanas={[{ etiqueta: '3 h', casillas: 180 }, { etiqueta: '6 h', casillas: 360 }, { etiqueta: 'Día', casillas: DIA_MIN }]}
        series={[
          { nombre: 'Reloj', valores: fcR, picos: picosR, color: COLOR_RELOJ, unir: true, hueco: FC_HUECO_MIN, cerca: 20 },
          { nombre: 'Oura', valores: fcO, color: COLOR_OURA, unir: true, hueco: 30, puntos: false, cerca: 15 },
        ]} />}
      {(r?.fc_puntos?.length ?? 0) > 0 && <p className="muted small" style={{ margin: '.1rem 0 0' }}>Cada punto rojo es una medición del reloj{picosR.some((p) => p != null) ? `; los círculos, lecturas a ${FC_ALTA} lpm o más` : ''}.</p>}
      {hayVfc && <CurvaDoble titulo="Variabilidad (VFC) de la noche" unidad="ms" inicio={vfcIni} paso={VFC_PASO} alto={84}
        series={[{ nombre: 'Reloj', valores: vR, color: COLOR_RELOJ, unir: true, cerca: 3 }, { nombre: 'Oura', valores: vO, color: COLOR_OURA }]} />}
      {filas.length > 0 && (
        <table className="pulso-tabla small">
          <thead><tr><th /><th style={{ color: COLOR_RELOJ }}>Reloj</th><th style={{ color: COLOR_OURA }}>Oura</th></tr></thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.k}>
                <th scope="row">{f.k}{f.nota && <span className="muted"> · {f.nota}</span>}</th>
                <td>{f.r ?? '—'}</td>
                <td>{f.o ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(vfcR.length > 0 || o?.noche?.vfc_media != null || hayVfc) && <p className="muted small" style={{ margin: '.3rem 0 0' }}>La variabilidad del reloj y la de Oura se calculan de forma distinta: compáralas por si suben o bajan a la vez, no por la cifra.</p>}
    </div>
  )
}
