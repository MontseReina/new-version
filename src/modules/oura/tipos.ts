/**
 * Documento diario `oura` (entries, kind = 'dia'): lo escribe la función de Supabase `oura` al sincronizar.
 * Un documento por día; la noche pertenece al día en que se despierta (campo `day` de Oura).
 * Las demás áreas (Inicio, Ciclo hormonal, Disautonomía, Nutrición…) leen de aquí: un dato, un sitio.
 */

/** Fases de la noche cada 5 minutos, como las da Oura (sleep_phase_5_min): 1 profundo, 2 ligero, 3 REM, 4 despierta. */
export type FasesNoche = string

export type OuraNoche = {
  /** Hora de acostarse y de despertarse (HH:MM). */
  dormir?: string
  despertar?: string
  total_min?: number
  profundo_min?: number
  rem_min?: number
  ligero_min?: number
  despierta_min?: number
  /** Porcentaje del tiempo en la cama que estuvo dormida. */
  eficiencia?: number
  /** Minutos hasta dormirse. */
  latencia_min?: number
  fc_min?: number
  fc_media?: number
  /** Variabilidad de la frecuencia cardíaca, media de la noche (ms). */
  vfc_media?: number
  /** Respiraciones por minuto, media de la noche. */
  resp?: number
  fases?: FasesNoche
  /** Curvas de la noche cada 5 minutos, desde `dormir`. */
  fc5?: (number | null)[]
  vfc5?: (number | null)[]
}

export type OuraDia = {
  noche?: OuraNoche
  sueno?: { puntuacion?: number; factores?: Partial<Record<FactorSueno, number>> }
  disposicion?: {
    puntuacion?: number
    /** Desviación de la temperatura de la piel frente a su media (°C) y tendencia de varios días. */
    temp_desv?: number
    temp_tend?: number
    factores?: Partial<Record<FactorDisposicion, number>>
  }
  actividad?: {
    puntuacion?: number
    pasos?: number
    kcal_activas?: number
    kcal_totales?: number
    sentada_min?: number
    alta_min?: number
    media_min?: number
    baja_min?: number
    /** Movimiento del día cada 5 minutos desde las 00:00 (class_5_min de Oura). */
    clase5?: string
  }
  estres?: { alto_min?: number; recuperacion_min?: number; resumen?: 'restored' | 'normal' | 'stressful' | null }
  resiliencia?: { nivel?: NivelResiliencia; factores?: { sueno?: number; dia?: number; estres?: number } }
  spo2?: { media?: number; alteraciones?: number }
  cardio?: { edad_vascular?: number; vo2?: number }
  /** Frecuencia cardíaca del día, una media cada 30 minutos desde las 00:00 (48 valores). */
  fc_dia?: (number | null)[]
  /**
   * Ratos con la frecuencia a 100 lpm o más (lecturas de Oura de todo el día y la noche). Lecturas seguidas,
   * con menos de 10 minutos entre una y otra, cuentan como un solo rato: hora de inicio, pulso máximo y minutos.
   */
  fc_altas?: FcAlta[]
  /** Horario de acostarse que recomienda Oura (HH:MM). */
  recomendada?: { desde?: string; hasta?: string }
  entrenos?: { actividad: string; inicio: string; min: number; kcal?: number; intensidad?: 'easy' | 'moderate' | 'hard' }[]
  sesiones?: { tipo: 'breathing' | 'meditation' | 'nap' | 'relaxation' | 'rest' | 'body_status'; inicio: string; min: number }[]
  etiquetas?: { texto: string; hora?: string }[]
  /** Modo descanso activo ese día (lo activa ella o Oura cuando detecta que está enferma). */
  modo_descanso?: boolean
}

export type FcAlta = {
  /** Hora de la primera y de la última lectura del rato (HH:MM). */
  hora: string
  fin?: string
  /** Pulso más alto y más bajo del rato (todas las lecturas del rato están a 100 o más). */
  fc: number
  fc_min?: number
  min: number
  /** Qué hacía según el anillo: dormida, en reposo, moviéndose o en un entrenamiento. */
  contexto?: 'sueno' | 'reposo' | 'movimiento' | 'entreno'
}
/** «11:45–12:20» o, si solo hubo una lectura, «11:33». */
export const horasRato = (a: FcAlta) => (a.fin && a.fin !== a.hora ? `${a.hora}–${a.fin}` : a.hora)
/** «104–126» o, si todas las lecturas dieron lo mismo, «106». */
export const fcRato = (a: FcAlta) => (a.fc_min != null && a.fc_min < a.fc ? `${a.fc_min}–${a.fc}` : String(a.fc))
export const CONTEXTO_FC: Record<string, string> = { sueno: 'dormida', reposo: 'en reposo', movimiento: 'moviéndote', entreno: 'entrenamiento' }

export type FactorSueno = 'total' | 'eficiencia' | 'descanso' | 'rem' | 'profundo' | 'latencia' | 'regularidad'
export type FactorDisposicion =
  | 'vfc' | 'fc_reposo' | 'temperatura' | 'recuperacion' | 'noche_anterior' | 'equilibrio_sueno' | 'actividad_anterior' | 'equilibrio_actividad'
export type NivelResiliencia = 'limited' | 'adequate' | 'solid' | 'strong' | 'exceptional'

export const FACTORES_SUENO: [FactorSueno, string][] = [
  ['total', 'Sueño total'], ['eficiencia', 'Eficiencia'], ['descanso', 'Descanso (sin inquietud)'], ['rem', 'Sueño REM'],
  ['profundo', 'Sueño profundo'], ['latencia', 'Tiempo en dormirte'], ['regularidad', 'Regularidad del horario'],
]
export const FACTORES_DISPOSICION: [FactorDisposicion, string][] = [
  ['vfc', 'Equilibrio de la variabilidad'], ['fc_reposo', 'Frecuencia en reposo'], ['temperatura', 'Temperatura corporal'],
  ['recuperacion', 'Índice de recuperación'], ['noche_anterior', 'Noche anterior'], ['equilibrio_sueno', 'Equilibrio del sueño'],
  ['actividad_anterior', 'Actividad del día anterior'], ['equilibrio_actividad', 'Equilibrio de actividad'],
]
export const NIVELES: Record<NivelResiliencia, string> = {
  limited: 'Limitada', adequate: 'Suficiente', solid: 'Sólida', strong: 'Fuerte', exceptional: 'Excepcional',
}
export const RESUMEN_ESTRES: Record<string, string> = { restored: 'Día de recuperación', normal: 'Día normal', stressful: 'Día de estrés' }
export const SESIONES: Record<string, string> = {
  breathing: 'Respiración', meditation: 'Meditación', nap: 'Siesta', relaxation: 'Relajación', rest: 'Descanso', body_status: 'Estado del cuerpo',
}
export const INTENSIDAD: Record<string, string> = { easy: 'suave', moderate: 'moderada', hard: 'intensa' }
