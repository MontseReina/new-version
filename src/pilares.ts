/**
 * Pilares: apartados que no se rellenan a diario. Aparecen al pie de Inicio y en la pestaña «Pilares».
 * Un pilar sin `Page` se muestra como «en preparación».
 */
import type { ComponentType } from 'react'
import Calendario from './modules/calendario/Calendario'
import Evaluaciones from './modules/evaluaciones/Evaluaciones'
import Pendientes from './modules/pendientes/Pendientes'
import Preguntas from './modules/preguntas/Preguntas'

export interface PilarDef {
  id: string
  name: string
  ico: string
  /** Ruta dentro de la app, sin barra inicial. */
  path: string
  Page?: ComponentType
  /** La pantalla es la de un módulo de src/modules: aquí solo se enlaza (no crea ruta propia ni sale «en preparación»). */
  enModulos?: boolean
}

export const pilares: PilarDef[] = [
  { id: 'diagnosticos', name: 'Diagnósticos', ico: '🩺', path: 'diagnosticos' },
  { id: 'analiticas', name: 'Analíticas', ico: '🧪', path: 'analiticas' },
  { id: 'microbiota', name: 'Microbiota', ico: '🦠', path: 'microbiota' },
  // Biohacking y Trabajo introspectivo son módulos diarios (src/modules) que se abren desde aquí; sus rutas las crea la lista de módulos.
  { id: 'biohacking', name: 'Biohacking', ico: '🌙', path: 'biohacking', enModulos: true },
  { id: 'introspeccion', name: 'Trabajo introspectivo', ico: '💛', path: 'introspeccion', enModulos: true },
  { id: 'calendario', name: 'Calendario', ico: '📅', path: 'calendario', Page: Calendario },
  { id: 'pendientes', name: 'Pendientes', ico: '☑️', path: 'pendientes', Page: Pendientes },
  { id: 'preguntas', name: 'Preguntas', ico: '💬', path: 'preguntas', Page: Preguntas },
  { id: 'evaluaciones', name: 'Evaluaciones', ico: '📊', path: 'evaluaciones', Page: Evaluaciones },
]
