import { useEffect, useState } from 'react'
import { counts, exportAll } from '../store/repo'

export function Datos() {
  const [n, setN] = useState<{ definitions: number; entries: number } | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { counts().then(setN, () => setN(null)) }, [])

  async function download() {
    setBusy(true); setMsg('')
    try {
      const backup = await exportAll()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `new-version-copia-${backup.exported_at.slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setMsg('Copia descargada.')
    } catch {
      setMsg('No se pudo crear la copia. Vuelve a intentarlo con conexión.')
    }
    setBusy(false)
  }

  return (
    <div className="stack">
      <h1>Mis datos</h1>
      <p className="muted">Tus datos están en tu base de datos en la nube (Irlanda) y solo tu cuenta puede leerlos.</p>
      <dl className="facts">
        <div><dt>Elementos definidos</dt><dd>{n ? n.definitions : '—'}</dd></div>
        <div><dt>Registros</dt><dd>{n ? n.entries : '—'}</dd></div>
      </dl>
      <button className="btn" onClick={download} disabled={busy}>{busy ? 'Preparando…' : 'Descargar copia completa'}</button>
      {msg && <p role="status">{msg}</p>}
    </div>
  )
}
