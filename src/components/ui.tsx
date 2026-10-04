import { useEffect, useState, type ReactNode } from 'react'

/** Piezas de interfaz compartidas (mismas que en Huma). */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <div className="muted small">{hint}</div>}
    </label>
  )
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1 }: { value: number | null | undefined; onChange: (v: number | null) => void; min?: number; max?: number; step?: number }) {
  const v = value ?? null
  return (
    <div className="stepper">
      <button type="button" aria-label="Quitar uno" onClick={() => onChange(Math.max(min, (v ?? 0) - step))}>−</button>
      <input type="number" inputMode="decimal" value={v ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      <button type="button" aria-label="Añadir uno" onClick={() => onChange(Math.min(max, (v ?? 0) + step))}>+</button>
    </div>
  )
}

export function Section({ title, children, open, right }: { title: string; children: ReactNode; open?: boolean; right?: ReactNode }) {
  return (
    <details className="section" open={open}>
      <summary>
        <span>{title}</span>
        {right}
      </summary>
      <div className="body">{children}</div>
    </details>
  )
}

export function Toast({ msg }: { msg: string }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    setShow(true)
    const t = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(t)
  }, [msg])
  if (!show || !msg) return null
  return <div className="toast">{msg}</div>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
