import type { ReactNode } from 'react'

/** Iconos de los bloques de Biohacking (trazo fino, como los de Ejercicio en Huma). */
const svg = (d: ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
export const ICONO: Record<string, ReactNode> = {
  vago: svg(<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />),
  estira: svg(<><circle cx="12" cy="4" r="2" /><path d="M5 9l7-2 7 2M12 7v6l-4 7M12 13l4 7" /></>),
  luz: svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" /></>),
  sol: svg(<><path d="M3 18h18M7 18a5 5 0 0 1 10 0" /><path d="M12 7v2M5.6 10.6l1.4 1.4M18.4 10.6 17 12" /></>),
  piel: svg(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />),
  boca: svg(<path d="M4 11c3-3 13-3 16 0-2 5-14 5-16 0zM4 11h16" />),
  sales: svg(<><path d="M4 11h16l-2 8H6z" /><path d="M9 7l1 2M14 5l-1 3M17 8l-1 1" /></>),
  ricino: svg(<path d="M5 19C5 10 11 5 19 5c0 8-5 14-14 14zM5 19l7-7" />),
  otro: svg(<circle cx="12" cy="12" r="6" />),
}
