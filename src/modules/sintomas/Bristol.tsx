import type { ReactNode } from 'react'
import { BRISTOL } from './logica'

/** Escala de Bristol con dibujos (1 = bolas duras … 7 = líquida), igual que en Huma. */
const FORMAS: ((c: string) => ReactNode)[] = [
  (c) => <>{[8, 20, 32].map((x) => <circle key={x} cx={x} cy={14} r={5} fill={c} />)}<circle cx={14} cy={24} r={5} fill={c} /><circle cx={27} cy={25} r={5} fill={c} /></>,
  (c) => <><rect x={4} y={12} width={32} height={14} rx={7} fill={c} />{[10, 17, 24, 31].map((x) => <circle key={x} cx={x} cy={12 + (x % 2 ? 2 : 12)} r={4} fill={c} />)}</>,
  (c) => <><rect x={4} y={13} width={32} height={13} rx={6.5} fill={c} />{[11, 18, 25, 31].map((x) => <line key={x} x1={x} y1={13} x2={x} y2={19} stroke="#fff" strokeWidth={1.5} />)}</>,
  (c) => <rect x={4} y={13} width={32} height={13} rx={6.5} fill={c} />,
  (c) => <>{[[8, 14], [22, 12], [32, 22], [14, 26]].map(([x, y]) => <ellipse key={x + '-' + y} cx={x} cy={y} rx={6} ry={4.5} fill={c} />)}</>,
  (c) => <path d="M6 22c2-8 8-10 14-8s10-2 14 4c2 4-2 9-8 9s-9 3-14 1c-4-1-7-3-6-6z" fill={c} />,
  (c) => <><path d="M4 18c6-4 12 4 18 0s10-2 14 2" stroke={c} strokeWidth={5} fill="none" strokeLinecap="round" /><path d="M6 27c6-4 12 3 18-1s8-2 12 1" stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" /></>,
]

export function Bristol({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="bristol">
        {FORMAS.map((dibuja, i) => {
          const n = i + 1
          const on = value === n
          return (
            <button key={n} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => onChange(on ? null : n)} title={BRISTOL[n]} aria-label={`Bristol ${n}: ${BRISTOL[n]}`}>
              <svg viewBox="0 0 40 36" width="40" height="36" aria-hidden="true">{dibuja(on ? '#fff' : '#8a6d3b')}</svg>
              <span>{n}</span>
            </button>
          )
        })}
      </div>
      {value ? <div className="muted small">Tipo {value}: {BRISTOL[value]}</div> : null}
    </div>
  )
}
