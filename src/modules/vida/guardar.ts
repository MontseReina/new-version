import { getDaily, saveDaily } from '../../store/repo'
import { diaDelMes, type Plan, type VidaMes } from './logica'

/** Guarda el plan en el documento de su mes, sin tocar lo ya marcado ni los logros. */
export async function guardarPlan(plan: Plan): Promise<void> {
  const actual = (await getDaily<VidaMes>('vida', diaDelMes(plan.mes))) ?? {}
  await saveDaily('vida', diaDelMes(plan.mes), { ...actual, plan })
}
