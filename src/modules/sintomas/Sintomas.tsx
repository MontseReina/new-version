import { useNavigate, useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Section, Stepper } from '../../components/ui'
import { todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import Ciclo from '../ciclo/Ciclo'
import { Bristol } from './Bristol'
import { Editor } from './Editor'
import { ORINA_COLORES, ORINA_NOMBRES, alternar, cumplimiento, gruposDe, nivel, type Episodio, type Grupo, type SintCfg, type SintDia } from './logica'

const DIEZ = Array.from({ length: 10 }, (_, i) => i + 1)
const SI_NO: [boolean, string][] = [[false, 'No'], [true, 'Sí']]

/** Signos y síntomas: el ciclo arriba y, debajo, los grupos del día para marcar con un toque. */
export default function Sintomas() {
  const date = useParams().date ?? todayStr()
  const nav = useNavigate()
  const { value: d, set, state, retry } = useDaily<SintDia>('sintomas', date)
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  const grupos = gruposDe(cfg)
  const c = cumplimiento(grupos, d)
  const lv = nivel(c.pct)
  const quieto = state === 'cargando'
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  const marcar = (g: Grupo, id: string) => set({ sel: { ...(d.sel ?? {}), [g.id]: alternar(g, d.sel?.[g.id] ?? [], id) } })
  const episodio = (g: Grupo, patch: Episodio) => set({ epi: { ...(d.epi ?? {}), [g.id]: { ...(d.epi?.[g.id] ?? {}), ...patch } } })
  const nHeces = d.heces_n ?? null
  const ponerHeces = (n: number | null) => set({ heces_n: n, heces: (d.heces ?? []).slice(0, n ?? 0) })
  const ponerBristol = (i: number, v: number | null) => {
    const l = Array.from({ length: nHeces ?? 0 }, (_, k) => d.heces?.[k] ?? null)
    l[i] = v
    set({ heces: l })
  }

  return (
    <div>
      <h1>Signos y síntomas</h1>
      <DateNav date={date} base="/sintomas" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <Ciclo date={date} onDate={(x) => nav('/sintomas/' + x)} />

      <div className={'card vaso-card ' + lv} style={{ gridTemplateColumns: '1fr' }}>
        <div>
          <div className="vaso-total"><strong>{c.hechos}</strong> de {c.total} apartados registrados</div>
          <div className="barra" style={{ marginTop: '.4rem' }}><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
          {c.faltan.length > 0 && <div className="muted small" style={{ marginTop: '.3rem' }}>Faltan: {c.faltan.join(', ')}.</div>}
        </div>
      </div>

      <fieldset className="sint" disabled={quieto}>
        {grupos.map((g) => {
          const e = d.epi?.[g.id] ?? {}
          return (
            <div className="card sint-grupo" key={g.id}>
              <h3>{g.nombre}</h3>
              {g.tipo === 'episodio' ? (
                <>
                  <div className="seg">
                    {SI_NO.map(([v, l]) => <button type="button" key={l} className={e.hubo === v ? 'on' : ''} aria-pressed={e.hubo === v} onClick={() => episodio(g, e.hubo === v ? { hubo: null } : v ? { hubo: true } : { hubo: false, intensidad: null, ingreso: null })}>{l}</button>)}
                  </div>
                  {e.hubo && (
                    <>
                      <div className="field">
                        <span>Intensidad (1 leve · 10 máxima)</span>
                        <div className="seg escala diez">
                          {DIEZ.map((n) => <button type="button" key={n} className={e.intensidad === n ? 'on' : ''} aria-pressed={e.intensidad === n} onClick={() => episodio(g, { intensidad: e.intensidad === n ? null : n })}>{n}</button>)}
                        </div>
                      </div>
                      <div className="field">
                        <span>¿Ha precisado ingreso?</span>
                        <div className="seg">
                          {SI_NO.map(([v, l]) => <button type="button" key={l} className={e.ingreso === v ? 'on' : ''} aria-pressed={e.ingreso === v} onClick={() => episodio(g, { ingreso: e.ingreso === v ? null : v })}>{l}</button>)}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="chips">
                  {(g.opciones ?? []).map((o) => {
                    const on = !!d.sel?.[g.id]?.includes(o.id)
                    return <button type="button" key={o.id} className={'chip ' + (on ? 'on' : '')} aria-pressed={on} onClick={() => marcar(g, o.id)}>{o.nombre}</button>
                  })}
                  {!g.opciones?.length && <span className="muted small">Sin opciones todavía. Añádelas en «Editar grupos».</span>}
                </div>
              )}
            </div>
          )
        })}

        <div className="card sint-grupo">
          <h3>Hambre</h3>
          <div className="seg escala">
            {[0, ...DIEZ].map((n) => <button type="button" key={n} className={d.hambre === n ? 'on' : ''} aria-pressed={d.hambre === n} onClick={() => set({ hambre: d.hambre === n ? null : n })}>{n}</button>)}
          </div>
          <div className="muted small">0 nada de hambre · 10 muchísima</div>
          <div className="chips" style={{ marginTop: '.4rem' }}>
            <button type="button" className={'chip ' + (d.sin_hambre ? 'on' : '')} aria-pressed={!!d.sin_hambre} onClick={() => set({ sin_hambre: !d.sin_hambre })}>Como sin hambre</button>
          </div>
        </div>

        <div className="card sint-grupo">
          <h3>Heces</h3>
          <div className="row">
            <Stepper value={nHeces} onChange={ponerHeces} max={20} />
            <span className="muted small">deposiciones. Si hoy no ha habido, apunta 0.</span>
          </div>
          {(nHeces ?? 0) > 0 && Array.from({ length: nHeces! }, (_, i) => (
            <div key={i} className="bristol-fila">
              {nHeces! > 1 && <div className="small bristol-num">Deposición {i + 1}</div>}
              <Bristol value={d.heces?.[i] ?? null} onChange={(v) => ponerBristol(i, v)} />
            </div>
          ))}
        </div>

        <div className="card sint-grupo">
          <h3>Micciones</h3>
          <div className="row">
            <Stepper value={d.micciones} onChange={(v) => set({ micciones: v })} max={40} />
            <span className="muted small">veces, aproximadamente</span>
          </div>
          <div className="field">
            <span>Color</span>
            <div className="urine">
              {ORINA_COLORES.map((col, i) => <button type="button" key={col} title={ORINA_NOMBRES[i]} aria-label={ORINA_NOMBRES[i]} aria-pressed={d.orina_color === i + 1} style={{ background: col }} className={d.orina_color === i + 1 ? 'on' : ''} onClick={() => set({ orina_color: d.orina_color === i + 1 ? null : i + 1 })} />)}
            </div>
            {d.orina_color ? <div className="muted small">{ORINA_NOMBRES[d.orina_color - 1]}</div> : null}
          </div>
          <div className="chips">
            <button type="button" className={'chip ' + (d.orina_olor ? 'on' : '')} aria-pressed={!!d.orina_olor} onClick={() => set({ orina_olor: !d.orina_olor })}>Con olor</button>
          </div>
        </div>

        <div className="card sint-grupo">
          <h3>Temperatura basal</h3>
          <div className="row">
            <input type="number" inputMode="decimal" step={0.01} min={34} max={42} placeholder="36,50" aria-label="Temperatura basal en grados" style={{ maxWidth: '7rem' }} value={d.temperatura ?? ''} onChange={(e) => set({ temperatura: e.target.value === '' ? null : Number(e.target.value) })} />
            <span className="muted small">°C, al despertar. Cuando se conecte Oura, llegará sola.</span>
          </div>
        </div>
      </fieldset>

      <Section title="Editar grupos">
        <Editor grupos={grupos} guardar={(g) => void saveCfg({ grupos: g })} />
      </Section>
    </div>
  )
}
