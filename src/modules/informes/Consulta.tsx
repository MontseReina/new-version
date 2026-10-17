import { useState } from 'react'
import { addDays, fmtDate, todayStr } from '../../lib/dates'
import { useSettings } from '../../store/useSettings'
import { FASES, infoDia } from '../ciclo/logica'
import { duracion } from '../nutricion/logica'
import { grado } from '../objetivos/logica'
import { pendientesDe, usePreguntas, type PregCfg } from '../preguntas/store'
import {
  composicionTxt, corta, miles, dec, episodiosDe, filasSintomas, media, notasDe, objetivosDel, pautaTxt, pct, pl, productosVigentes,
  resumenHidratacion, resumenNutricion, resumenPeso, resumenSuplementos, sintomasDel, terapiaDel,
} from './calculos'
import { usePeriodo } from './datos'
import { useContexto } from './useContexto'

const kg = (n: number) => dec(n).replace(/,0$/, '')
const signo = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + kg(Math.abs(n))

/** Informe de consulta de una o dos páginas, para imprimir o guardar en PDF y entregar al especialista. */
export default function Consulta({ volver }: { volver: () => void }) {
  const [hasta, setHasta] = useState(todayStr())
  const [desde, setDesde] = useState(addDays(todayStr(), -29))
  const [esp, setEsp] = useState('')
  const [pregCfg] = useSettings<PregCfg>('preguntas')
  const { lista } = usePreguntas()
  const { c, listo } = useContexto()
  const { datos: p, error } = usePeriodo(desde, hasta)
  const especialistas = pregCfg?.especialistas ?? []

  return (
    <div>
      <div className="row between no-print">
        <h1>Informe de consulta</h1>
        <div className="row">
          <button className="btn sm secondary" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="btn sm ghost" onClick={volver}>Volver</button>
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
        {(!p || !listo) && !error ? <p className="muted">Cargando…</p> : p && cuerpo()}
        <p className="muted small">Registro elaborado por la paciente con la app New Version. Las kilocalorías son estimaciones a partir de su menú y de raciones caseras. No sustituye la valoración clínica.</p>
      </div>
    </div>
  )

  function cuerpo() {
    if (!p) return null
    const info = infoDia(c.modelo, c.cicloMapa, hasta < c.hoy ? hasta : c.hoy)
    const reglas = c.modelo.reglas.filter((r) => r.fin >= desde && r.inicio <= hasta)
    const { dias, grupos } = sintomasDel(p, c)
    const filas = filasSintomas(grupos, dias)
    const episodios = episodiosDe(grupos, dias)
    const notas = notasDe(grupos, dias)
    const nut = resumenNutricion(p, c)
    const peso = resumenPeso(p)
    const hid = resumenHidratacion(p, c)
    const sup = resumenSuplementos(p, c)
    const terapia = terapiaDel(p, c)
    const productos = productosVigentes(c, hasta < c.hoy ? hasta : c.hoy)
    const objetivos = objetivosDel(p, c)
    const pend = pendientesDe(lista ?? [], esp || undefined)

    return (
      <>
        <h3>Ciclo</h3>
        <p className="small">
          {info ? `Día ${info.dia} del ciclo (${FASES[info.fase].toLowerCase()}) a fecha del informe. ` : 'Sin reglas registradas. '}
          {c.modelo.nMedia > 0 && `Duración media del ciclo: ${c.modelo.media} días (${pl(c.modelo.nMedia, 'ciclo', 'ciclos')}). `}
          {reglas.length > 0 && `Reglas en el periodo: ${reglas.map((r) => (r.fin > r.inicio ? `${corta(r.inicio)} a ${corta(r.fin)}` : corta(r.inicio))).join(' · ')}.`}
        </p>

        {episodios.length > 0 && (
          <>
            <h3>Episodios ({episodios.length})</h3>
            <table className="table"><tbody>
              {episodios.map((e, i) => {
                const d = infoDia(c.modelo, c.cicloMapa, e.dia)
                return (
                  <tr key={i}>
                    <td>{fmtDate(e.dia)}{e.hora && ' · ' + e.hora}</td>
                    <td>{e.nombre}{e.gravedad != null && ` · gravedad ${e.gravedad}/10`}{e.urgencias && ' · ingreso en urgencias'}{d && ` · día ${d.dia} del ciclo${d.critica ? ' (ventana crítica)' : ''}`}</td>
                  </tr>
                )
              })}
            </tbody></table>
          </>
        )}

        <h3>Signos y síntomas ({pl(dias.length, 'día registrado', 'días registrados')})</h3>
        <table className="table"><tbody>
          {filas.map(([n, t]) => <tr key={n}><td>{n}</td><td>{t}</td></tr>)}
          {filas.length === 0 && <tr><td>Sin síntomas registrados</td></tr>}
        </tbody></table>
        {notas.length > 0 && (
          <>
            <h3>Otros signos y síntomas</h3>
            <ul className="small">{notas.map((n) => <li key={n.dia}>{fmtDate(n.dia)}: {n.texto}</li>)}</ul>
          </>
        )}

        <h3>Alimentación y peso</h3>
        {!nut || !nut.diasConRegistro ? <p className="small">Sin comidas registradas en el periodo.</p> : (
          <table className="table"><tbody>
            <tr><td>Tomas</td><td>{nut.hechas} de {nut.total} hechas ({pct(nut.hechas / nut.total)}) en {pl(nut.diasConRegistro, 'día', 'días')}{nut.saltadas.length > 0 && ` · más saltadas: ${nut.saltadas.slice(0, 3).map(([n, x]) => `${n.toLowerCase()} ${x}`).join(', ')}`}</td></tr>
            {nut.kcal && <tr><td>Kilocalorías</td><td>Media de unas {miles(nut.kcal.mediaComido)} al día frente a {miles(nut.kcal.mediaReferencia)} {nut.kcal.deMenu ? 'previstas en su menú' : 'pautadas'} ({pct(nut.kcal.mediaComido / nut.kcal.mediaReferencia)}) · llega en {nut.kcal.llega} de {pl(nut.kcal.dias, 'día', 'días')}{nut.kcal.sinContar > 0 && ` · ${pl(nut.kcal.sinContar, 'día', 'días')} sin poder contar`}</td></tr>}
            {nut.cenasConHora > 0 && <tr><td>Cena</td><td>Terminada a las {c.nutriCfg?.cena_fin_max ?? '21:00'} o antes: {nut.cenasATiempo} de {pl(nut.cenasConHora, 'día', 'días')}</td></tr>}
            {nut.ayunos.length > 0 && <tr><td>Ayuno de la noche</td><td>Media {duracion(Math.round(media(nut.ayunos)))} · entre {duracion(Math.min(...nut.ayunos))} y {duracion(Math.max(...nut.ayunos))} ({pl(nut.ayunos.length, 'noche', 'noches')})</td></tr>}
          </tbody></table>
        )}
        {peso.primera ? (
          <p className="small">
            Peso: {kg(peso.primera.kg!)} kg el {corta(peso.primera.dia)}
            {peso.ultimaKg && peso.ultimaKg !== peso.primera && ` → ${kg(peso.ultimaKg.kg!)} kg el ${corta(peso.ultimaKg.dia)} (${signo(peso.ultimaKg.kg! - peso.primera.kg!)} kg)`}.
            {peso.anterior && ` Antes del periodo: ${kg(peso.anterior.kg!)} kg el ${fmtDate(peso.anterior.dia)}.`}
            {peso.composicion && ` Composición (${corta(peso.composicion.dia)}): ${composicionTxt(peso.composicion)}.`}
          </p>
        ) : <p className="small">Peso: sin pesadas en el periodo{peso.anterior ? ` (última: ${kg(peso.anterior.kg!)} kg el ${fmtDate(peso.anterior.dia)})` : ''}.</p>}

        <h3>Hidratación</h3>
        <p className="small">{hid ? `Media ${dec(hid.mediaMl / 1000)} litros al día en ${pl(hid.dias, 'día', 'días')}; llega al objetivo (${dec(hid.obj / 1000).replace(/,0$/, '')} l) en ${hid.llega}.` : 'Sin datos.'}</p>

        <h3>Suplementos</h3>
        <p className="small">{sup ? `Tomas hechas: ${sup.hechas} de ${sup.pautadas} pautadas (${pct(sup.hechas / sup.pautadas)}) en ${pl(sup.dias, 'día', 'días')}.` : 'Sin tomas marcadas en el periodo.'}</p>
        {productos.length > 0 && (
          <table className="table"><tbody>
            {productos.map((x) => <tr key={x.id}><td>{x.nombre}</td><td className="small">{pautaTxt(x)}</td></tr>)}
          </tbody></table>
        )}
        {terapia.length > 0 && (
          <>
            <h3>Terapia endovenosa</h3>
            <table className="table"><tbody>
              {terapia.map((t) => (
                <tr key={t.nombre}>
                  <td>{t.nombre}</td>
                  <td className="small">{[t.pauta, t.veces.length ? `en el periodo: ${t.veces.map(corta).join(', ')}` : 'ninguna en el periodo', t.proxima && `próxima: ${fmtDate(t.proxima)}`].filter(Boolean).join(' · ')}</td>
                </tr>
              ))}
            </tbody></table>
          </>
        )}

        {objetivos.length > 0 && (
          <>
            <h3>Objetivos de hábitos en el periodo</h3>
            <table className="table"><tbody>
              {objetivos.map((o) => <tr key={o.id}><td>{o.nombre}</td><td className="small"><b className={'inf-pct ' + ({ ok: 'verde', parcial: 'amarillo', no: 'rojo' })[grado(o.parte!)]}>{pct(o.parte!)}</b> · {o.texto}</td></tr>)}
            </tbody></table>
          </>
        )}

        <h3>Preguntas pendientes{esp ? ` para ${esp}` : ''}</h3>
        {pend.length > 0 && <ol className="small">{pend.map((q) => <li key={q.id}>{q.texto}{!esp && <span className="muted"> ({q.especialista})</span>}</li>)}</ol>}
        {pend.length === 0 && <p className="small muted">Ninguna.</p>}
      </>
    )
  }
}
