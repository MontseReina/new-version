import { Empty } from '../../components/ui'
import Ciclo from '../ciclo/Ciclo'

/** Signos y síntomas. Empieza por el ciclo; el resto de grupos se añade debajo. */
export default function Sintomas() {
  return (
    <div>
      <h1>Signos y síntomas</h1>
      <Ciclo />
      <div className="card"><Empty>Dolor, energía, digestión y el resto de signos y síntomas están en preparación.</Empty></div>
    </div>
  )
}
