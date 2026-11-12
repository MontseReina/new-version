import { Curva } from './graficos'

/** Frecuencia cardíaca del día del anillo Oura, en pequeño, para Disautonomía (encima de Constantes). Sin datos, nada. */
export function FcDelDia({ fc }: { fc?: (number | null)[] | null }) {
  if (!fc || !fc.some((v) => v != null)) return null
  return (
    <div className="oura fc-del-dia">
      <Curva titulo="Frecuencia cardíaca del día (Oura)" valores={fc} inicio="00:00" paso={30} unidad="lpm" color="var(--red)" alto={72} />
    </div>
  )
}
