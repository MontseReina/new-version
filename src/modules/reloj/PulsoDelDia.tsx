import type { OuraDia } from '../oura/tipos'
import { CurvaDoble } from './CurvaDoble'
import type { RelojDia } from './tipos'

const COLOR_RELOJ = 'var(--red)'
const COLOR_OURA = 'var(--green)'
const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const nums = (xs?: (number | null)[]) => (xs ?? []).filter((v): v is number => v != null)

/**
 * Pulso del día en Disautonomía (encima de Constantes): una curva con dos líneas, la del reloj (roja) y la de Oura,
 * y debajo una tabla con los mismos datos de cada uno, el reloj a la izquierda y Oura a la derecha.
 * Las tomas de tensión del reloj salen dentro de Constantes. Sin datos de ninguno, nada.
 */
export function PulsoDelDia({ reloj: r, oura: o }: { reloj: RelojDia | null; oura: OuraDia | null }) {
  const fcR = r?.fc_dia ?? []
  const fcO = o?.fc_dia ?? []
  const vfcR = (r?.vfc ?? []).map((p) => p[1])
  const satR = (r?.spo2 ?? []).map((p) => p[1])
  const okO = nums(fcO)
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
  if (!hayCurva && !filas.length) return null
  return (
    <div className="card pulso-dia">
      <h3 style={{ margin: 0 }}>❤️ Pulso del día <span className="tag">automático</span></h3>
      {hayCurva && <CurvaDoble titulo="Frecuencia cardíaca" unidad="lpm" inicio="00:00" paso={30} alto={84}
        series={[{ nombre: 'Reloj', valores: fcR, color: COLOR_RELOJ }, { nombre: 'Oura', valores: fcO, color: COLOR_OURA }]} />}
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
      {(vfcR.length > 0 || o?.noche?.vfc_media != null) && <p className="muted small" style={{ margin: '.3rem 0 0' }}>La variabilidad del reloj y la de Oura se calculan de forma distinta: compáralas por si suben o bajan a la vez, no por la cifra.</p>}
    </div>
  )
}
