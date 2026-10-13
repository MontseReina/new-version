import { getDaily, saveDaily } from '../../store/repo'
import { diaDelMes, unirPlan, type Plan, type VidaMes } from './logica'

/**
 * Guarda el plan en el documento de su mes, sin tocar lo ya marcado ni los logros. Si ya había
 * plan de ese mes, las semanas nuevas sustituyen a las de la misma fecha y el resto se conserva.
 */
export async function guardarPlan(plan: Plan): Promise<Plan> {
  const actual = (await getDaily<VidaMes>('vida', diaDelMes(plan.mes))) ?? {}
  const unido = unirPlan(actual.plan, plan)
  await saveDaily('vida', diaDelMes(plan.mes), { ...actual, plan: unido })
  return unido
}
