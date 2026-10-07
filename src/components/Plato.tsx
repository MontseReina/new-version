/** Plato dibujado para valorar una comida, traído de Huma: mitad verdura, un cuarto proteína y un
 *  cuarto hidratos. Cada parte se toca para ir llenándola: sin marcar → poca → la que toca
 *  (hidratos: poco → un cuarto → más de un cuarto). Comer más hidrato no lleva ningún aviso. */
type Nivel = number | null | undefined

const CX = 100
const CY = 100
const R = 88

function pt(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}
/** Sector entre dos ángulos (0° = arriba, sentido horario). */
function sector(r: number, a0: number, a1: number) {
  const [x0, y0] = pt(r, a0)
  const [x1, y1] = pt(r, a1)
  return `M${CX} ${CY} L${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`
}

type Clave = 'veg' | 'prot' | 'hid'
interface Parte { key: Clave; label: string; emoji: string; target: string; color: string; a0: number; a1: number; levels: string[] }

const PARTES: Parte[] = [
  { key: 'veg', label: 'Verdura', emoji: '🥦', target: '½', color: 'var(--plato-verdura)', a0: 0, a1: 180, levels: ['nada', 'poca', '≈ ½ plato'] },
  { key: 'prot', label: 'Proteína', emoji: '🐟', target: '¼', color: 'var(--plato-proteina)', a0: 180, a1: 270, levels: ['nada', 'poca', '≈ ¼ plato'] },
  { key: 'hid', label: 'Hidratos', emoji: '🍠', target: '¼', color: 'var(--plato-hidrato)', a0: 270, a1: 360, levels: ['nada', 'poco', '≈ ¼ plato', 'más de ¼'] },
]

export function Plato({ veg, prot, hid, onChange }: { veg: Nivel; prot: Nivel; hid: Nivel; onChange: (patch: { [k in Clave]?: number }) => void }) {
  const valores: Record<Clave, Nivel> = { veg, prot, hid }
  const siguiente = (p: Parte) => {
    const v = valores[p.key]
    onChange({ [p.key]: v == null ? 1 : (v + 1) % p.levels.length })
  }
  return (
    <div className="plato">
      <svg viewBox="0 0 200 200" role="group" aria-label="Plato: toca cada parte para llenarla">
        <circle className="plato-borde" cx={CX} cy={CY} r={R + 9} />
        {PARTES.map((p) => {
          const v = valores[p.key]
          // Relleno: poca = hasta algo más de la mitad del radio; la que toca o más = entero.
          const fillR = v == null || v === 0 ? 0 : v === 1 ? R * 0.55 : R
          const [lx, ly] = pt(R * 0.58, (p.a0 + p.a1) / 2)
          return (
            <g key={p.key} className="plato-part" role="button" tabIndex={0}
              aria-label={`${p.label}: ${v == null ? 'sin marcar' : p.levels[v]}. Tocar para cambiar`}
              onClick={() => siguiente(p)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); siguiente(p) } }}>
              <path className="fondo" d={sector(R, p.a0, p.a1)} style={{ fill: p.color }} strokeDasharray={v == null ? '4 3' : undefined} />
              {fillR > 0 && <path d={sector(fillR, p.a0, p.a1)} style={{ fill: p.color }} fillOpacity={v === 1 ? 0.55 : 0.85} />}
              <text x={lx} y={ly - 4} textAnchor="middle" fontSize={p.key === 'veg' ? 22 : 19}>{p.emoji}</text>
              <text x={lx} y={ly + 15} textAnchor="middle" fontSize="11" fontWeight="700">{p.target}</text>
            </g>
          )
        })}
      </svg>
      <div className="plato-legend">
        {PARTES.map((p) => {
          const v = valores[p.key]
          return (
            <button type="button" key={p.key} className={'plato-chip' + (v != null && v > 0 ? ' on' : '')} onClick={() => siguiente(p)}>
              <span className="sw" style={{ background: p.color }} />
              <span><strong>{p.label}</strong> <span className="muted">({p.target})</span><br />{v == null ? 'sin marcar' : p.levels[v]}</span>
            </button>
          )
        })}
        <div className="muted small">Toca cada parte del plato para llenarla.</div>
      </div>
    </div>
  )
}
