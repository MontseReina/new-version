import { useEffect, useState } from 'react'
import { addDays, diffDays, todayStr } from '../../lib/dates'
import { DEMO, listDaily } from '../../store/repo'
import { FASES, infoDia } from '../ciclo/logica'
import { useCiclo } from '../ciclo/useCiclo'
import { aplicarInforme, leerInforme, resumenInforme, textoInforme, type IntroCfg, type IntroDia } from './logica'

/**
 * Informe mensual: prepara el texto del periodo (diario, agradecimientos y ejercicios) para
 * analizarlo fuera de la app, y carga lo que devuelve el informe (patrones y ejercicios).
 */
export function Informe({ cfg, saveCfg, hasta: diaVisto }: { cfg: IntroCfg | null; saveCfg: (p: Partial<IntroCfg>) => Promise<void>; hasta: string }) {
  const hoy = todayStr()
  const [hasta, setHasta] = useState(diaVisto > hoy ? hoy : diaVisto)
  const [desde, setDesde] = useState(addDays(hasta, -29))
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const { modelo, mapa } = useCiclo()
  useEffect(() => { setTexto(''); setMsg('') }, [desde, hasta])

  const preparar = async () => {
    if (!desde || !hasta || desde > hasta) { setMsg('Revisa las fechas: «desde» tiene que ser anterior a «hasta».'); return }
    setBusy(true); setMsg('')
    try {
      const filas = await listDaily<IntroDia>('introspeccion', desde, hasta)
      const dias = filas.filter((r) => r.value.diario?.trim() || (r.value.gracias ?? []).some((g) => g.texto?.trim()) || Object.keys(r.value.hechos ?? {}).length)
      if (!dias.length) { setMsg('No hay nada anotado entre esas fechas.'); setBusy(false); return }
      const ciclo = (day: string) => { const i = infoDia(modelo, mapa, day); return i ? `día ${i.dia} del ciclo, ${FASES[i.fase].toLowerCase()}` : null }
      setTexto(textoInforme(desde, hasta, dias, cfg, ciclo, diffDays(hasta, desde) + 1))
    } catch {
      setMsg('No se ha podido leer el periodo. Revisa la conexión y vuelve a pulsar.')
    }
    setBusy(false)
  }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setMsg('Texto copiado.') } catch {
      (document.getElementById('intro-informe-texto') as HTMLTextAreaElement | null)?.select()
      setMsg('Texto seleccionado: cópialo con el menú de tu dispositivo.')
    }
  }
  const descargar = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/markdown' }))
    a.download = `introspeccion-${desde}-a-${hasta}.md`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Fichero descargado.')
  }

  const [pegado, setPegado] = useState('')
  const [aviso, setAviso] = useState('')
  const cargar = async () => {
    const nuevo = leerInforme(pegado)
    if (!nuevo) { setAviso('El texto no es un informe válido. No se ha cambiado nada.'); return }
    try {
      await saveCfg(aplicarInforme(cfg, nuevo))
      setAviso('Cargado: ' + resumenInforme(nuevo) + '.')
      setPegado('')
    } catch { setAviso('No se ha podido guardar. Revisa la conexión y vuelve a pulsar.') }
  }

  return (
    <div>
      <h3>1. Sacar el texto del periodo</h3>
      <p className="muted small">Junta tu diario, tus agradecimientos y tus ejercicios de esas fechas en un solo texto, para adjuntarlo en la conversación del informe.</p>
      <div className="grid2">
        <label className="field"><span>Desde</span><input id="intro-desde" type="date" max={hasta} value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="field"><span>Hasta</span><input id="intro-hasta" type="date" max={hoy} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
      </div>
      <button type="button" className="btn secondary" disabled={busy} onClick={() => void preparar()}>{busy ? 'Preparando…' : 'Preparar el texto'}</button>
      {texto && (
        <>
          <textarea id="intro-informe-texto" className="intro-salida" aria-label="Texto del periodo" readOnly value={texto} />
          <div className="row">
            <button type="button" className="btn" onClick={() => void copiar()}>Copiar</button>
            {!DEMO && <button type="button" className="btn secondary" onClick={descargar}>Descargar fichero</button>}
            <button type="button" className="btn ghost" onClick={() => { setTexto(''); setMsg('') }}>Deshacer</button>
          </div>
        </>
      )}
      {msg && <p role="status" className="small">{msg}</p>}

      <h3>2. Cargar lo que devuelve el informe</h3>
      <p className="muted small">Lo normal es tocar el enlace que viene al final del informe. Si el enlace no funciona, pega aquí el texto que lo acompaña. Lo que se repite se sustituye por lo del informe; los ejercicios nuevos se suman a los que ya tienes.</p>
      <textarea aria-label="Texto del informe" placeholder="Pega aquí el texto del informe" value={pegado} onChange={(e) => { setPegado(e.target.value); setAviso('') }} />
      <button type="button" className="btn secondary" disabled={!cfg || !pegado.trim()} onClick={() => void cargar()}>Cargar</button>
      {aviso && <p role="status" className="small">{aviso}</p>}
    </div>
  )
}
