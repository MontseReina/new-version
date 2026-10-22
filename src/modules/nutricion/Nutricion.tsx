import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DateNav } from '../../components/DateNav'
import { Plato } from '../../components/Plato'
import { Field, Plegable } from '../../components/ui'
import { addDays, fmtDate, nowHM, todayStr } from '../../lib/dates'
import { getDaily, listDaily, type Daily } from '../../store/repo'
import { useDaily } from '../../store/useDaily'
import { useSettings } from '../../store/useSettings'
import { infoDia } from '../ciclo/logica'
import { useCiclo } from '../ciclo/useCiclo'
import type { HidraDia } from '../hidratacion/logica'
import {
  AGUA_ANTES_POR_DEFECTO, AGUA_DESPUES_POR_DEFECTO, AYUNO_MAX_POR_DEFECTO, CENA_MAX_POR_DEFECTO, GRACIA_MIN, MENUS, estadosDe,
  aMin, aguaDe, modeloDe, PLATO_MODELOS, protObjetivo, anotada, avisosDe, ayuno, duracion, hecha, horarios, leerCfg, limite, menuDe, nivelDia, platosDe, semana, tomasDe,
  type Estado, type MenuId, type PlatoHoy, type NutriCfg, type NutriDia, type TomaDef, type TomaDia,
} from './logica'
import { fmtKcal, kcalConPlato, kcalDia, kcalOtro, protDia, RANGO_POR_DEFECTO } from './kcal'
import { Peso } from './Peso'
import { Reloj } from './Reloj'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Nutrición: el menú que toca según el ciclo, una ficha por toma con su estado y sus horas, y las reglas de horario. */
export default function Nutricion() {
  const date = useParams().date ?? todayStr()
  const hoy = todayStr()
  const { value: d, set, state, rev, retry } = useDaily<NutriDia>('nutricion', date)
  const [cfg, saveCfg] = useSettings<NutriCfg>('nutricion')
  const { value: hidra } = useDaily<HidraDia>('hidratacion', date)
  const { modelo, mapa } = useCiclo()
  const c = cfg ?? {}
  const defs = tomasDe(cfg)

  // La hora de ahora, para saber qué toma está pendiente. Se refresca cada minuto.
  const [reloj, setReloj] = useState(nowHM())
  useEffect(() => { const t = window.setInterval(() => setReloj(nowHM()), 60000); return () => window.clearInterval(t) }, [])
  const ahoraMin = aMin(reloj) ?? 0

  const info = useMemo(() => infoDia(modelo, mapa, date), [modelo, mapa, date])
  const menu = useMemo(() => menuDe(c, info, date), [c, info, date])

  // Ayer (para el ayuno nocturno) y la última semana.
  const [ayer, setAyer] = useState<NutriDia | null>(null)
  const [filas, setFilas] = useState<Daily<NutriDia>[]>([])
  useEffect(() => {
    let alive = true
    setAyer(null)
    getDaily<NutriDia>('nutricion', addDays(date, -1)).then((v) => alive && setAyer(v), () => {})
    return () => { alive = false }
  }, [date])
  useEffect(() => {
    let alive = true
    listDaily<NutriDia>('nutricion', addDays(date, -34), date).then((r) => alive && setFilas(r), () => {})
    return () => { alive = false }
  }, [date, rev])

  if (!cfg) return <div><h1>Nutrición</h1><p className="muted">Cargando…</p></div>
  if (!defs.length) return <div><h1>Nutrición</h1><Vacio guardar={saveCfg} /></div>

  const h = horarios(c, d, date, hoy, ahoraMin)
  const kc = kcalDia(c, d, menu, date === hoy ? ahoraMin : null)
  const pr = protDia(c, d, menu)
  const ay = ayuno(c, ayer, d)
  const lv = nivelDia(h, ay)
  const cenaMax = c.cena_fin_max ?? CENA_MAX_POR_DEFECTO
  const ayunoMax = c.ayuno_max_h ?? AYUNO_MAX_POR_DEFECTO
  const estado = state === 'cargando' ? 'Cargando…' : state === 'guardando' ? 'Guardando…' : state === 'error' ? 'Sin guardar' : 'Guardado'

  const poner = (t: TomaDef, patch: TomaDia) => set({ menu: d.menu ?? menu.id, tomas: { ...(d.tomas ?? {}), [t.id]: { ...(d.tomas?.[t.id] ?? {}), ...patch } } })
  /** Un toque marca la toma; otro toque en la misma la deja sin marcar. Hoy, además, anota la hora de ahora. */
  const marcar = (t: TomaDef, e: Estado) => {
    const x = d.tomas?.[t.id] ?? {}
    if (x.estado === e) { poner(t, { estado: null }); return }
    const pl = platosDe(c, menu, t.id)
    const patch: TomaDia = { estado: e, platos: pl.map((p) => p.id), nombres: pl.map((p) => p.nombre) }
    if (e !== 'no' && date === hoy) {
      // En las principales se suele marcar al acabar: la hora de ahora va al final. En el resto, al inicio.
      if (t.principal) { if (!x.fin) patch.fin = nowHM() } else if (!x.ini) patch.ini = nowHM()
    }
    poner(t, patch)
  }

  const porDia = new Map(filas.map((r) => [r.day, r.value]))
  porDia.set(date, d)

  return (
    <div>
      <h1>Nutrición</h1>
      <DateNav date={date} base="/nutricion" sub={estado} />
      {state === 'error' && (
        <div className="notice small">No se ha podido guardar. Revisa la conexión. <button type="button" className="btn sm secondary" onClick={() => void retry()}>Reintentar</button></div>
      )}

      {date === hoy && <Reloj cfg={c} ayer={ayer} dia={d} />}
      <Balance cfg={c} pr={pr} kc={kc} esHoy={date === hoy} />

      <div className={'card vaso-card ' + lv} style={{ gridTemplateColumns: '1fr' }}>
        <div>
          <div className="row between">
            <strong>{MENUS[d.menu ?? menu.id]}</strong>
            <span className="vaso-total"><strong>{h.hechas}</strong> de {h.total} tomas</span>
          </div>
          <div className="muted small">{menu.porque}</div>
          <div className="row plato-modelo" role="group" aria-label="Plato de Harvard que sigues">
            <span className="small">Plato de Harvard</span>
            <div className="seg sm">
              {PLATO_MODELOS.map(([k, l]) => <button type="button" key={k} className={(c.plato_modelo ?? 'verdura') === k ? 'on' : ''} aria-pressed={(c.plato_modelo ?? 'verdura') === k} onClick={() => void saveCfg({ plato_modelo: k })}>{l}</button>)}
            </div>
          </div>
          <div className="barra" style={{ marginTop: '.4rem' }}><i className={lv} style={{ width: Math.round((h.hechas / h.total) * 100) + '%' }} /></div>
        </div>
      </div>

      {avisosDe(c, date).map((a) => <div className="notice small" key={a}>{a}</div>)}
      {menu.menu?.nota && <p className="muted small">{menu.menu.nota}</p>}
      {!menu.menu && <div className="notice small">No hay {MENUS[menu.id].toLowerCase()} cargado. Puedes registrar las tomas igualmente.</div>}

      <fieldset className="sint" disabled={state === 'cargando'}>
        {defs.map((t) => <Ficha key={t.id} t={t} x={d.tomas?.[t.id]} cfg={c} hidra={hidra}
          tocaba={d.tomas?.[t.id]?.nombres?.map((nombre, i) => ({ id: d.tomas![t.id].platos?.[i] ?? nombre, nombre })) ?? platosDe(c, menu, t.id)}
          pendiente={date === hoy && !d.tomas?.[t.id]?.estado && !anotada(d.tomas?.[t.id]) && limite(t) != null && ahoraMin > limite(t)! + GRACIA_MIN}
          esHoy={date === hoy} marcar={(e) => marcar(t, e)} poner={(p) => poner(t, p)} />)}
      </fieldset>

      <Plegable id="nutri-semana" title="Resumen de la semana">
        <div className="table-wrap">
          <table className="table nutri-sem">
            <thead><tr><th>Día</th><th>Tomas</th><th>Saltadas</th><th>Cena</th><th>Ayuno</th></tr></thead>
            <tbody>
              {semana(date).map((dia) => {
                const v = porDia.get(dia)
                if (!v || !Object.keys(v.tomas ?? {}).length) return <tr key={dia}><td><Link to={`/nutricion/${dia}`}>{fmtDate(dia)}</Link></td><td className="muted" colSpan={4}>Sin registrar</td></tr>
                const hh = horarios(c, v, dia, hoy, ahoraMin)
                const aa = ayuno(c, porDia.get(addDays(dia, -1)) ?? null, v)
                return (
                  <tr key={dia}>
                    <td><Link to={`/nutricion/${dia}`}>{fmtDate(dia)}</Link></td>
                    <td><span className={'dot ' + nivelDia(hh, aa)} />{hh.hechas} de {hh.total}</td>
                    <td className="small">{hh.saltadas.length || '—'}</td>
                    <td className="small">{hh.cenaFin || hh.cenaIni ? <>{hh.cenaOk === false && <span className="dot amarillo" />}{hh.cenaIni ?? '—'}–{hh.cenaFin ?? '—'}</> : '—'}</td>
                    <td className="small">{aa.min != null ? <>{aa.ok ? '' : <span className="dot amarillo" />}{duracion(aa.min)}</> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">Cena: hora a la que empezaste y a la que terminaste (máximo {cenaMax}). Ayuno: del final de la cena a la primera toma del día (máximo {ayunoMax} h).</p>
      </Plegable>

      <Plegable id="nutri-peso" title="Peso y composición corporal">
        <Peso />
      </Plegable>

      {(['folicular', 'luteo'] as MenuId[]).map((id) => c.menus?.[id] && (
        <Plegable key={id} id={'nutri-menu-' + id} title={MENUS[id] + ' completo'}>
          <TablaMenu cfg={c} id={id} hoyIdx={menu.id === id ? menu.indice : -1} />
        </Plegable>
      ))}

      <Plegable id="nutri-ajustes" title="Mis horarios y reglas">
        <h3>Hora prevista de cada toma</h3>
        {defs.map((t, i) => (
          <div className="row nutri-horario" key={t.id}>
            <span>{t.nombre}</span>
            <input type="time" aria-label={`Hora prevista de ${t.nombre}`} defaultValue={t.hora ?? ''} key={t.id + (t.hora ?? '')}
              onBlur={(e) => { if (e.target.value !== (t.hora ?? '')) void saveCfg({ tomas: defs.map((x, k) => (k === i ? { ...x, hora: e.target.value } : x)) }) }} />
            <span className="muted small">hasta</span>
            <input type="time" aria-label={`Hora límite de ${t.nombre}`} defaultValue={t.hasta ?? ''} key={t.id + 'h' + (t.hasta ?? '')}
              onBlur={(e) => { if (e.target.value !== (t.hasta ?? '')) void saveCfg({ tomas: defs.map((x, k) => (k === i ? { ...x, hasta: e.target.value } : x)) }) }} />
          </div>
        ))}
        <p className="muted small">Una toma sin registrar cuenta como pendiente {GRACIA_MIN} minutos después de su hora.</p>
        <div className="grid2">
          <Field label="Cena terminada como muy tarde"><input type="time" defaultValue={cenaMax} key={'c' + cenaMax} onBlur={(e) => { if (e.target.value && e.target.value !== cenaMax) void saveCfg({ cena_fin_max: e.target.value }) }} /></Field>
          <Field label="Proteína: gramos por kilo"><input type="number" inputMode="decimal" step="0.1" min={0} defaultValue={c.proteina?.g_kg ?? ''} key={'pg' + c.proteina?.g_kg} onBlur={(e) => { const v = Number(e.target.value.replace(',', '.')); void saveCfg({ proteina: { ...(c.proteina ?? {}), g_kg: v > 0 ? v : null } }) }} /></Field>
          <Field label="Peso deseado (kg)"><input type="number" inputMode="decimal" step="0.5" min={0} defaultValue={c.proteina?.peso_kg ?? ''} key={'pk' + c.proteina?.peso_kg} onBlur={(e) => { const v = Number(e.target.value.replace(',', '.')); void saveCfg({ proteina: { ...(c.proteina ?? {}), peso_kg: v > 0 ? v : null } }) }} /></Field>
          <Field label="Ayuno nocturno máximo (horas)"><input type="number" inputMode="numeric" min={1} max={24} defaultValue={ayunoMax} key={'a' + ayunoMax} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== ayunoMax) void saveCfg({ ayuno_max_h: v }) }} /></Field>
          <Field label="Sin agua antes de comer (min)"><input type="number" inputMode="numeric" min={0} defaultValue={c.agua_margen?.antes_min ?? AGUA_ANTES_POR_DEFECTO} key={'ma' + c.agua_margen?.antes_min} onBlur={(e) => void saveCfg({ agua_margen: { ...(c.agua_margen ?? {}), antes_min: Number(e.target.value) } })} /></Field>
          <Field label="Sin agua después de comer (min)"><input type="number" inputMode="numeric" min={0} defaultValue={c.agua_margen?.despues_min ?? AGUA_DESPUES_POR_DEFECTO} key={'md' + c.agua_margen?.despues_min} onBlur={(e) => void saveCfg({ agua_margen: { ...(c.agua_margen ?? {}), despues_min: Number(e.target.value) } })} /></Field>
        </div>
        <Field label="Menú que se enseña">
          <select value={c.menu_fijo ?? ''} onChange={(e) => void saveCfg({ menu_fijo: (e.target.value || null) as MenuId | null })}>
            <option value="">El que toca según el ciclo</option>
            <option value="folicular">Siempre el menú folicular</option>
            <option value="luteo">Siempre el menú lúteo</option>
          </select>
        </Field>
        <h3>Cargar mis menús</h3>
        <Cargador guardar={saveCfg} />
      </Plegable>
    </div>
  )
}

/** Kilocalorías del día frente a la referencia (cifra pautada o, sin ella, el menú del día). Solo como suelo. */
const fmtG = (n: number) => Math.round(n).toLocaleString('es-ES')
const coma = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 })

