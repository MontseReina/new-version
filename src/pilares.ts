/**
 * Pilares: apartados que no se rellenan a diario. Aparecen al pie de Inicio y en la pestaña «Pilares».
 * Un pilar sin `Page` se muestra como «en preparación».
 */
import type { ComponentType } from 'react'

export interface PilarDef {
  id: string
  name: string
  ico: string
  /** Ruta dentro de la app, sin barra inicial. */
  path: string
  Page?: ComponentType
}

export const pilares: PilarDef[] = [
  { id: 'diagnosticos', name: 'Diagnósticos', ico: '🩺', path: 'diagnosticos' },
  { id: 'analiticas', name: 'Analíticas', ico: '🧪', path: 'analiticas' },
  { id: 'microbiota', name: 'Microbiota', ico: '🦠', path: 'microbiota' },
  { id: 'oura', name: 'Oura Ring', ico: '💍', path: 'oura' },
  { id: 'pendientes', name: 'Pendientes', ico: '☑️', path: 'pendientes' },
  { id: 'preguntas', name: 'Preguntas', ico: '💬', path: 'preguntas' },
  { id: 'evaluaciones', name: 'Evaluaciones', ico: '📊', path: 'evaluaciones' },
]
