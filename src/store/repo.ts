import { supabase } from '../lib/supabase'
import { APP_VERSION, SCHEMA_VERSION } from '../lib/version'
import type { Backup, Definition, Entry, Json, Profile } from './types'

/** Única puerta de entrada a los datos. Los módulos no llaman a Supabase directamente. */

function db() {
  if (!supabase) throw new Error('La app no está conectada a la base de datos.')
  return supabase
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---------- Definiciones ----------
export async function listDefinitions(module: string): Promise<Definition[]> {
  return check(await db().from('definitions').select('*').eq('module', module).is('deleted_at', null).order('sort'))
}
export async function saveDefinition(d: Partial<Definition> & Pick<Definition, 'module' | 'label'>): Promise<Definition> {
  return check(await db().from('definitions').upsert(d).select().single())
}
export async function removeDefinition(id: string): Promise<void> {
  check(await db().from('definitions').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id'))
}

// ---------- Registros ----------
export async function listEntries(module: string, fromDay: string, toDay: string): Promise<Entry[]> {
  return check(
    await db().from('entries').select('*').eq('module', module).gte('day', fromDay).lte('day', toDay)
      .is('deleted_at', null).order('day'),
  )
}
export async function saveEntry(e: Partial<Entry> & Pick<Entry, 'module' | 'day'>): Promise<Entry> {
  return check(await db().from('entries').upsert(e).select().single())
}
export async function removeEntry(id: string): Promise<void> {
  check(await db().from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id'))
}

// ---------- Ajustes ----------
export async function getSettings(): Promise<{ [k: string]: Json }> {
  const row = check(await db().from('settings').select('data').maybeSingle()) as { data: { [k: string]: Json } } | null
  return row?.data ?? {}
}
export async function saveSettings(data: { [k: string]: Json }): Promise<void> {
  check(await db().from('settings').upsert({ data }).select('user_id'))
}

// ---------- Copia de seguridad ----------
async function all<T>(table: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const page = check(await db().from(table).select('*').order('created_at').range(from, from + 999)) as T[]
    out.push(...page)
    if (page.length < 1000) return out
  }
}
export async function exportAll(): Promise<Backup> {
  const profile = check(await db().from('profiles').select('id,display_name,timezone').maybeSingle()) as Profile | null
  return {
    app: 'new-version',
    app_version: APP_VERSION,
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    profile,
    settings: await getSettings(),
    definitions: await all<Definition>('definitions'),
    entries: await all<Entry>('entries'),
  }
}
export async function counts(): Promise<{ definitions: number; entries: number }> {
  const d = await db().from('definitions').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  const e = await db().from('entries').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  if (d.error) throw new Error(d.error.message)
  if (e.error) throw new Error(e.error.message)
  return { definitions: d.count ?? 0, entries: e.count ?? 0 }
}
