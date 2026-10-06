import { supabase } from '../lib/supabase'
import { APP_VERSION, SCHEMA_VERSION } from '../lib/version'
import type { Backup, Definition, Entry, Json, Profile } from './types'

/**
 * Única puerta de entrada a los datos. Los módulos no llaman a Supabase directamente.
 * En modo demostración (VITE_DEMO) los datos viven solo en este navegador.
 */

export const DEMO = !!import.meta.env.VITE_DEMO
type Obj = { [k: string]: Json }

function db() {
  if (!supabase) throw new Error('La app no está conectada a la base de datos.')
  return supabase
}
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---------- Modo demostración: memoria + almacenamiento del navegador ----------
interface DemoState { settings: Obj; daily: { [key: string]: Obj }; entries?: Entry[] }
// La clave cambia con cada demostración para no arrastrar datos de una anterior.
const DEMO_KEY = 'new-version-demo-0.6.0-a'
let demoState: DemoState | null = null
function demo(): DemoState {
  if (demoState) return demoState
  let saved: DemoState | null = null
  try { saved = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null') } catch { /* sin almacenamiento */ }
  let seed: Obj = {}
  try { seed = JSON.parse((import.meta.env.VITE_DEMO_SETTINGS as string | undefined) || '{}') } catch { /* sin ajustes de demo */ }
  let dias: { [key: string]: Obj } = {}
  try { dias = JSON.parse((import.meta.env.VITE_DEMO_DAILY as string | undefined) || '{}') } catch { /* sin días de demo */ }
  demoState = saved ?? { settings: seed, daily: dias }
  return demoState
}
function demoSave() {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(demoState)) } catch { /* sin almacenamiento */ }
}

// ---------- Definiciones ----------
export async function listDefinitions(module: string): Promise<Definition[]> {
  if (DEMO) return []
  return check(await db().from('definitions').select('*').eq('module', module).is('deleted_at', null).order('sort'))
}
export async function saveDefinition(d: Partial<Definition> & Pick<Definition, 'module' | 'label'>): Promise<Definition> {
  return check(await db().from('definitions').upsert(d).select().single())
}
export async function removeDefinition(id: string): Promise<void> {
  check(await db().from('definitions').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id'))
}

// ---------- Documento diario de un módulo (uno por día) ----------
export interface Daily<T extends Obj = Obj> { day: string; value: T }

export async function getDaily<T extends Obj>(module: string, day: string): Promise<T | null> {
  if (DEMO) return (demo().daily[module + '|' + day] as T | undefined) ?? null
  const row = check(
    await db().from('entries').select('value').eq('module', module).eq('day', day).eq('kind', 'dia').is('deleted_at', null).maybeSingle(),
  ) as { value: T } | null
  return row?.value ?? null
}
export async function saveDaily<T extends Obj>(module: string, day: string, value: T): Promise<void> {
  if (DEMO) { demo().daily[module + '|' + day] = value; demoSave(); return }
  const upd = check(
    await db().from('entries').update({ value }).eq('module', module).eq('day', day).eq('kind', 'dia').is('deleted_at', null).select('id'),
  ) as { id: string }[]
  if (upd.length) return
  const ins = await db().from('entries').insert({ module, day, kind: 'dia', value }).select('id')
  if (ins.error) {
    // Otro dispositivo creó el día a la vez: se actualiza el que ya existe.
    if ((ins.error as { code?: string }).code !== '23505') throw new Error(ins.error.message)
    check(await db().from('entries').update({ value }).eq('module', module).eq('day', day).eq('kind', 'dia').is('deleted_at', null).select('id'))
  }
}
export async function listDaily<T extends Obj>(module: string, fromDay: string, toDay: string): Promise<Daily<T>[]> {
  if (DEMO) {
    return Object.entries(demo().daily)
      .filter(([k]) => k.startsWith(module + '|'))
      .map(([k, v]) => ({ day: k.split('|')[1], value: v as T }))
      .filter((r) => r.day >= fromDay && r.day <= toDay)
      .sort((a, b) => a.day.localeCompare(b.day))
  }
  return check(
    await db().from('entries').select('day,value').eq('module', module).eq('kind', 'dia').gte('day', fromDay).lte('day', toDay)
      .is('deleted_at', null).order('day'),
  ) as Daily<T>[]
}

// ---------- Registros sueltos ----------
export async function listEntries(module: string, fromDay: string, toDay: string): Promise<Entry[]> {
  if (DEMO) {
    return (demo().entries ?? []).filter((e) => e.module === module && !e.deleted_at && e.day >= fromDay && e.day <= toDay)
      .sort((a, b) => a.day.localeCompare(b.day))
  }
  return check(
    await db().from('entries').select('*').eq('module', module).eq('kind', 'registro').gte('day', fromDay).lte('day', toDay)
      .is('deleted_at', null).order('day'),
  )
}
/** Todos los registros sueltos de un módulo, sin límite de fechas (listas cortas: pendientes, preguntas…). */
export function listAllEntries(module: string): Promise<Entry[]> {
  return listEntries(module, '0001-01-01', '9999-12-31')
}
export async function saveEntry(e: Partial<Entry> & Pick<Entry, 'module' | 'day'>): Promise<Entry> {
  if (DEMO) {
    const st = demo()
    const now = new Date().toISOString()
    const prev = (st.entries ?? []).find((x) => x.id === e.id)
    const row = {
      id: e.id ?? 'demo-' + now + '-' + Math.random().toString(36).slice(2, 8), user_id: 'demo', definition_id: null, kind: 'registro',
      at: null, value: {}, note: null, created_at: now, deleted_at: null, ...prev, ...e, updated_at: now,
    } as Entry
    st.entries = [...(st.entries ?? []).filter((x) => x.id !== row.id), row]
    demoSave()
    return row
  }
  return check(await db().from('entries').upsert({ kind: 'registro', ...e }).select().single())
}
export async function removeEntry(id: string): Promise<void> {
  if (DEMO) { const st = demo(); st.entries = (st.entries ?? []).filter((x) => x.id !== id); demoSave(); return }
  check(await db().from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id'))
}

// ---------- Ajustes ----------
export async function getSettings(): Promise<Obj> {
  if (DEMO) return demo().settings
  const row = check(await db().from('settings').select('data').maybeSingle()) as { data: Obj } | null
  return row?.data ?? {}
}
export async function saveSettings(data: Obj): Promise<void> {
  if (DEMO) { demo().settings = data; demoSave(); return }
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
  const base = { app: 'new-version' as const, app_version: APP_VERSION, schema_version: SCHEMA_VERSION, exported_at: new Date().toISOString() }
  if (DEMO) return { ...base, profile: null, settings: demo().settings, definitions: [], entries: [] }
  const profile = check(await db().from('profiles').select('id,display_name,timezone').maybeSingle()) as Profile | null
  return { ...base, profile, settings: await getSettings(), definitions: await all<Definition>('definitions'), entries: await all<Entry>('entries') }
}
export async function counts(): Promise<{ definitions: number; entries: number }> {
  if (DEMO) return { definitions: 0, entries: Object.keys(demo().daily).length + (demo().entries ?? []).length }
  const d = await db().from('definitions').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  const e = await db().from('entries').select('id', { count: 'exact', head: true }).is('deleted_at', null)
  if (d.error) throw new Error(d.error.message)
  if (e.error) throw new Error(e.error.message)
  return { definitions: d.count ?? 0, entries: e.count ?? 0 }
}
