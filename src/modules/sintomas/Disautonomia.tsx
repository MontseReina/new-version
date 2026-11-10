import { useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Section } from '../../components/ui'
import { todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { HidraCompacta } from '../hidratacion/Compacta'
import { Constantes } from './Constantes'
import { Editor } from './Editor'
import { Grupos } from './Grupos'
import { cumplimiento, episodiosDe, gruposDe, gruposDePagina, marcaDia, nivel, type SintCfg, type SintDia } from './logica'

/**
 * Disautonomía: constantes con su hora, episodios (hora, intensidad, ingreso y qué hice), los grupos del día
 * que la usuaria haya puesto en esta pantalla (energía, neurología, emocional…) e hidratación reducida.
 * Escribe en el mismo registro diario que Ciclo menstrual ('sintomas'): lo ya anotado se conserva.
 */
export default function Disautonomia() {
  const date = useParams().date ?? todayStr()
  const { value: d, set, state, retry } = useDaily<SintDia>('sintomas', date)
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  const todos = gruposDe(cfg)
  const grupos = gruposDePagina(todos, 'disautonomia')
  const episodios = grupos.filter((g) => g.tipo === 'detalle')
  const resto = grupos.filter((g) => g.tipo !== 'detalle')
  const c = cumplimiento(grupos, d)
  const lv = nivel(c.pct)
  const m = marcaDia(episodiosDe(episodios, [{ day: date, value: d }]))
  const tomas = d.constantes?.length ?? 0
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  return (
    <div>
      <h1>Disautonomía</h1>
      <DateNav date={date} base="/disautonomia" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <div className={'card vaso-card ' + (m.n ? (m.ingreso ? 'rojo' : 'amarillo') : 'verde')} style={{ gridTemplateColumns: '1fr' }}>
        <div className="dis-dia small">
          <span><strong>{m.n}</strong> {m.n === 1 ? 'episodio' : 'episodios'}</span>
          {m.gravedad != null && <span>intensidad máxima <strong>{m.gravedad}</strong>/10</span>}
          {m.ingreso && <span className="error">🚑 con ingreso</span>}
          <span><strong>{tomas}</strong> {tomas === 1 ? 'toma de constantes' : 'tomas de constantes'}</span>
        </div>
        {c.total > 0 && (
          <div style={{ marginTop: '.5rem' }}>
            <div className="small">{c.hechos} de {c.total} apartados del día registrados</div>
            <div className="barra" style={{ marginTop: '.3rem' }}><i className={lv} style={{ width: Math.round(c.pct * 100) + '%' }} /></div>
            {c.faltan.length > 0 && <div className="muted small" style={{ marginTop: '.3rem' }}>Faltan: {c.faltan.join(', ')}.</div>}
          </div>
        )}
      </div>

      <fieldset className="sint" disabled={state === 'cargando'}>
        <Constantes d={d} set={set} date={date} />
      </fieldset>
      <Grupos grupos={episodios} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
      <Grupos grupos={resto} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
      <HidraCompacta date={date} />

      <Section title="Editar grupos">
        <Editor grupos={todos} acciones={cfg?.acciones ?? []} guardar={(g) => void saveCfg({ grupos: g })} guardarAcciones={(a) => void saveCfg({ acciones: a })} />
      </Section>
    </div>
  )
}
