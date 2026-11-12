/** Iconos del registro de la menstruación: gotas de sangre por cantidad y punto de color del manchado. */
const Gota = ({ h }: { h: number }) => (
  <svg width={h * 0.72} height={h} viewBox="0 0 18 25" aria-hidden="true" className="gota">
    <path d="M9 1C9 1 1.5 10.5 1.5 16a7.5 7.5 0 0 0 15 0C16.5 10.5 9 1 9 1z" />
  </svg>
)

/** Ligero: gota pequeña · moderado: más grande · fuerte: mucho más grande · intenso: una grande y una pequeña. */
export function Gotas({ flujo }: { flujo: string }) {
  if (flujo === 'ligero') return <span className="gotas"><Gota h={11} /></span>
  if (flujo === 'moderado') return <span className="gotas"><Gota h={15} /></span>
  if (flujo === 'fuerte') return <span className="gotas"><Gota h={20} /></span>
  if (flujo === 'intenso') return <span className="gotas"><Gota h={20} /><Gota h={11} /></span>
  return null
}

/** Punto redondo del color del manchado. */
export const PuntoManchado = ({ color }: { color: string }) => <i className={'m-man grande ' + color} aria-hidden="true" />
