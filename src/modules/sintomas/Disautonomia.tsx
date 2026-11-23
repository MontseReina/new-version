import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Section } from '../../components/ui'
import { addDays, todayStr } from '../../lib/dates'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { EditarPauta, HidraCompacta } from '../hidratacion/Compacta'
import { useHidra } from '../hidratacion/useHidra'
import { useOuraDia } from '../oura/useOuraDia'
import { ConectarReloj } from '../reloj/Conectar'
import { PulsoDelDia } from '../reloj/PulsoDelDia'
import { useRelojDia } from '../reloj/useRelojDia'
import { Constantes } from './Constantes'
import { Editor } from './Editor'
import { Grupos } from './Grupos'
import { ReposoTSI } from './ReposoTSI'
import { Taquicardias } from './Taquicardias'
import { TensionesDia } from './TensionesDia'
import { TestOrtostatico } from './TestOrtostatico'
import { MOMENTOS_DIA, MOMENTOS_TEST, MOMENTOS_TEST_TARDE, medidaConDatos, conGruposNuevos, gruposDe, gruposDePagina, type SintCfg, type SintDia } from './logica'

/** Los grupos nuevos se añaden una sola vez por sesión, aunque la pantalla se pinte varias veces. */
let anadidos = false

/** Hojas de Disautonomía (desde la 0.26.0), en su orden. */
type Hoja = 'pots' | 'hipotension' | 'tsi' | 'fc' | 'episodio'
const HOJAS: [Hoja, string][] = [['pots', 'POTS'], ['hipotension', 'Hipotensión'], ['tsi', 'TSI'], ['fc', 'FC del día'], ['episodio', 'Episodio']]
const CLAVE_HOJA = 'nv-disautonomia-hoja'
function hojaGuardada(): Hoja {
  try { const h = localStorage.getItem(CLAVE_HOJA) as Hoja | null; return h && HOJAS.some(([k]) => k === h) ? h : 'pots' } catch { return 'pots' }
}

/**
 * Disautonomía, en cinco hojas (desde la 0.26.0):
 * POTS (test de pie: tomas, FC y resultado) · Hipotensión (tensión del test, tensiones del día y su resultado) · TSI (FC en reposo)
 * · FC del día (pulso del reloj y de Oura, ratos altos y «Siento taquicardia ahora») · Episodio (episodios, los demás grupos del día e hidratación reducida).
 * Escribe en el mismo registro diario que Ciclo menstrual ('sintomas'): lo ya anotado se conserva.
 */
export default function Disautonomia() {
  const date = useParams().date ?? todayStr()
  const { value: d, set, state, retry } = useDaily<SintDia>('sintomas', date)
  const [cfg, saveCfg] = useSettings<SintCfg>('sintomas')
  useEffect(() => {
    const nuevos = conGruposNuevos(cfg)
    if (!nuevos || anadidos) return
    anadidos = true
    void saveCfg(nuevos)
  }, [cfg, saveCfg])
  const hidra = useHidra(date)
  const oura = useOuraDia(date)
  const reloj = useRelojDia(date)
  const relojAyer = useRelojDia(addDays(date, -1))
  const todos = gruposDe(cfg)
  const grupos = gruposDePagina(todos, 'disautonomia')
  const episodios = grupos.filter((g) => g.tipo === 'detalle')
  const resto = grupos.filter((g) => g.tipo !== 'detalle')
  const [hoja, setHoja] = useState<Hoja>(hojaGuardada)
  // La tarjeta de hipotensión del test de la tarde sale solo los días que se hizo.
  const conTestTarde = (d.constantes ?? []).some((x) => MOMENTOS_TEST_TARDE.includes(x.momento!) && medidaConDatos(x))
  const elegir = (h: Hoja) => { setHoja(h); try { localStorage.setItem(CLAVE_HOJA, h) } catch { /* sin guardar la hoja */ } }
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  return (
    <div>
      <h1>Disautonomía</h1>
      <DateNav date={date} base="/disautonomia" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      <nav className="hojas" role="tablist" aria-label="Hojas de Disautonomía">
        {HOJAS.map(([k, l]) => <button type="button" role="tab" key={k} aria-selected={hoja === k} className={'hoja' + (hoja === k ? ' on' : '')} onClick={() => elegir(k)}>{l}</button>)}
      </nav>

      {hoja === 'pots' && <fieldset className="sint" disabled={state === 'cargando'}>
        <TestOrtostatico d={d} set={set} date={date} reloj={reloj} vista="pots" />
        <Constantes d={d} set={set} date={date} relojDia={reloj} momentos={MOMENTOS_TEST} esporadicas={false}
          titulo="🩺 Tomas del test" intro="Tumbada («Al levantarme») y de pie al 1, 3, 5 y 10 minutos («Poslevantarme»). En cada toma: FC, tensión y qué notas." />
        <TestOrtostatico d={d} set={set} date={date} reloj={reloj} vista="pots" sesion="tarde" />
        <Constantes d={d} set={set} date={date} relojDia={reloj} momentos={MOMENTOS_TEST_TARDE} esporadicas={false}
          titulo="🩺 Tomas del test de la tarde" intro="Tumbada («Tarde · tumbada») y de pie al 1, 3, 5 y 10 minutos («Tarde · de pie»). En cada toma: FC, tensión y qué notas." />
      </fieldset>}

      {hoja === 'hipotension' && <fieldset className="sint" disabled={state === 'cargando'}>
        <TestOrtostatico d={d} set={set} date={date} reloj={reloj} vista="hipotension" />
        {conTestTarde && <TestOrtostatico d={d} set={set} date={date} reloj={reloj} vista="hipotension" sesion="tarde" />}
        <Constantes d={d} set={set} date={date} relojDia={reloj} momentos={MOMENTOS_DIA}
          titulo="🩺 Tensiones del día" intro="Antes y después de desayunar, comer y cenar, media mañana, media tarde, antes de irme a la cama y las esporádicas (por síntomas, para controlar los hidroelectrolíticos…)." />
        <TensionesDia d={d} />
      </fieldset>}

      {hoja === 'tsi' && <ReposoTSI date={date} reloj={reloj} oura={oura} />}

      {hoja === 'fc' && <>
        <PulsoDelDia reloj={reloj} oura={oura} relojAyer={relojAyer} obs={d.obs_ratos} bloqueado={state === 'cargando'}
          onObs={(clave, texto) => set((a) => {
            const o = { ...(a.obs_ratos ?? {}) }
            if (texto) o[clave] = texto; else delete o[clave]
            return { obs_ratos: o }
          })} />
        <fieldset className="sint" disabled={state === 'cargando'}>
          <Taquicardias d={d} set={set} date={date} reloj={reloj} />
        </fieldset>
        {!reloj && !oura && <p className="muted small">Sin pulso del reloj ni de Oura este día.</p>}
        <Section title="⌚ Conectar el reloj">
          <ConectarReloj />
        </Section>
      </>}

      {hoja === 'episodio' && <>
        <Grupos grupos={episodios} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
        <Grupos grupos={resto} d={d} set={set} date={date} acciones={cfg?.acciones} disabled={state === 'cargando'} />
        <HidraCompacta date={date} h={hidra} />
        <Section title="Editar mi pauta">
          <EditarPauta h={hidra} />
        </Section>
        <Section title="Editar mis grupos">
          <Editor grupos={todos} acciones={cfg?.acciones ?? []} guardar={(g) => void saveCfg({ grupos: g })} guardarAcciones={(a) => void saveCfg({ acciones: a })} />
        </Section>
      </>}
    </div>
  )
}
