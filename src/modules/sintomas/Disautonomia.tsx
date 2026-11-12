import { useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Section } from '../../components/ui'
import { todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { EditarPauta, HidraCompacta } from '../hidratacion/Compacta'
import { useHidra } from '../hidratacion/useHidra'
import { FcDelDia } from '../oura/FcDelDia'
import { Constantes } from './Constantes'
import { Editor } from './Editor'
import { Grupos } from './Grupos'
import { gruposDe, gruposDePagina, type SintCfg, type SintDia } from './logica'

/**
 * Disautonomía: frecuencia cardíaca del día de Oura (en pequeño), constantes con su hora, episodios (hora, intensidad, ingreso y qué hice), los grupos del día
 * que la usuaria haya puesto en esta pantalla (energía, neurología, emocional…) e hidratación reducida.
 * Escribe en el mismo registro diario que Ciclo menstrual ('sintomas'): lo ya anotado se conserva.
 */
export default function Disautonomia() {
  const date = useParams().date ?? todayStr()
  const { value: d, set, state, retry } = useDaily<SintDia>('sintomas', date)
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  const hidra = useHidra(date)
  const todos = gruposDe(cfg)
  const grupos = gruposDePagina(todos, 'disautonomia')
  const episodios = grupos.filter((g) => g.tipo === 'detalle')
  const resto = grupos.filter((g) => g.tipo !== 'detalle')
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  return (
    <div>
      <h1>Disautonomía</h1>
      <DateNav date={date} base="/disautonomia" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <FcDelDia date={date} />
      <fieldset className="sint" disabled={state === 'cargando'}>
        <Constantes d={d} set={set} date={date} />
      </fieldset>
      <Grupos grupos={episodios} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
      <Grupos grupos={resto} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
      <HidraCompacta date={date} h={hidra} />

      <Section title="Editar mi pauta">
        <EditarPauta h={hidra} />
      </Section>
      <Section title="Editar mis grupos">
        <Editor grupos={todos} acciones={cfg?.acciones ?? []} guardar={(g) => void saveCfg({ grupos: g })} guardarAcciones={(a) => void saveCfg({ acciones: a })} />
      </Section>
    </div>
  )
}
