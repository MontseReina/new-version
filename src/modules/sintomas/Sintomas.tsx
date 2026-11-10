import { useNavigate, useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Section } from '../../components/ui'
import { todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import Ciclo from '../ciclo/Ciclo'
import { Editor } from './Editor'
import { Grupos } from './Grupos'
import { cumplimiento, gruposDe, gruposDePagina, nivel, type SintCfg, type SintDia } from './logica'

/** Ciclo menstrual: el ciclo arriba y, debajo, los grupos de síntomas que no son de Disautonomía. */
export default function Sintomas() {
  const date = useParams().date ?? todayStr()
  const nav = useNavigate()
  const { value: d, set, state, retry } = useDaily<SintDia>('sintomas', date)
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  const todos = gruposDe(cfg)
  const grupos = gruposDePagina(todos, 'ciclo')
  const c = cumplimiento(grupos, d)
  const lv = nivel(c.pct)
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  return (
    <div>
      <h1>Ciclo menstrual</h1>
      <DateNav date={date} base="/sintomas" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <Ciclo date={date} onDate={(x) => nav('/sintomas/' + x)} sintDia={d} />

      {c.total > 0 && (
        <div className={'card vaso-card ' + lv} style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <div className="vaso-total"><strong>{c.hechos}</strong> de {c.total} apartados registrados</div>
            <div className="barra" style={{ marginTop: '.4rem' }}><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
            {c.faltan.length > 0 && <div className="muted small" style={{ marginTop: '.3rem' }}>Faltan: {c.faltan.join(', ')}.</div>}
          </div>
        </div>
      )}

      <Grupos grupos={grupos} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
      <p className="muted small">La temperatura basal llegará sola desde Oura cuando se conecte el anillo. Los episodios, las constantes, la energía y la hidratación se anotan en Disautonomía.</p>

      <Section title="Editar mis grupos">
        <Editor grupos={todos} acciones={cfg?.acciones ?? []} guardar={(g) => void saveCfg({ grupos: g })} guardarAcciones={(a) => void saveCfg({ acciones: a })} />
      </Section>
    </div>
  )
}
