import { useEffect, useState } from 'react'
import { DEMO, invocar } from '../../store/repo'
import { escucharCambios, recargarEventos } from './store'

/** Unión con Google Calendar. Todo pasa por la función de servidor `google-calendar`. */
export interface EstadoGoogle {
  /** null = aún no se sabe. */
  conectado: boolean | null
  configurado: boolean
  ultima: string | null
  sincronizando: boolean
  error: string | null
}
interface Respuesta { configurado?: boolean; conectado?: boolean; ultima?: string | null; motivo?: string; url?: string }

let estado: EstadoGoogle = { conectado: DEMO ? false : null, configurado: !DEMO, ultima: null, sincronizando: false, error: null }
const subs = new Set<() => void>()
const poner = (p: Partial<EstadoGoogle>) => { estado = { ...estado, ...p }; subs.forEach((f) => f()) }

let enCurso: Promise<void> | null = null
let otraVez = false
/** Sube y baja cambios. Si ya hay una en marcha, se encadena otra al terminar. */
export function sincronizar(): Promise<void> {
  if (DEMO || !estado.conectado) return Promise.resolve()
  if (enCurso) { otraVez = true; return enCurso }
  poner({ sincronizando: true, error: null })
  enCurso = (async () => {
    try {
      do {
        otraVez = false
        const r = await invocar<Respuesta>('google-calendar', { accion: 'sincronizar' })
        if (!r.conectado) {
          poner({ conectado: false, error: r.motivo === 'caducado' ? 'El permiso de Google ha caducado. Vuelve a conectar.' : null })
          return
        }
        poner({ ultima: r.ultima ?? null })
        await recargarEventos()
      } while (otraVez)
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
    const r = await invocar<Respuesta>('google-calendar', { accion: 'estado' })
    poner({ conectado: !!r.conectado, configurado: !!r.configurado, ultima: r.ultima ?? null })
    if (r.conectado) { escucharCambios(() => { void sincronizar() }); void sincronizar() }
  } catch (e) {
    consultado = false
    poner({ conectado: false, configurado: false, error: (e as Error).message })
  }
}

/** Lleva a la pantalla de Google para dar el permiso. */
export async function conectar(): Promise<void> {
  poner({ error: null })
  try {
    const r = await invocar<Respuesta>('google-calendar', { accion: 'url' })
    if (r.url) window.location.href = r.url
  } catch (e) { poner({ error: (e as Error).message }) }
}
export async function desconectar(): Promise<void> {
  try {
    await invocar<Respuesta>('google-calendar', { accion: 'desconectar' })
    escucharCambios(null)
    poner({ conectado: false, ultima: null, error: null })
  } catch (e) { poner({ error: (e as Error).message }) }
}

export function useGoogle(): EstadoGoogle {
  const [, pintar] = useState(0)
  useEffect(() => {
    const f = () => pintar((n) => n + 1)
    subs.add(f)
    void consultar()
    return () => { subs.delete(f) }
  }, [])
  return estado
}
