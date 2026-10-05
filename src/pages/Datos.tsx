import { useEffect, useState } from 'react'
import { importar, leerRegistros } from '../store/importar'
import { counts, exportAll } from '../store/repo'

export function Datos() {
  const [n, setN] = useState<{ definitions: number; entries: number } | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [pegado, setPegado] = useState('')
  const [aviso, setAviso] = useState('')

  async function cargar() {
    const registros = leerRegistros(pegado)
    if (!registros) { setAviso('El texto no es una importación válida. No se ha cambiado nada.'); return }
    setBusy(true)
    try {
      const n = await importar(registros, (k) => setAviso(`Importando… ${k} de ${registros.length}`))
      setAviso(`Importación terminada: ${n} registros añadidos.`)
      setPegado('')
      counts().then(setN, () => {})
    } catch {
      setAviso('La importación se ha interrumpido. Revisa la conexión y vuelve a pulsar: no se duplica nada.')
    }
    setBusy(false)
  }
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

      <h2>Importar registros</h2>
      <p className="muted">Para cargar de golpe registros de días pasados. Se suman a lo que ya haya en cada día, sin borrar nada.</p>
      <textarea aria-label="Texto de importación" placeholder="Pega aquí el texto de importación" value={pegado} onChange={(e) => { setPegado(e.target.value); setAviso('') }} />
      <button className="btn secondary" onClick={() => void cargar()} disabled={busy || !pegado.trim()}>Importar</button>
      {aviso && <p role="status">{aviso}</p>}
    </div>
  )
}
