import { LoQuePruebo } from '../cambios/LoQuePruebo'
import { Portada } from '../objetivos/Portada'

/** Pilar Evaluaciones: cómo voy cumpliendo mis objetivos (la semana) y lo que pruebo cada mes para prevenir
 *  las disautonomías, con los episodios de ese mes para compararlo. */
export default function Evaluaciones() {
  return (
    <div>
      <h1>Evaluaciones</h1>
      <Portada />
      <LoQuePruebo />
    </div>
  )
}
