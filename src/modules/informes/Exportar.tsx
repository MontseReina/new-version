import { useEffect, useState } from 'react'
import { addDays, todayStr } from '../../lib/dates'
import { DEMO } from '../../store/repo'
import { leerPeriodo } from './datos'
import { textoExportacion } from './texto'
import { useContexto } from './useContexto'

/** Mis registros de un periodo en un texto para pegar o adjuntar en una conversación con Claude. */
export default function Exportar({ volver }: { volver: () => void }) {
  const hoy = todayStr()
  const [hasta, setHasta] = useState(hoy)
  const [desde, setDesde] = useState(addDays(hoy, -29))
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const { c, listo } = useContexto()
  useEffect(() => { setTexto(''); setMsg('') }, [desde, hasta])

  const preparar = async () => {
    if (!desde || !hasta || desde > hasta) { setMsg('Revisa las fechas: «desde» tiene que ser anterior a «hasta».'); return }
    setBusy(true); setMsg('')
    try { setTexto(textoExportacion(await leerPeriodo(desde, hasta), c)) } catch {
      setMsg('No se ha podido leer el periodo. Revisa la conexión y vuelve a pulsar.')
    }
    setBusy(false)
  }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setMsg('Texto copiado.') } catch {
      (document.getElementById('inf-exportar-texto') as HTMLTextAreaElement | null)?.select()
      setMsg('Texto seleccionado: cópialo con el menú de tu dispositivo.')
    }
  }
  const descargar = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/markdown' }))
    a.download = `new-version-${desde}-a-${hasta}.md`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Fichero descargado.')
  }

  return (
    <div>
      <div className="row between">
        <h1>Mis datos para Claude</h1>
        <button className="btn sm ghost" onClick={volver}>Volver</button>
      </div>
      <div className="card">
        <p className="small">Junta en un texto todo lo que has anotado en esas fechas: ciclo, episodios, síntomas, comidas con sus horas y kilocalorías, hidratación, suplementos, terapia endovenosa y peso. Primero va un resumen y después cada día.</p>
        <p className="muted small">Úsalo en las conversaciones del plan, de la revisión de suplementos o para preparar una visita. Tu diario de introspección no va aquí: tiene su propio informe.</p>
        <div className="grid2">
          <label className="field"><span>Desde</span><input type="date" max={hasta} value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label className="field"><span>Hasta</span><input type="date" max={hoy} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        </div>
        <button type="button" className="btn secondary" disabled={busy || !listo} onClick={() => void preparar()}>{busy ? 'Preparando…' : !listo ? 'Cargando…' : 'Preparar el texto'}</button>
        {texto && (
          <>
            <textarea id="inf-exportar-texto" className="intro-salida" aria-label="Texto del periodo" readOnly value={texto} />
            <p className="muted small">{texto.split(/\s+/).length.toLocaleString('es-ES')} palabras.</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => void copiar()}>Copiar</button>
              {!DEMO && <button type="button" className="btn secondary" onClick={descargar}>Descargar fichero</button>}
              <button type="button" className="btn ghost" onClick={() => { setTexto(''); setMsg('') }}>Deshacer</button>
            </div>
          </>
        )}
        {msg && <p className="small" role="status">{msg}</p>}
      </div>
    </div>
  )
}
