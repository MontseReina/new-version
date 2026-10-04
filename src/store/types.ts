/** Tipos del modelo de datos. Reflejan supabase/schema.sql. */

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

/** QUÉ se registra: un suplemento, un hábito, una comida, un marcador… */
export interface Definition {
  id: string
  user_id: string
  module: string
  kind: string
  label: string
  config: { [k: string]: Json }
  sort: number
  active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** CADA anotación, ligada a un día. */
export interface Entry {
  id: string
  user_id: string
  module: string
  definition_id: string | null
  /** 'dia' = el documento diario de un módulo (uno por día); 'registro' = anotación suelta. */
  kind: string
  day: string // AAAA-MM-DD
  at: string | null
  value: { [k: string]: Json }
  note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Profile {
  id: string
  display_name: string | null
  timezone: string
}

export interface Backup {
  app: 'new-version'
  app_version: string
  schema_version: number
  exported_at: string
  profile: Profile | null
  settings: { [k: string]: Json }
  definitions: Definition[]
  entries: Entry[]
}
