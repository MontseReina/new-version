import { infoDia, semanasDelMes, type Mapa, type Modelo } from './logica'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Clases y descripción de un día, compartidas por el calendario y la tira de Inicio. */
export function pintaDia(mo: Modelo, m: Mapa, d: string) {
  const info = infoDia(mo, m, d)
  const reg = m[d]
  const cls = [
    reg?.regla ? 'regla ' + reg.regla : '',
    info?.reglaPrevista ? 'prevista' : '',
    info?.fertil ? 'fertil' : '',
    info?.ovulacion ? 'ovu' : '',
    info?.critica ? 'critica' : '',
    d === mo.hoy ? 'hoy' : '',
  ].filter(Boolean).join(' ')
  const txt = [
    reg?.regla ? 'regla' : '',
    reg?.manchado ? 'manchado' : '',
    info?.reglaPrevista ? 'regla prevista' : '',
    info?.ovulacion ? 'ovulación aproximada' : info?.fertil ? 'ventana fértil' : '',
    info?.critica ? 'ventana crítica' : '',
  ].filter(Boolean).join(', ')
  return { info, reg, cls, txt }
}

/** Mes del ciclo: regla registrada y prevista, ventana fértil, ovulación y ventana crítica. */
export function Calendario({ mes, modelo, mapa, sel, onSel }: { mes: string; modelo: Modelo; mapa: Mapa; sel: string; onSel: (d: string) => void }) {
  return (
    <div className="ciclo-cal" role="grid" aria-label="Calendario del ciclo">
      {DOW.map((l) => <div key={l} className="ciclo-dow" aria-hidden="true">{l}</div>)}
      {semanasDelMes(mes).map((d, i) => {
        if (!d) return <div key={i} />
        const { reg, cls, txt } = pintaDia(modelo, mapa, d)
        const n = Number(d.slice(8))
        return (
          <button type="button" key={d} className={'ciclo-celda ' + cls + (d === sel ? ' sel' : '')} aria-pressed={d === sel} aria-label={`Día ${n}${txt ? ': ' + txt : ''}`} onClick={() => onSel(d)}>
            <span>{n}</span>
            <span className="marcas" aria-hidden="true">
              {reg?.manchado && <i className={'m-man ' + reg.manchado} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Leyenda({ critica }: { critica: boolean }) {
  return (
    <div className="ciclo-ley">
      <span><i className="ciclo-celda regla moderado" /> Regla</span>
      <span><i className="ciclo-celda prevista" /> Regla prevista</span>
      <span><i className="ciclo-celda fertil" /> Ventana fértil</span>
      <span><i className="ciclo-celda ovu" /> Ovulación aprox.</span>
      {critica && <span><i className="ciclo-celda critica" /> Ventana crítica</span>}
      <span><i className="m-man rojo" /> Manchado</span>
    </div>
  )
}
