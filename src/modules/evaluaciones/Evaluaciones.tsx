import { LoQuePruebo } from '../cambios/LoQuePruebo'
import { Portada } from '../objetivos/Portada'
import { InformeConstantes } from './InformeConstantes'

/** Pilar Evaluaciones: cómo voy cumpliendo mis objetivos (la semana), lo que pruebo cada mes para prevenir
 *  las disautonomías, con los episodios de ese mes para compararlo, y las constantes por días para imprimir.
 *  Al imprimir solo sale el registro de constantes. */
export default function Evaluaciones() {
  return (
    <div>
      <div className="no-print">
        <h1>Evaluaciones</h1>
        <Portada />
        <LoQuePruebo />
      </div>
      <InformeConstantes />
    </div>
  )
}
