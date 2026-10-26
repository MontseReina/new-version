import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from '../../components/ui'
import { addDays, todayStr } from '../../lib/dates'
import { HABITOS, metaDe, progresoSemana, type Habito, type IntroCfg, type IntroDia, type Metas } from './logica'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const corta = (x: string) => `${Number(x.slice(8))} ${MESES[Number(x.slice(5, 7)) - 1]}`

/** Cabecera de Trabajo introspectivo: la semana de un vistazo y cómo van los objetivos semanales. */
export function Semana({ cfg, saveCfg, date, lunes, porDia, base }: {
  cfg: IntroCfg | null; saveCfg: (p: Partial<IntroCfg>) => Promise<void>
  date: string; lunes: string; porDia: Map<string, IntroDia>; base: string
}) {
  const nav = useNavigate()
  const hoy = todayStr()
  const [editar, setEditar] = useState(false)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const valores = dias.map((x) => porDia.get(x)).filter((v): v is IntroDia => !!v)
  const prog = progresoSemana(cfg, valores)
  const conMeta = prog.filter((p) => p.meta > 0)
  const logrados = conMeta.filter((p) => p.logrado).length
  const estaSemana = hoy >= lunes && hoy <= addDays(lunes, 6)

  return (
    <section className="card intro-semana" aria-label="Esta semana">
      <div className="intro-sem-cab">
        <button type="button" className="btn sm ghost" aria-label="Semana anterior" onClick={() => nav(`${base}/${addDays(lunes, -7)}`)}>‹</button>
        <div className="intro-sem-titulo">
          <span className="intro-kicker">{estaSemana ? 'Esta semana' : 'Semana'}</span>
          <strong>{corta(lunes)} – {corta(addDays(lunes, 6))}</strong>
        </div>
        <button type="button" className="btn sm ghost" aria-label="Semana siguiente" disabled={addDays(lunes, 7) > hoy}
          onClick={() => nav(`${base}/${addDays(lunes, 7) > hoy ? hoy : addDays(lunes, 7)}`)}>›</button>
      </div>

      {conMeta.length > 0 && (
        <p className="intro-sem-total">
          <b>{logrados}</b> de {conMeta.length} objetivos {logrados === conMeta.length ? 'conseguidos. Bien hecho.' : 'conseguidos'}
        </p>
      )}

      <div className="intro-dias">
        {dias.map((x, i) => {
          const v = porDia.get(x)
          return (
            <button key={x} type="button" disabled={x > hoy} onClick={() => nav(`${base}/${x}`)} aria-label={x}
              className={'intro-dia' + (x === date ? ' on' : '') + (x === hoy ? ' hoy' : '')}>
              <span className="l">{DOW[i]}</span>
              <span className="n">{Number(x.slice(8))}</span>
              <span className="pts" aria-hidden="true">
                {HABITOS.map((h) => <i key={h.k} className={h.k + (v && h.hecho(v) ? ' si' : '')} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="intro-metas">
        {prog.map((p) => {
          const tramos = p.meta > 0 ? Math.min(p.meta, 10) : 0
          const lleno = p.meta > 0 ? Math.min(p.hecho / p.meta, 1) : 0
          return (
            <div key={p.k} className={'intro-meta ' + p.k + (p.logrado ? ' logrado' : '') + (p.meta === 0 ? ' sin' : '')}>
              <span className="intro-meta-nom"><i aria-hidden="true" />{p.nombre}</span>
              {p.meta > 0 ? (
                <span className="intro-meta-barra" role="img" aria-label={`${p.hecho} de ${p.meta} ${p.unidad}`}>
                  {Array.from({ length: tramos }, (_, i) => <span key={i} className={i < Math.floor(lleno * tramos + 1e-9) ? 'si' : ''} />)}
                </span>
              ) : <span className="intro-meta-barra vacia" />}
              <span className="intro-meta-num">
                {p.meta > 0 ? <><b>{p.hecho}</b>/{p.meta}</> : <b>{p.hecho}</b>}
                {p.logrado ? <span className="intro-meta-ok" aria-label="conseguido">✓</span> : <span className="intro-meta-ok vacio" aria-hidden="true" />}
              </span>
            </div>
          )
        })}
      </div>

      {editar ? (
        <EditarMetas cfg={cfg} guardar={async (m) => { await saveCfg({ metas: m }); setEditar(false) }} cancelar={() => setEditar(false)} />
      ) : (
        <div className="intro-sem-pie">
          <span className="muted small">Un día cuenta con lo mínimo: una línea de diario vale.</span>
          <button type="button" className="linkbtn small" onClick={() => setEditar(true)}>Cambiar objetivos</button>
        </div>
      )}
    </section>
  )
}

function EditarMetas({ cfg, guardar, cancelar }: { cfg: IntroCfg | null; guardar: (m: Metas) => Promise<void>; cancelar: () => void }) {
  const [m, setM] = useState<Metas>(() => Object.fromEntries(HABITOS.map((h) => [h.k, metaDe(cfg, h.k)])))
  return (
    <div className="intro-metas-ed">
      <p className="muted small">Objetivo de cada semana. Pon 0 si esa parte no quieres medirla.</p>
      {HABITOS.map((h) => (
        <div key={h.k} className="row between intro-metas-fila">
          <span>{h.nombre} <span className="muted small">({h.unidad})</span></span>
          <Stepper value={m[h.k as Habito]} min={0} max={h.max} onChange={(v) => setM({ ...m, [h.k]: v ?? 0 })} />
        </div>
      ))}
      <div className="row">
        <button type="button" className="btn sm" onClick={() => void guardar(m)}>Guardar</button>
        <button type="button" className="btn sm ghost" onClick={cancelar}>Cancelar</button>
      </div>
    </div>
  )
}
