/** Emoticonos de las opciones de Dolor, por palabras clave del nombre (genéricas, sin datos personales).
 *  El primero que coincide gana; una opción sin coincidencia sale sin emoticono. */
const DOLOR: [RegExp, string][] = [
  [/sin dolor/, '😌'],
  [/migrana con aura/, '✨'],
  [/migrana/, '😵‍💫'],
  [/cabeza/, '🤕'],
  [/colico/, '🌀'],
  [/ovulacion/, '🥚'],
  [/seno|pecho|mama/, '👙'],
  [/lumbar/, '🦴'],
  [/cadera/, '💃'],
  [/pierna/, '🦵'],
  [/depo|deposicion|defeca/, '🚽'],
  [/pinchazo.*derech|derech.*pinchazo/, '👉⚡'],
  [/pinchazo.*izquierd|izquierd.*pinchazo/, '⚡👈'],
  [/pinchazo/, '⚡'],
  [/vulva/, '🌸'],
  [/ibuprofeno/, '💊'],
  [/espasmo|utero/, '💥'],
  [/molestia/, '😣'],
]
const norma = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Emoticono de una opción de un grupo de dolor; vacío en los demás grupos. */
export function emojiOpcion(grupo: { id: string; nombre: string }, opcion: string): string {
  if (!/dolor/.test(norma(grupo.id + ' ' + grupo.nombre))) return ''
  const t = norma(opcion)
  return DOLOR.find(([r]) => r.test(t))?.[1] ?? ''
}
