import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, fmtDate, nowHM, todayStr, weekStart } from '../../lib/dates'
import { listDaily } from '../../store/repo'
import { useSettings } from '../../store/useSettings'
import type { HidraCfg, HidraDia } from '../hidratacion/logica'
import { aMin, type NutriCfg, type NutriDia } from '../nutricion/logica'
import type { SuplCfg, SuplDia } from '../suplementos/logica'
import { global, grado, objetivosDe, type DescansoDia, type Marca, type ObjCfg } from './logica'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const SIGNO: { [k in Marca]: string } = { ok: '✓', no: '✗', parcial: '~', pend: '·', nada: '' }
const DICE: { [k in Marca]: string } = { ok: 'cumplido', no: 'no cumplido', parcial: 'a medias', pend: 'pendiente', nada: 'sin datos' }
const pct = (x: number) => Math.round(x * 100) + ' %'
const color = (x: number) => ({ ok: 'verde', parcial: 'amarillo', no: 'rojo' })[grado(x)]

type Semana = { nutri: Map<string, NutriDia>; hidra: Map<string, HidraDia>; supl: Map<string, SuplDia>; descanso: Map<string, DescansoDia> }
const mapa = <T,>(r: { day: string; value: T }[]) => new Map(r.map((x) => [x.day, x.value]))

/** Portada de Inicio: los objetivos de cumplimiento de la semana (de lunes a domingo), con un recuadro por día. */
export function Portada() {
  const hoy = todayStr()
  const [ahoraMin, setAhoraMin] = useState(() => aMin(nowHM()) ?? 0)
  useEffect(() => { const t = window.setInterval(() => setAhoraMin(aMin(nowHM()) ?? 0), 60000); return () => window.clearInterval(t) }, [])

  const [nutriCfg] = useSettings<NutriCfg>('nutricion')
  const [hidraCfg] = useSettings<HidraCfg>('hidratacion')
  const [suplCfg] = useSettings<SuplCfg>('suplementos')
  const [objCfg] = useSettings<ObjCfg>('objetivos')

  const [lunes, setLunes] = useState(() => weekStart(hoy))
  const [sem, setSem] = useState<Semana | null>(null)
  useEffect(() => {
    let alive = true
    setSem(null)
    const fin = addDays(lunes, 6)
    Promise.all([
      listDaily<NutriDia>('nutricion', addDays(lunes, -1), fin), // el día anterior, para el ayuno del lunes
      listDaily<HidraDia>('hidratacion', lunes, fin),
      listDaily<SuplDia>('suplementos', lunes, fin),
      listDaily<DescansoDia>('descanso', lunes, fin),
    ]).then(([n, h, s, d]) => alive && setSem({ nutri: mapa(n), hidra: mapa(h), supl: mapa(s), descanso: mapa(d) }), () => {})
    return () => { alive = false }
  }, [lunes])

  const objetivos = useMemo(() => {
    if (!sem || !nutriCfg || !suplCfg) return null
    return objetivosDe(lunes, { hoy, ahoraMin, nutriCfg, hidraCfg, suplCfg, objCfg: objCfg ?? {}, ...sem })
  }, [sem, lunes, hoy, ahoraMin, nutriCfg, hidraCfg, suplCfg, objCfg])

  const g = objetivos ? global(objetivos) : null
  const estaSemana = lunes === weekStart(hoy)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  return (
    <>
      <div className="card sem">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Objetivos de la semana</h2>
          <div className="sem-nav">
            <button type="button" className="btn sm ghost" aria-label="Semana anterior" onClick={() => setLunes(addDays(lunes, -7))}>‹</button>
            <button type="button" className="btn sm ghost" aria-label="Semana siguiente" disabled={estaSemana} onClick={() => setLunes(addDays(lunes, 7))}>›</button>
          </div>
        </div>
        <p className="muted">{estaSemana ? 'Esta semana' : 'Semana'} del {fmtDate(lunes)} al {fmtDate(addDays(lunes, 6))}</p>

        {!objetivos ? <p className="muted">Cargando…</p> : (
          <>
            <div className="sem-global">
              <strong>{g == null ? '—' : pct(g)}</strong>
              <span>{g == null ? 'Todavía no hay datos de esta semana.' : 'de cumplimiento en lo que va de semana'}</span>
              <div className="barra"><i className={g == null ? '' : color(g)} style={{ width: g == null ? 0 : pct(g).replace(' ', '') }} /></div>
            </div>
            <div className="sem-tira sem-dow" aria-hidden="true">
              {dias.map((d, i) => <span key={d} className={d === hoy ? 'hoy' : ''}>{DOW[i]} {Number(d.slice(8))}</span>)}
            </div>
            {objetivos.map((o) => (
              <Link key={o.id} to={'/' + o.ruta} className="sem-obj">
                <div className="row between">
                  <strong>{o.nombre}</strong>
                  <span className="sem-res">{o.parte != null && <b className={color(o.parte)}>{pct(o.parte)}</b>} {o.falta ? <span className="tag gray">{o.falta}</span> : o.texto}</span>
                </div>
                <div className="sem-tira" role="img" aria-label={dias.map((d, i) => `${fmtDate(d)}: ${d > hoy ? 'aún no ha llegado' : DICE[o.dias[i]]}`).join('. ')}>
                  {o.dias.map((m, i) => <span key={i} className={'sem-celda ' + m + (dias[i] === hoy ? ' hoy' : '') + (dias[i] > hoy ? ' futuro' : '')}>{SIGNO[m]}</span>)}
                </div>
              </Link>
            ))}
            <div className="sem-ley" aria-hidden="true">
              <span><i className="sem-celda ok">✓</i> Cumplido (100 %)</span>
              <span><i className="sem-celda parcial">~</i> A medias (del 50 al 99 %)</span>
              <span><i className="sem-celda no">✗</i> No cumplido (menos del 50 %)</span>
              <span><i className="sem-celda pend">·</i> Hoy, pendiente</span>
              <span><i className="sem-celda nada" /> Sin datos</span>
            </div>
            <p className="muted small">Los días sin datos no cuentan en el porcentaje.</p>
          </>
        )}
      </div>
    </>
  )
}
