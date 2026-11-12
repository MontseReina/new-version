import { LoQuePruebo } from '../cambios/LoQuePruebo'
import { EvaluacionCiclos } from '../ciclo/Evaluacion'
import { Portada } from '../objetivos/Portada'
import { EpisodiosMes } from './Episodios'
import { InformeConstantes } from './InformeConstantes'

/** Pilar Evaluaciones: cómo voy cumpliendo mis objetivos (la semana), el registro de episodios del mes,
 *  la evaluación de mis ciclos, lo que pruebo cada mes para prevenir las disautonomías y las constantes
 *  por semanas para imprimir. Al imprimir solo sale el registro de constantes. */
export default function Evaluaciones() {
  return (
    <div>
      <div className="no-print">
        <h1>Evaluaciones</h1>
        <Portada />
        <EpisodiosMes />
        <EvaluacionCiclos />
        <LoQuePruebo />
      </div>
      <InformeConstantes />
    </div>
  )
}
