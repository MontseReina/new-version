import { useEffect, useState } from 'react'
import { addDays, fmtDate, todayStr } from '../../lib/dates'
import { listDaily } from '../../store/repo'
import { useSettings } from '../../store/useSettings'
import { FASES, infoDia } from '../ciclo/logica'
import { useCiclo } from '../ciclo/useCiclo'
import { objetivo, total, type HidraCfg, type HidraDia } from '../hidratacion/logica'
import { COMIDAS, conOpciones, gruposDe, type Grupo, type SintCfg, type SintDia } from '../sintomas/logica'
import { MOMENTOS, cumplimiento, vigente, type SuplCfg, type SuplDia } from '../suplementos/logica'
import { pendientesDe, type Pregunta } from './store'

type Dias<T> = { day: string; value: T }[]
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const corta = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const dec = (n: number) => n.toFixed(1).replace('.', ',')
const pl = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const MOMENTO: { [k: string]: string } = Object.fromEntries(MOMENTOS)

/** Días en que se marcó cada opción de un grupo, sin contar la opción neutra («sin dolor»…). */
function diasPorOpcion(g: Grupo, dias: Dias<SintDia>): string {
  const ops = (g.opciones ?? []).slice(g.tipo === 'varias' && g.neutra ? 1 : 0)
  return ops
    .map((o) => [o.nombre, dias.filter((d) => d.value.sel?.[g.id]?.includes(o.id)).length] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, n]) => `${nombre}: ${pl(n, 'día', 'días')}`)
    .join(' · ')
}

