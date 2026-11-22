import { Linea } from './TestOrtostatico'
import { resultadoDia, type SintDia } from './logica'

/** Una caída tras comer que cuenta: 20 mmHg o más de la alta, o pasar de 100 o más antes a menos de 90 después. */
const postprandial = (c: { antes: number; despues: number; caida: number }) => c.caida >= 20 || (c.antes >= 100 && c.despues < 90)

/**
 * Resultado de las tensiones del día (hoja Hipotensión, desde la 0.27.0): fuera del test de pie de la mañana.
 * Tensión alta más baja, tomas por debajo de 90 y, por comidas, la caída entre «antes de» y «después de».
 */
export function TensionesDia({ d }: { d: SintDia }) {
  const r = resultadoDia(d)
  if (!r.tomas.length && !r.noCapta) return null
  return (
    <div className="card sint-grupo test-orto">
      <h3 style={{ margin: 0 }}>📉 Tensiones del día · resultado</h3>
      <p className="muted small" style={{ margin: '.2rem 0 .5rem' }}>Todas las tensiones de hoy fuera del test de pie: las fijas del día y las esporádicas.</p>
      <div className="test-resultado" style={{ marginTop: 0 }}>
        {r.pasMin && <Linea nivel={r.pasMin.pas < 90 ? 'aviso' : 'ok'}><b>Tensión alta más baja: {r.pasMin.pas}</b> ({r.pasMin.etiqueta.toLowerCase()}{r.pasMin.hora ? `, ${r.pasMin.hora}` : ''}).</Linea>}
        <Linea nivel={r.bajo90 || r.noCapta ? 'aviso' : 'ok'}><b>Por debajo de 90:</b> {r.bajo90 ? `${r.bajo90} de ${r.tomas.length} tomas` : `ninguna de ${r.tomas.length} tomas`}{r.noCapta ? ` · ${r.noCapta} sin captar (muy baja)` : ''}.</Linea>
        {r.comidas.map((c) => (
          <Linea key={c.comida} nivel={postprandial(c) ? 'aviso' : 'ok'}>
            <b>{c.comida}:</b> {c.antes} antes → {c.despues} después{c.min ? ` (${c.min >= 120 ? '2 h o más' : `${c.min} min`} tras comer)` : ''} · {c.caida > 0 ? `baja ${c.caida}` : c.caida < 0 ? `sube ${-c.caida}` : 'igual'}{postprandial(c) ? ': llega al criterio de hipotensión tras comer.' : '.'}
          </Linea>
        ))}
        {!r.comidas.length && <Linea nivel="nada">Para ver la caída tras comer, anota la tensión antes y después de desayunar, comer o cenar.</Linea>}
        <p className="small muted" style={{ margin: '.4rem 0 0' }}>Patrón a valorar por tu médico, no un diagnóstico. Hipotensión tras comer: caída de la tensión alta de 20 mmHg o más en las 2 horas siguientes a la comida, o bajar de 90 cuando antes estaba en 100 o más.</p>
      </div>
    </div>
  )
}
