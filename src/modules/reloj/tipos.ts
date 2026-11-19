/**
 * Documento diario `reloj` (entries, kind = 'dia'): lo escribe solo la función de Supabase `reloj`
 * con lo que manda Health Auto Export desde Apple Salud (tensión, pulso, variabilidad y saturación del reloj).
 * Las horas son las del iPhone (HH:MM). Las demás áreas solo leen de aquí.
 */
export type TaReloj = { hora: string; pas: number; pad: number; /** Pulso del reloj en el minuto de la toma, si lo hay. */ fc?: number }

export type RelojDia = {
  /** Tomas de tensión del reloj. */
  ta?: TaReloj[]
  /** Pulso: [hora, media, máximo], uno por minuto o por el intervalo que mande Health Auto Export. */
  fc_puntos?: [string, number, number][]
  /** Pulso del día, una media cada 30 minutos desde las 00:00 (48 valores). */
  fc_dia?: (number | null)[]
  fc?: { min?: number; media?: number; max?: number; reposo?: number }
  /** Ratos con el pulso a 100 lpm o más: hora de inicio, máximo y minutos. */
  fc_altas?: { hora: string; fc: number; min: number }[]
  /** Variabilidad de la frecuencia cardíaca: [hora, ms]. */
  vfc?: [string, number][]
  /** Saturación de oxígeno: [hora, %]. */
  spo2?: [string, number][]
  /** Apps de las que llegaron los datos (p. ej. Health Sync, HUAWEI Health). */
  fuentes?: string[]
  actualizado?: string
}
