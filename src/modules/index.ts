import type { ComponentType } from 'react'
import Hidratacion from './hidratacion/Hidratacion'
import { ResumenHidratacion } from './hidratacion/Resumen'

/**
 * Registro de módulos. Cada módulo vive en su carpeta dentro de src/modules y se da de alta aquí.
 * La navegación, las rutas y los «Objetivos de hoy» de Inicio se generan a partir de esta lista.
 * Un módulo sin `Page` aparece en la navegación como «en preparación».
 */
export interface ModuleDef {
  /** Identificador; coincide con el valor de `module` en la base de datos. */
  id: string
  name: string
  ico: string
  /** Ruta dentro de la app, sin barra inicial. Admite /:date. */
  path: string
  Page?: ComponentType
  /** Estado del objetivo de hoy, para Inicio. */
  Resumen?: ComponentType<{ day: string }>
}

export const modules: ModuleDef[] = [
  { id: 'sintomas', name: 'Signos y síntomas', ico: '📝', path: 'sintomas' },
  { id: 'alimentacion', name: 'Alimentación', ico: '🥣', path: 'alimentacion' },
  { id: 'hidratacion', name: 'Hidratación', ico: '💧', path: 'hidratacion', Page: Hidratacion, Resumen: ResumenHidratacion },
  { id: 'ejercicio', name: 'Ejercicio', ico: '🏃', path: 'ejercicio' },
  { id: 'biohacking', name: 'Biohacking', ico: '🌙', path: 'biohacking' },
]
