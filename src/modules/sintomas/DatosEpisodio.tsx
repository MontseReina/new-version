import { SI_NO_EPISODIO, UNIDADES, type Detalle, type Tiempo } from './logica'

type U = NonNullable<Tiempo['u']>

/** Un tiempo: número y unidad («20» + min). Sin unidad elegida cuenta como la primera de `unidades`. */
function CampoTiempo({ t, unidades, label, poner }: { t?: Tiempo | null; unidades: U[]; label: string; poner: (t: Tiempo | null) => void }) {
  const u = t?.u ?? unidades[0]
  return (
    <div className="epi-tiempo">
      <input type="number" inputMode="decimal" min={0} aria-label={label} value={t?.n ?? ''}
        onChange={(e) => poner(e.target.value === '' ? null : { n: Number(e.target.value), u })} />
      <div className="seg" role="group" aria-label={`Unidad de ${label.toLowerCase()}`}>
        {UNIDADES.filter(([k]) => unidades.includes(k)).map(([k, l]) => (
          <button type="button" key={k} className={u === k ? 'on' : ''} aria-pressed={u === k} onClick={() => poner({ n: t?.n ?? null, u: k })}>{l}</button>
        ))}
      </div>
    </div>
  )
}

/** Sí / No; tocar el marcado lo deja sin contestar. */
function SiNo({ v, label, poner }: { v?: boolean | null; label: string; poner: (v: boolean | null) => void }) {
  return (
    <div className="seg epi-sino" role="group" aria-label={label}>
      <button type="button" className={v === true ? 'on' : ''} aria-pressed={v === true} onClick={() => poner(v === true ? null : true)}>Sí</button>
      <button type="button" className={v === false ? 'on' : ''} aria-pressed={v === false} onClick={() => poner(v === false ? null : false)}>No</button>
    </div>
  )
}

/**
 * Datos de cada episodio de disautonomía: pródromo, duración (hasta recuperarse), pérdida de conocimiento (y cuánto),
 * movimientos (descarga adrenérgica), dolor de barriga, náuseas, disfagia, sudor frío y desencadenantes. Todo opcional.
 */
export function DatosEpisodio({ x, quien, poner }: { x: Detalle; quien: string; poner: (patch: Detalle) => void }) {
  return (
    <div className="epi-datos">
      <label className="epi-fila">
        <span>Pródromo</span>
        <input type="text" aria-label={`Pródromo de ${quien}`} placeholder="Qué noté antes…" value={x.prodromo ?? ''} onChange={(e) => poner({ prodromo: e.target.value || null })} />
      </label>
      <div className="epi-fila">
        <span>Duración</span>
        <CampoTiempo t={x.duracion} unidades={['min', 'h']} label={`Duración de ${quien}`} poner={(t) => poner({ duracion: t })} />
      </div>
      <div className="epi-fila">
        <span>Pérdida de conocimiento</span>
        <SiNo v={x.conocimiento} label={`Pérdida de conocimiento en ${quien}`} poner={(v) => poner({ conocimiento: v, ...(v ? {} : { conocimiento_t: null }) })} />
      </div>
      {x.conocimiento && (
        <div className="epi-fila epi-sub">
          <span>Cuánto tiempo</span>
          <CampoTiempo t={x.conocimiento_t} unidades={['seg', 'min']} label={`Tiempo sin conocimiento en ${quien}`} poner={(t) => poner({ conocimiento_t: t })} />
        </div>
      )}
      {SI_NO_EPISODIO.map(([k, l]) => (
        <div className="epi-fila" key={k}>
          <span>{l}</span>
          <SiNo v={x[k]} label={`${l} en ${quien}`} poner={(v) => poner({ [k]: v })} />
        </div>
      ))}
      <label className="field epi-desenc">
        <span>Desencadenantes</span>
        <textarea rows={2} aria-label={`Desencadenantes de ${quien}`} placeholder="Lo que creo que ha podido desencadenarlo…" value={x.desencadenantes ?? ''} onChange={(e) => poner({ desencadenantes: e.target.value || null })} />
      </label>
    </div>
  )
}
