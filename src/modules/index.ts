import type { ComponentType } from 'react'

/**
 * Registro de módulos. Cada módulo (registro diario, ciclo, suplementos, desvíos, prevención…)
 * vive en su propia carpeta dentro de src/modules y se da de alta aquí con una línea.
 * La navegación y las rutas se generan a partir de esta lista.
 */
export interface ModuleDef {
  /** Identificador; coincide con el valor de `module` en la base de datos. */
  id: string
  /** Nombre visible en la navegación. */
  name: string
  /** Ruta dentro de la app, sin barra inicial. */
  path: string
  Page: ComponentType
}

export const modules: ModuleDef[] = []