/** Lo que llevas del día, debajo de los relojes: proteína frente a la que pide el día (g/kg × peso deseado) y,
 *  debajo, las kilocalorías frente a la referencia. Las dos son un suelo que alcanzar, nunca un tope. */
function Balance({ cfg, pr, kc, esHoy }: { cfg: NutriCfg; pr: ReturnType<typeof protDia>; kc: ReturnType<typeof kcalDia>; esHoy: boolean }) {
  const obj = protObjetivo(cfg)
  const pct = obj ? Math.min(1, pr.comida / obj) : 0
  const llega = obj != null && pr.comida >= obj
  const refK = kc.referencia == null ? null : esHoy ? kc.referenciaHasta : kc.referencia
  const pctK = refK ? Math.min(1, kc.comido / refK) : 0
  return (
    <div className="card nutri-balance">
      <div className="row between">
        <strong>Proteína del día</strong>
        <span className="vaso-total"><strong>{fmtG(pr.comida)} g</strong>{obj ? <> de {obj} g</> : null}</span>
      </div>
      {obj ? (
        <>
          <div className="barra"><i className={llega ? 'verde' : 'amarillo'} style={{ width: Math.round(pct * 100) + '%' }} /></div>
          <div className="muted small">
            {llega ? 'Llegas a lo que pide el día.' : <>Te faltan unos <strong>{fmtG(obj - pr.comida)} g</strong>.</>}{' '}
            Meta: {coma(cfg.proteina!.g_kg!)} g por kilo de {coma(cfg.proteina!.peso_kg!)} kg.
            {pr.sinDato.length > 0 && <> Sin contar: {pr.sinDato.join(', ').toLowerCase()}.</>}
          </div>
        </>
      ) : <div className="muted small">Pon tu meta de proteína (gramos por kilo y peso deseado) en «Mis horarios y reglas».</div>}

      {kc.referencia != null && (
        <>
          <div className="row between" style={{ marginTop: '.7rem' }}>
            <strong>Kilocalorías</strong>
            <span className="vaso-total"><strong>{fmtKcal(kc.comido)}</strong>{refK ? <> de {fmtKcal(refK)}</> : null}</span>
          </div>
          {refK ? <div className="barra"><i className={kc.comido >= refK * (RANGO_POR_DEFECTO / 100) ? 'verde' : 'amarillo'} style={{ width: Math.round(pctK * 100) + '%' }} /></div> : null}
          <Kcal kc={kc} esHoy={esHoy} />
        </>
      )}
    </div>
  )
}

