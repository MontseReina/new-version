import { useEffect, useState } from 'react'
import { DEMO, invocar } from '../../store/repo'

/** Conexión con el anillo Oura. Todo pasa por la función de servidor `oura`. */
export interface EstadoOura {
  /** null = aún no se sabe. */
  conectado: boolean | null
  configurado: boolean
  ultima: string | null
  /** Primer día con datos de Oura y si ya se ha traído todo el histórico. */
  desde: string | null
  historicoCompleto: boolean
  historicoHasta: string | null
  /** Datos que Oura no deja leer con el permiso dado. */
  sinPermiso: string[]
  sincronizando: boolean
  error: string | null
  /** Sube cada vez que llegan datos nuevos: la pantalla vuelve a leer. */
  vuelta: number
}
interface Respuesta {
  configurado?: boolean; conectado?: boolean; ultima?: string | null; motivo?: string; url?: string
  desde?: string | null; historico_completo?: boolean; historico_hasta?: string | null; sin_permiso?: string[]
}

let estado: EstadoOura = {
  conectado: DEMO ? true : null, configurado: !DEMO, ultima: null, desde: null, historicoCompleto: true, historicoHasta: null,
  sinPermiso: [], sincronizando: false, error: null, vuelta: 0,
}
const subs = new Set<() => void>()
const poner = (p: Partial<EstadoOura>) => { estado = { ...estado, ...p }; subs.forEach((f) => f()) }
const deRespuesta = (r: Respuesta): Partial<EstadoOura> => ({
  ultima: r.ultima ?? null, desde: r.desde ?? null, historicoCompleto: r.historico_completo ?? true,
  historicoHasta: r.historico_hasta ?? null, sinPermiso: r.sin_permiso ?? [],
})

let enCurso: Promise<void> | null = null
/** Trae los últimos días y, mientras falte, el histórico tramo a tramo (30 días por llamada). */
export function sincronizar(): Promise<void> {
  if (DEMO || !estado.conectado) return Promise.resolve()
  if (enCurso) return enCurso
  poner({ sincronizando: true, error: null })
  enCurso = (async () => {
    try {
      for (let i = 0; i < 120; i++) {
        const r = await invocar<Respuesta>('oura', { accion: 'sincronizar' })
        if (!r.conectado) {
          poner({ conectado: false, error: r.motivo === 'caducado' ? 'El permiso de Oura ha caducado o se ha retirado. Vuelve a conectar.' : null })
          return
        }
        poner({ ...deRespuesta(r), vuelta: estado.vuelta + 1 })
        if (r.historico_completo) break
      }
    } catch (e) {
      poner({ error: (e as Error).message })
    } finally {
      enCurso = null
      poner({ sincronizando: false })
    }
  })()
  return enCurso
}

let consultado = false
async function consultar() {
  if (DEMO || consultado) return
  consultado = true
  try {
    const r = await invocar<Respuesta>('oura', { accion: 'estado' })
    poner({ conectado: !!r.conectado, configurado: !!r.configurado, ...deRespuesta(r) })
    // Al abrir la app se sincroniza si hace más de 15 minutos de la última vez.
    const reciente = r.ultima && Date.now() - new Date(r.ultima).getTime() < 15 * 60 * 1000
    if (r.conectado && (!reciente || !r.historico_completo)) void sincronizar()
  } catch (e) {
    consultado = false
    poner({ conectado: false, configurado: false, error: (e as Error).message })
  }
}

/** Lleva a la pantalla de Oura para dar el permiso. */
export async function conectar(): Promise<void> {
  poner({ error: null })
  try {
    const r = await invocar<Respuesta>('oura', { accion: 'url' })
    if (r.url) window.location.href = r.url
  } catch (e) { poner({ error: (e as Error).message }) }
}
export async function desconectar(): Promise<void> {
  try {
    await invocar<Respuesta>('oura', { accion: 'desconectar' })
    poner({ conectado: false, error: null })
  } catch (e) { poner({ error: (e as Error).message }) }
}

export function useOura(): EstadoOura {
  const [, pintar] = useState(0)
  useEffect(() => {
    const f = () => pintar((n) => n + 1)
    subs.add(f)
    void consultar()
    return () => { subs.delete(f) }
  }, [])
  return estado
}
