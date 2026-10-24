import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { nowHM, todayStr } from '../../lib/dates'
import { getDaily } from '../../store/repo'
import { useSettings } from '../../store/useSettings'
import type { HidraCfg } from '../hidratacion/logica'
import type { IntroCfg } from '../introspeccion/logica'
import { aMin, type NutriCfg } from '../nutricion/logica'
import type { SintCfg } from '../sintomas/logica'
import type { SuplCfg } from '../suplementos/logica'
import { apartadosDelDia, type DatosDia, type EstadoApartado } from './logica'

const MODULOS = ['sintomas', 'suplementos', 'nutricion', 'hidratacion', 'introspeccion'] as const
type Dias = Pick<DatosDia, (typeof MODULOS)[number]>

/** Lo que queda por rellenar hoy, apartado por apartado, como en Huma: una sola lista con lo pendiente y,
 *  debajo, lo que ya está completo. Toda la fila lleva a su pantalla. Se relee al volver a la pestaña. */
export function RegistroHoy() {
  const hoy = todayStr()
  const [dias, setDias] = useState<Dias | null>(null)
  const [vuelta, setVuelta] = useState(0)
  const [ahora, setAhora] = useState(() => aMin(nowHM()) ?? 0)
  useEffect(() => {
    let alive = true
    Promise.all(MODULOS.map((m) => getDaily(m, hoy).then((v) => v ?? {}))).then(
      (vs) => { if (alive) setDias(Object.fromEntries(MODULOS.map((m, i) => [m, vs[i]])) as unknown as Dias) },
      () => { if (alive) setDias(null) },
    )
    return () => { alive = false }
  }, [hoy, vuelta])
  useEffect(() => {
    const t = window.setInterval(() => setAhora(aMin(nowHM()) ?? 0), 60000)
    const ver = () => { if (document.visibilityState === 'visible') { setVuelta((n) => n + 1); setAhora(aMin(nowHM()) ?? 0) } }
    document.addEventListener('visibilitychange', ver)
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', ver) }
  }, [])
  const [sintCfg] = useSettings<SintCfg>('sintomas')
  const [suplCfg] = useSettings<SuplCfg>('suplementos')
  const [nutriCfg] = useSettings<NutriCfg>('nutricion')
  const [hidraCfg] = useSettings<HidraCfg>('hidratacion')
  const [introCfg] = useSettings<IntroCfg>('introspeccion')
  const listos = dias && sintCfg && suplCfg && nutriCfg && hidraCfg && introCfg
  const apartados = useMemo(
    () => (listos ? apartadosDelDia({ ...dias!, sintCfg, suplCfg, nutriCfg, hidraCfg, introCfg }, hoy, ahora) : []),
    [listos, dias, sintCfg, suplCfg, nutriCfg, hidraCfg, introCfg, hoy, ahora],
  )
  if (!listos) return <section className="card hoy-ahora"><div className="hoy-ahora-head"><h2>Registro de hoy</h2></div><p className="muted small" style={{ padding: '0 .9rem .8rem' }}>Cargando…</p></section>

  const quedan = apartados.filter((a) => !a.completo)
  const hechos = apartados.filter((a) => a.completo)
  const pct = Math.round((hechos.length / apartados.length) * 100)
  return (
    <>
      <section className="card hoy-ahora" aria-label="Lo que queda por rellenar hoy">
        <div className="hoy-ahora-head">
          <h2>{quedan.length ? 'Te queda por rellenar' : 'Registro de hoy'}</h2>
          <strong className="hoy-registro-n">{hechos.length} de {apartados.length}</strong>
        </div>
        <div className="hoy-barra" role="img" aria-label={`${hechos.length} de ${apartados.length} apartados completos`}><div style={{ width: `${pct}%` }} /></div>
        {quedan.length === 0 && <div className="hoy-vacio">✓ Todo apuntado por hoy.</div>}
        {quedan.map((a) => <FilaApartado key={a.id} a={a} />)}
      </section>
      {hechos.length > 0 && (
        <section className="card hoy-hechos" aria-label="Apartados completos">
          <div className="hoy-hechos-head">Hecho</div>
          {hechos.map((a) => <FilaApartado key={a.id} a={a} />)}
        </section>
      )}
    </>
  )
}

function FilaApartado({ a }: { a: EstadoApartado }) {
  return (
    <Link to={'/' + a.to} className={'hoy-fila' + (a.completo ? ' hecha' : '') + (a.urge ? ' urge' : '')}>
      <span className="hoy-fila-ico" aria-hidden="true">{a.ico}</span>
      <span className="hoy-fila-txt">
        <strong>{a.nombre}</strong>
        {!a.completo && <span className="muted small">{a.falta}</span>}
      </span>
      {a.completo
        ? <span className="marca hecha" role="img" aria-label="completo">✓</span>
        : <span className="marca" role="img" aria-label={a.faltan === 1 ? 'falta 1' : `faltan ${a.faltan}`}>{a.faltan}</span>}
      <span className="hoy-fila-ir" aria-hidden="true">›</span>
    </Link>
  )
}