function Kcal({ kc, esHoy }: { kc: ReturnType<typeof kcalDia>; esHoy: boolean }) {
  if (kc.referencia == null) return null
  const ref = esHoy ? kc.referenciaHasta : kc.referencia
  const de = kc.deMenu ? 'del menú' : 'pautadas'
  const ok = ref != null && ref > 0 && kc.comido >= ref * (RANGO_POR_DEFECTO / 100)
  return (
    <div className="small nutri-kcal">
      <span className={'dot ' + (ref == null || ref === 0 ? '' : ok ? 'verde' : 'amarillo')} />
      Unas <strong>{fmtKcal(kc.comido)} kcal</strong>
      {esHoy && ref != null && ref > 0 ? <> de {fmtKcal(ref)} previstas hasta ahora</> : <> de {fmtKcal(kc.referencia)} {de}</>}
      {esHoy && <span className="muted"> · día entero: {fmtKcal(kc.referencia)} {de}</span>}
      {kc.sinDato.length > 0 && <span className="muted"> · sin contar: {kc.sinDato.join(', ').toLowerCase()}</span>}
      {kc.enParte.length > 0 && <span className="muted"> · en parte: {kc.enParte.join(', ').toLowerCase()}</span>}
    </div>
  )
}

/** Ficha de una toma: lo que tocaba, los cuatro toques y el bloque de horas. */
function Ficha({ t, x, cfg, hidra, tocaba, pendiente, esHoy, marcar, poner }: {
  t: TomaDef; x?: TomaDia; cfg: NutriCfg; hidra: HidraDia | null; tocaba: PlatoHoy[]; pendiente: boolean; esHoy: boolean
  marcar: (e: Estado) => void; poner: (p: TomaDia) => void
}) {
  const e = x?.estado ?? null
  const agua = t.principal && hecha(x) ? aguaDe(cfg, x, hidra) : null
  const prevista = t.hora ? (t.hasta ? `${t.hora}–${t.hasta}` : `sobre las ${t.hora}`) : ''
  return (
    <div className={'card nutri-toma ' + (e ?? (anotada(x) ? 'anotada' : '')) + (pendiente ? ' pendiente-hora' : '')}>
      <div className="row between">
        <h3>{t.nombre} {prevista && <span className="muted small">· {prevista}</span>}</h3>
        {pendiente && <span className="tag rojo">Pendiente</span>}
        {e === 'no' && <span className="tag rojo">No hecha</span>}
        {e === 'media' && <span className="tag ambar">Media</span>}
        {e === 'tres_cuartos' && <span className="tag verde">¾</span>}
        {(e === 'entera' || e === 'hecha') && <span className="tag verde">Hecha</span>}
        {anotada(x) && <span className="tag verde">Anotada</span>}
      </div>
      {tocaba.length > 0
        ? (
          <ul className={'nutri-platos' + (x?.otro?.trim() ? ' sustituido' : '')}>
            {tocaba.map((p, i) => {
              const esPostre = !!t.postre && i > 0 && e !== 'no'
              const v = x?.postre?.[p.id] ?? null
              const txt = v === 'si' ? 'tomado' : v === 'no' ? 'no tomado' : 'sin marcar'
              return (
                <li key={p.id} className={esPostre ? 'postre' : ''}>
                  <span>{p.nombre}{cfg.platos?.[p.id]?.kcal != null && <span className="muted small"> · {fmtKcal(cfg.platos[p.id].kcal!)} kcal</span>}</span>
                  {esPostre && (
                    <button type="button" className={'tri sm ' + (v ?? 'vacio')} title={`Postre ${txt} · toca para cambiar`} aria-label={`${p.nombre}: ${txt}`}
                      onClick={() => poner({ postre: { ...(x?.postre ?? {}), [p.id]: v === null ? 'si' : v === 'si' ? 'no' : null } })}>
                      {v === 'si' ? '✓' : v === 'no' ? '✗' : '○'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )
        : <p className="muted small">Sin plato en el menú de hoy.</p>}
      {e !== 'no' && (
        <label className="nutri-otro">
          <span className="muted small">Otro</span>
          <input type="text" aria-label={`Otra cosa en ${t.nombre}`} placeholder="Lo que has tomado: salmón, patata, brócoli…" value={x?.otro ?? ''} onChange={(ev) => poner({ otro: ev.target.value || null })} />
        </label>
      )}
      {e !== 'no' && x?.otro?.trim() && <OtroKcal o={kcalOtro(t, x, modeloDe(cfg, x))} conPlato={!!t.plato} />}
      <div className="seg" role="group" aria-label={`Cómo ha ido: ${t.nombre}`}>
        {(t.plato && e && e !== 'hecha' && e !== 'no' ? [...estadosDe(t), [e, e === 'media' ? 'Media' : e === 'tres_cuartos' ? '¾' : 'Entera'] as const] : estadosDe(t)).map(([k, l]) => <button type="button" key={k} className={(e === k ? 'on ' : '') + 'e-' + k} aria-pressed={e === k} aria-label={k === 'tres_cuartos' ? 'Tres cuartos' : l} onClick={() => marcar(k)}>{l}</button>)}
      </div>
      {t.plato && e !== 'no' && (
        <>
          <Plato modelo={modeloDe(cfg, x)} veg={x?.plato?.veg} prot={x?.plato?.prot} hid={x?.plato?.hid} onChange={(p) => poner({ plato: { ...(x?.plato ?? {}), ...p, modelo: modeloDe(cfg, x) } })} />
          {platoMarcado(x) && modeloDe(cfg, x) !== (cfg.plato_modelo ?? 'verdura') && (
            <p className="small muted nutri-plato-kcal">
              Esta toma se marcó con el plato de {modeloDe(cfg, x) === 'hidratos' ? '½ hidratos' : '½ verduras'}.{' '}
              <button type="button" className="linkbtn" onClick={() => poner({ plato: { ...(x?.plato ?? {}), modelo: cfg.plato_modelo ?? 'verdura' } })}>
                Pasarla al plato de {(cfg.plato_modelo ?? 'verdura') === 'hidratos' ? '½ hidratos' : '½ verduras'}
              </button>
            </p>
          )}
        </>
      )}
      {t.plato && e === 'hecha' && !x?.otro?.trim() && tocaba[0] && cfg.platos?.[tocaba[0].id]?.kcal != null && (
        <p className="small muted nutri-plato-kcal">
          {x?.plato && Object.values(x.plato).some((v) => v != null)
            ? <>Según tu plato, {tocaba[0].nombre.toLowerCase()} cuenta unas <strong>{fmtKcal(kcalConPlato(cfg, tocaba[0].id, x) ?? 0)} kcal</strong> de {fmtKcal(cfg.platos[tocaba[0].id].kcal!)}.</>
            : <>Sin marcar el plato, cuenta entero ({fmtKcal(cfg.platos[tocaba[0].id].kcal!)} kcal). Toca cada parte si comiste menos o más.</>}
        </p>
      )}
      {e !== 'no' && (
        <div className="nutri-horas">
          <Hora label={t.principal ? 'Empiezo' : 'Hora'} nombre={t.nombre} value={x?.ini} esHoy={esHoy} onChange={(v) => poner({ ini: v })} />
          {t.principal && <Hora label="Termino" nombre={t.nombre} value={x?.fin} esHoy={esHoy} onChange={(v) => poner({ fin: v })} />}
        </div>
      )}
      {agua && (
        <div className="small nutri-agua">
          <span className={'dot ' + (agua.dentro.length ? 'amarillo' : 'verde')} />
          {agua.dentro.length
            ? <>Agua pegada a esta comida ({agua.dentro.join(', ')}). Franja sin agua: de {agua.desde} a {agua.hasta}.</>
            : <>Sin agua de {agua.desde} a {agua.hasta}.</>}
        </div>
      )}
    </div>
  )
}

const FRACCION: { [k: number]: string } = { 0: 'nada', 0.5: '½', 0.75: '¾', 1.5: '1½' }
const fraccion = (n: number) => FRACCION[n] ?? String(n).replace('.', ',')

/** Lo que se cuenta de lo escrito en «Otro»: cada alimento con su ración y la parte que se toma. */
function OtroKcal({ o, conPlato }: { o: ReturnType<typeof kcalOtro>; conPlato: boolean }) {
  if (!o.items.length) {
    return <p className="small nutri-otro-kcal"><span className="dot amarillo" />No reconozco ningún alimento: esta toma no cuenta en las kilocalorías. Escríbelo con otras palabras, separando con comas.</p>
  }
  return (
    <div className="small nutri-otro-kcal">
      <ul>
        {o.items.map((i, k) => (
          <li key={k}>
            <span>
              {i.alimento.nombre}
              <span className="muted"> · {i.piezas ?? (i.unidades !== 1 ? `${fraccion(i.unidades)} × ${i.alimento.u}` : i.alimento.u)}
                {i.factor !== 1 && <> · {fraccion(i.factor)} {i.segun === 'plato' ? 'según el plato' : 'según lo marcado'}</>}</span>
            </span>
            <span className="nowrap">{fmtKcal(i.kcalContadas)} kcal</span>
          </li>
        ))}
      </ul>
      <div className="row between"><strong>Cuenta unas {fmtKcal(o.total)} kcal</strong></div>
      {o.sinReconocer.length > 0 && <div className="muted">No reconozco: {o.sinReconocer.map((w) => `«${w}»`).join(', ')}. No suma; prueba con otra palabra.</div>}
      {conPlato && <div className="muted">Verdura, proteína e hidratos cuentan la cantidad que marques en el plato.</div>}
    </div>
  )
}

function Hora({ label, nombre, value, esHoy, onChange }: { label: string; nombre: string; value?: string | null; esHoy: boolean; onChange: (v: string | null) => void }) {
  return (
    <label className="nutri-hora">
      <span className="muted small">{label}</span>
      <input type="time" aria-label={`${label}: ${nombre}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      {esHoy && !value && <button type="button" className="btn sm secondary" onClick={() => onChange(nowHM())}>Ahora</button>}
    </label>
  )
}

/** El menú entero, como en la hoja de cálculo: tomas en filas y días en columnas. */
function TablaMenu({ cfg, id, hoyIdx }: { cfg: NutriCfg; id: MenuId; hoyIdx: number }) {
  const m = cfg.menus![id]!
  const nombre = (r: string | { id: string; semana?: number }) => {
    const pid = typeof r === 'string' ? r : r.id
    return (cfg.platos?.[pid]?.nombre ?? pid) + (typeof r !== 'string' && r.semana ? ` (semana ${r.semana})` : '')
  }
  return (
    <div className="table-wrap">
      <table className="table nutri-menu">
        <thead><tr><th>Toma</th>{m.dias.map((_, i) => <th key={i} className={i === hoyIdx ? 'hoy' : ''}>{m.tipo === 'semana' ? DIAS[i % 7] : `Día ${i + 1}`}</th>)}</tr></thead>
        <tbody>
          {tomasDe(cfg).map((t) => (
            <tr key={t.id}>
              <td><strong>{t.nombre}</strong></td>
              {m.dias.map((dia, i) => <td key={i} className={i === hoyIdx ? 'hoy' : ''}>{(dia[t.id] ?? []).map((r) => <div key={nombre(r)}>{nombre(r)}</div>)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {m.tipo === 'fase' && <p className="muted small">Los días se cuentan desde el día siguiente a la ovulación.</p>}
    </div>
  )
}

/** Pegar el texto de configuración (menús, platos, horarios). Lo que ya esté registrado se conserva. */
function Cargador({ guardar }: { guardar: (p: Partial<NutriCfg>) => Promise<void> }) {
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')
  const cargar = async () => {
    const nuevo = leerCfg(texto)
    if (!nuevo) { setAviso('El texto no es una configuración válida. No se ha cambiado nada.'); return }
    try { await guardar(nuevo); setTexto(''); setAviso('Menús cargados.') } catch { setAviso('No se ha podido guardar. Revisa la conexión y vuelve a pulsar.') }
  }
  return (
    <>
      <textarea aria-label="Texto de configuración de Nutrición" placeholder="Pega aquí el texto de tus menús" value={texto} onChange={(e) => { setTexto(e.target.value); setAviso('') }} />
      <button type="button" className="btn secondary" disabled={!texto.trim()} onClick={() => void cargar()}>Cargar</button>
      {aviso && <p role="status" className="small">{aviso}</p>}
    </>
  )
}

function Vacio({ guardar }: { guardar: (p: Partial<NutriCfg>) => Promise<void> }) {
  return (
    <div className="card">
      <p>Todavía no hay menús ni tomas en tu cuenta.</p>
      <p className="muted small">Se cargan con un enlace o pegando aquí el texto de configuración. Viven en tu cuenta, no en la app.</p>
      <Cargador guardar={guardar} />
    </div>
  )
}