/** Informe de consulta de una página (imprimible desde el navegador), como el de Huma. */
export default function Informe({ especialistas, preguntas, onClose }: { especialistas: string[]; preguntas: Pregunta[]; onClose: () => void }) {
  const [desde, setDesde] = useState(addDays(todayStr(), -30))
  const [hasta, setHasta] = useState(todayStr())
  const [esp, setEsp] = useState('')
  const [sint, setSint] = useState<Dias<SintDia> | null>(null)
  const [supl, setSupl] = useState<Dias<SuplDia>>([])
  const [hidra, setHidra] = useState<Dias<HidraDia>>([])
  const [error, setError] = useState('')
  const [cfgSint] = useSettings<SintCfg>('sintomas')
  const [cfgSupl] = useSettings<SuplCfg>('suplementos')
  const [cfgHidra] = useSettings<HidraCfg>('hidratacion')
  const { modelo, mapa } = useCiclo()

  useEffect(() => {
    let vivo = true
    Promise.all([listDaily<SintDia>('sintomas', desde, hasta), listDaily<SuplDia>('suplementos', desde, hasta), listDaily<HidraDia>('hidratacion', desde, hasta)]).then(
      ([a, b, c]) => { if (vivo) { setSint(a); setSupl(b); setHidra(c); setError('') } },
      (e: Error) => { if (vivo) setError(e.message) },
    )
    return () => { vivo = false }
  }, [desde, hasta])

  const dias = sint ?? []
  const grupos = gruposDe(cfgSint)

  // Ciclo
  const info = infoDia(modelo, mapa, hasta)
  const reglas = modelo.reglas.filter((r) => r.fin >= desde && r.inicio <= hasta)

  // Signos y síntomas
  const filas: [string, string][] = []
  for (const g of grupos) {
    if (conOpciones(g.tipo)) { const t = diasPorOpcion(g, dias); if (t) filas.push([g.nombre, t]) }
    if (g.tipo === 'hambre') {
      const t = COMIDAS.map(([k, n]) => {
        const xs = dias.map((d) => d.value.hambre?.[k]).filter((x): x is number => x != null)
        return xs.length ? `${n.toLowerCase()} ${dec(media(xs))}` : ''
      }).filter(Boolean).join(' · ')
      const sin = dias.filter((d) => d.value.sin_hambre).length
      if (t || sin) filas.push([g.nombre, [t && `Media de 0 a 10: ${t}`, sin && `come sin hambre: ${pl(sin, 'día', 'días')}`].filter(Boolean).join(' · ')])
    }
    if (g.tipo === 'heces') {
      const deps = dias.flatMap((d) => d.value.heces ?? [])
      const sin = dias.filter((d) => d.value.sin_heces).length
      const porTipo = [1, 2, 3, 4, 5, 6, 7].map((b) => [b, deps.filter((x) => x.bristol === b).length] as const).filter(([, n]) => n > 0)
      const sangre = deps.filter((x) => x.sangre).length
      if (deps.length || sin) {
        filas.push([g.nombre, [
          `${pl(deps.length, 'deposición', 'deposiciones')} en ${pl(dias.filter((d) => d.value.heces?.length).length, 'día', 'días')}`,
          sin && `días sin deposición: ${sin}`,
          porTipo.length && 'Bristol ' + porTipo.map(([b, n]) => `${b}: ${n}`).join(', '),
          sangre && `con sangre: ${sangre}`,
        ].filter(Boolean).join(' · ')])
      }
    }
    if (g.tipo === 'micciones') {
      const xs = dias.map((d) => d.value.micciones).filter((x): x is number => x != null)
      if (xs.length) filas.push([g.nombre, `Media ${dec(media(xs))} al día (${pl(xs.length, 'día', 'días')})`])
    }
  }
  const episodios = grupos.filter((g) => g.tipo === 'detalle').flatMap((g) =>
    dias.flatMap((d) => (d.value.sel?.[g.id] ?? []).map((id) => {
      const det = d.value.det?.[g.id]?.[id] ?? {}
      return { dia: d.day, hora: det.hora ?? '', grupo: g.nombre, nombre: g.opciones?.find((o) => o.id === id)?.nombre ?? id, gravedad: det.gravedad, urgencias: !!det.urgencias }
    })),
  ).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora))
  const notas = grupos.filter((g) => g.tipo === 'texto').flatMap((g) =>
    dias.filter((d) => d.value.texto?.[g.id]?.trim()).map((d) => ({ dia: d.day, texto: d.value.texto![g.id].trim() })),
  )

  // Suplementos
  const productos = (cfgSupl?.lista ?? []).filter((p) => vigente(p, hasta))
  const cumpl = supl.map((d) => cumplimiento(cfgSupl?.lista ?? [], d.value, d.day)).filter((c) => c.marcadas > 0 && c.pautadas > 0)

  // Hidratación
  const litros = hidra.map((d) => total(d.value)).filter((t) => t > 0)
  const obj = objetivo(cfgHidra)

  const pend = pendientesDe(preguntas, esp || undefined)

  return (
    <div>
      <div className="row between no-print">
        <h1>Informe de consulta</h1>
        <div className="row">
          <button className="btn sm secondary" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="btn sm ghost" onClick={onClose}>Volver</button>
        </div>
      </div>
      <div className="row no-print" style={{ marginBottom: '.6rem' }}>
        <input type="date" aria-label="Desde" style={{ width: 'auto' }} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value || desde)} />
        <input type="date" aria-label="Hasta" style={{ width: 'auto' }} value={hasta} min={desde} onChange={(e) => setHasta(e.target.value || hasta)} />
        <select aria-label="Especialista" style={{ width: 'auto' }} value={esp} onChange={(e) => setEsp(e.target.value)}>
          <option value="">Todos los especialistas</option>
          {especialistas.map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>
      {error && <p className="error">No se han podido cargar los registros: {error}</p>}
      <div className="card" id="informe">
        <h2 style={{ marginTop: 0 }}>{esp ? `Consulta de ${esp}` : 'Informe de consulta'} — {fmtDate(desde)} a {fmtDate(hasta)}</h2>
        {!sint && !error && <p className="muted">Cargando…</p>}

        <h3>Ciclo</h3>
        <p className="small">
          {info ? `Día ${info.dia} del ciclo (${FASES[info.fase].toLowerCase()}) a fecha del informe. ` : 'Sin reglas registradas. '}
          {modelo.nMedia > 0 && `Duración media del ciclo: ${modelo.media} días (${pl(modelo.nMedia, 'ciclo', 'ciclos')}). `}
          {reglas.length > 0 && `Reglas en el periodo: ${reglas.map((r) => (r.fin > r.inicio ? `${corta(r.inicio)} a ${corta(r.fin)}` : corta(r.inicio))).join(' · ')}.`}
        </p>

        <h3>Signos y síntomas ({pl(dias.length, 'día registrado', 'días registrados')})</h3>
        <table className="table"><tbody>
          {filas.map(([n, t]) => <tr key={n}><td>{n}</td><td>{t}</td></tr>)}
          {filas.length === 0 && <tr><td>Sin síntomas registrados</td></tr>}
        </tbody></table>
        {episodios.length > 0 && (
          <>
            <h3>Episodios ({episodios.length})</h3>
            <table className="table"><tbody>
              {episodios.map((e, i) => (
                <tr key={i}>
                  <td>{fmtDate(e.dia)}{e.hora && ' · ' + e.hora}</td>
                  <td>{e.nombre}{e.gravedad != null && ` · gravedad ${e.gravedad}/10`}{e.urgencias && ' · ingreso en urgencias'}</td>
                </tr>
              ))}
            </tbody></table>
          </>
        )}
        {notas.length > 0 && (
          <>
            <h3>Otros signos y síntomas</h3>
            <ul className="small">{notas.map((n) => <li key={n.dia}>{fmtDate(n.dia)}: {n.texto}</li>)}</ul>
          </>
        )}

        <h3>Hidratación</h3>
        <p className="small">{litros.length ? `Media ${dec(media(litros) / 1000)} litros al día en ${pl(litros.length, 'día', 'días')}; llega al objetivo (${(obj / 1000).toString().replace('.', ',')} l) en ${litros.filter((t) => t >= obj).length}.` : 'Sin datos'}</p>

        <h3>Suplementos</h3>
        <p className="small">{cumpl.length ? `Cumplimiento medio ${Math.round(media(cumpl.map((c) => c.pct)) * 100)} % de las tomas pautadas en ${pl(cumpl.length, 'día', 'días')}.` : 'Sin tomas marcadas en el periodo.'}</p>
        {productos.length > 0 && (
          <table className="table"><tbody>
            {productos.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td className="small">{[p.dosis, p.cada_dias ? `cada ${p.cada_dias} días` : (p.momentos ?? []).map((m) => MOMENTO[m] ?? m).join(', '), p.via && p.via !== 'Oral' ? p.via : '', p.pautado_por].filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody></table>
        )}

        <h3>Preguntas pendientes{esp ? ` para ${esp}` : ''}</h3>
        {pend.length > 0 && <ol className="small">{pend.map((q) => <li key={q.id}>{q.texto}{!esp && <span className="muted"> ({q.especialista})</span>}</li>)}</ol>}
        {pend.length === 0 && <p className="small muted">Ninguna.</p>}
        <p className="muted small">Registro elaborado por la paciente con la app New Version. No sustituye la valoración clínica.</p>
      </div>
    </div>
  )
}
