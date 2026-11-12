/** Signos y síntomas: forma de los datos y cálculos. En el código solo van grupos neutros de
 *  partida; los grupos y opciones propios de cada usuaria viven en sus ajustes. */

export type Opcion = { id: string; nombre: string }
/**
 * 'una': se elige una opción · 'varias': las que hagan falta · 'detalle': varias, y cada una
 * marcada pide hora, gravedad y si hubo ingreso en urgencias, con uno o más episodios al día · 'hambre', 'heces', 'micciones':
 * bloques fijos · 'texto': texto libre · 'escala': un número de 0 a 10.
 */
export type TipoGrupo = 'una' | 'varias' | 'detalle' | 'escala' | 'hambre' | 'heces' | 'micciones' | 'texto'
export const CON_OPCIONES: TipoGrupo[] = ['una', 'varias', 'detalle']
export const conOpciones = (t: TipoGrupo) => CON_OPCIONES.includes(t)
export type Grupo = {
  id: string
  nombre: string
  tipo: TipoGrupo
  opciones?: Opcion[]
  /** En grupos 'varias': la primera opción significa «nada» y quita las demás. */
  neutra?: boolean
  /** En grupos 'una' y 'varias': además de las opciones, una escala de 0 a 10 debajo. */
  con_escala?: boolean
  /** En grupos con escala: qué significan el 0 y el 10. */
  min_txt?: string
  max_txt?: string
  /** Pantalla en la que sale el grupo. Sin decir nada, los grupos 'detalle' van a Disautonomía y el resto a Ciclo menstrual. */
  pagina?: Pagina
}
export type Pagina = 'disautonomia' | 'ciclo'
export const PAGINAS: [Pagina, string][] = [['disautonomia', 'Disautonomía'], ['ciclo', 'Ciclo menstrual']]
export const paginaDe = (g: Grupo): Pagina => g.pagina ?? (g.tipo === 'detalle' ? 'disautonomia' : 'ciclo')
export const gruposDePagina = (gs: Grupo[], p: Pagina) => gs.filter((g) => paginaDe(g) === p)
export type SintCfg = {
  grupos?: Grupo[]
  /** Botones rápidos de «Qué hice» en cada episodio (lo que se tomó o se hizo). Viven en los ajustes de cada usuaria. */
  acciones?: string[]
}

export type Detalle = {
  hora?: string | null
  gravedad?: number | null
  urgencias?: boolean | null
  /** Qué hice: botones rápidos marcados (por nombre, tal como están en los ajustes). */
  acciones?: string[] | null
  /** Qué hice, con mis palabras. */
  hice?: string | null
}

/** Una toma de constantes a una hora. Todos los campos son opcionales: se anota lo que se haya medido. */
export type Medida = {
  hora?: string | null
  /** Frecuencia cardíaca, latidos por minuto. */
  fc?: number | null
  /** Tensión arterial sistólica y diastólica, mmHg. */
  pas?: number | null
  pad?: number | null
  /** Glucosa capilar, mg/dl. */
  glucosa?: number | null
  /** Saturación de oxígeno, %. */
  spo2?: number | null
  posicion?: Posicion | null
  /** Habitual (los controles de cada día), durante un episodio o postprandial. */
  tipo?: TipoMedida | null
  /** Hidratación antes de medir: sin hidratar todavía o ya hidratada. */
  hidratacion?: Hidratacion | null
  /** Constantes que se intentaron y no se pudieron medir. */
  no_medible?: CampoMedida[] | null
  /** El tensiómetro no capta la tensión porque está muy baja (es un hallazgo, no una toma que falte). */
  ta_no_capta?: boolean | null
  /** Nota libre (solo días anteriores a la 0.19.0). */
  nota?: string | null
  /** Toma que empezó como rato de pulso alto del anillo Oura y se completó a mano. */
  de_oura?: boolean | null
}
export type CampoMedida = 'fc' | 'ta' | 'glucosa' | 'spo2'
export type TipoMedida = 'habitual' | 'episodio' | 'postprandial'
export const TIPOS_MEDIDA: [TipoMedida, string][] = [['habitual', 'Medición habitual'], ['episodio', 'Durante el episodio'], ['postprandial', 'Postprandial']]
export type Posicion = 'tumbada' | 'sentada' | 'de_pie' | 'caminando'
export const POSICIONES: [Posicion, string][] = [['tumbada', 'Tumbada'], ['sentada', 'Sentada'], ['de_pie', 'De pie'], ['caminando', 'Caminando']]
export type Hidratacion = 'sin' | 'con'
export const HIDRATACIONES: [Hidratacion, string][] = [['sin', 'Sin hidratar'], ['con', 'Con hidratación']]
/** Valores fuera de los rangos de referencia generales del adulto, para resaltarlos (no son un diagnóstico). */
export function avisosMedida(m: Medida): string[] {
  const out: string[] = []
  if (m.ta_no_capta) out.push('Tensión tan baja que no se capta')
  if ((m.pas != null && m.pas < 90) || (m.pad != null && m.pad < 60)) out.push('Tensión baja')
  if (m.pas != null && m.pas >= 140) out.push('Tensión alta')
  if (m.fc != null && m.fc > 100) out.push('Taquicardia')
  if (m.fc != null && m.fc < 50) out.push('Bradicardia')
  if (m.spo2 != null && m.spo2 < 95) out.push('Saturación baja')
  if (m.glucosa != null && m.glucosa < 70) out.push('Glucosa baja')
  if (m.glucosa != null && m.glucosa > 140) out.push('Glucosa alta')
  return out
}
/** Constantes de una toma en una línea: «FC 108 lpm · TA 97/79 mmHg · Glucosa 85 mg/dl · SatO₂ 98 % · de pie». */
export function lineaMedida(m: Medida) {
  const no = (c: CampoMedida) => (m.no_medible ?? []).includes(c)
  const partes = [
    m.tipo && TIPOS_MEDIDA.find(([k]) => k === m.tipo)?.[1],
    m.fc != null ? `FC ${m.fc} lpm` : no('fc') && 'FC no medible',
    m.pas != null || m.pad != null ? `TA ${m.pas ?? '—'}/${m.pad ?? '—'} mmHg` : m.ta_no_capta ? 'TA indetectable (el tensiómetro no la capta, muy baja)' : no('ta') && 'TA no medible',
    m.glucosa != null ? `Glucosa ${m.glucosa} mg/dl` : no('glucosa') && 'glucosa no medible',
    m.spo2 != null ? `SatO₂ ${m.spo2} %` : no('spo2') && 'SatO₂ no medible',
    m.posicion && POSICIONES.find(([k]) => k === m.posicion)?.[1].toLowerCase(),
    m.hidratacion && HIDRATACIONES.find(([k]) => k === m.hidratacion)?.[1].toLowerCase(),
  ].filter(Boolean)
  return partes.join(' · ')
}
/** Episodios de una opción en un día. Hasta la 0.13.5 se guardaba uno solo (objeto); desde la 0.13.6, una lista. */
export type DetOpcion = Detalle | Detalle[]
/** Lee los episodios de una opción, se guardaran con la forma antigua o con la nueva. */
export function episodiosOpcion(x: DetOpcion | null | undefined): Detalle[] {
  return x == null ? [] : Array.isArray(x) ? x : [x]
}
export type Deposicion = { bristol?: number | null; color?: string | null; restos?: boolean | null; flotan?: boolean | null; brillo?: boolean | null; sangre?: boolean | null }
export const COMIDAS = [['de', 'Desayuno'], ['co', 'Comida'], ['ce', 'Cena']] as const
export type Comida = (typeof COMIDAS)[number][0]

export type SintDia = {
  /** Opciones marcadas de cada grupo, por id. */
  sel?: { [grupo: string]: string[] }
  /** Hora, gravedad y urgencias de cada episodio de las opciones marcadas en los grupos 'detalle'
   *  (una misma opción puede repetirse en el día: después de comer y en la cena, por ejemplo). */
  det?: { [grupo: string]: { [opcion: string]: DetOpcion } }
  /** Hambre de 0 a 10 antes de desayuno, comida y cena. */
  hambre?: { [k in Comida]?: number | null }
  sin_hambre?: boolean | null
  /** Una entrada por deposición. `sin_heces` = hoy no ha habido. */
  heces?: Deposicion[]
  sin_heces?: boolean | null
  micciones?: number | null
  /** Color de la orina, de 1 (transparente) a 6 (marrón o rojizo). */
  orina_color?: number | null
  orina_olor?: boolean | null
  /** Valor de 0 a 10 de los grupos 'escala'. */
  escala?: { [grupo: string]: number | null }
  /** Texto libre de los grupos 'texto'. */
  texto?: { [grupo: string]: string }
  /** Tomas de constantes del día (frecuencia cardíaca, tensión, glucosa, saturación), cada una con su hora. */
  constantes?: Medida[]
}

const op = (...nombres: string[]): Opcion[] => nombres.map((n) => ({ id: slug(n), nombre: n }))
export function slug(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x'
}
/** Id nuevo a partir de un nombre, sin repetir ninguno de `usados`. */
export function idLibre(nombre: string, usados: string[]) {
  const base = slug(nombre)
  let id = base
  for (let i = 2; usados.includes(id); i++) id = base + '_' + i
  return id
}

/** Grupos de partida, mientras la usuaria no guarde los suyos. */
export const GRUPOS_BASE: Grupo[] = [
  { id: 'digestion', nombre: 'Digestión', tipo: 'varias', neutra: true, opciones: op('Ok', 'Dolor de estómago', 'Náuseas', 'Hinchazón', 'Gases') },
  { id: 'hambre', nombre: 'Hambre', tipo: 'hambre' },
  { id: 'heces', nombre: 'Heces', tipo: 'heces' },
  { id: 'micciones', nombre: 'Micciones', tipo: 'micciones' },
  { id: 'dolor', nombre: 'Dolor', tipo: 'varias', neutra: true, opciones: op('Sin dolor', 'Cólicos', 'Ovulación', 'Sensibilidad en los senos', 'Cabeza', 'Lumbares') },
  { id: 'energia', nombre: 'Energía', tipo: 'una', opciones: op('Agotamiento', 'Cansancio', 'Ni fu ni fa', 'Ok', 'Enérgica', 'Alto rendimiento') },
  { id: 'secrecion', nombre: 'Secreción', tipo: 'una', opciones: op('Ninguna', 'Pegajosa', 'Cremosa', 'Clara de huevo', 'Atípica') },
  { id: 'piel', nombre: 'Piel', tipo: 'varias', neutra: true, opciones: op('Buena', 'Acné', 'Seca', 'Grasa', 'Con comezón') },
  { id: 'cabello', nombre: 'Cabello', tipo: 'varias', neutra: true, opciones: op('Normal', 'Bonito', 'Seco', 'Encrespado', 'Con caída', 'Cuero cabelludo graso', 'Cuero cabelludo seco') },
  { id: 'otros', nombre: 'Otros signos y síntomas', tipo: 'texto' },
]
/** ¿Lleva el grupo una escala de 0 a 10 (sola o debajo de sus opciones)? */
export const tieneEscala = (g: Grupo) => g.tipo === 'escala' || ((g.tipo === 'una' || g.tipo === 'varias') && !!g.con_escala)
export const gruposDe = (c: SintCfg | null) => c?.grupos ?? GRUPOS_BASE

/** Marca o desmarca una opción respetando el tipo del grupo y su opción neutra. */
export function alternar(g: Grupo, actuales: string[], id: string): string[] {
  if (actuales.includes(id)) return actuales.filter((x) => x !== id)
  if (g.tipo === 'una') return [id]
  const neutra = g.tipo === 'varias' && g.neutra ? g.opciones?.[0]?.id : undefined
  if (id === neutra) return [id]
  return [...actuales.filter((x) => x !== neutra), id]
}

export const BRISTOL = ['', 'Bolas duras separadas (estreñimiento)', 'Salchicha grumosa', 'Salchicha con grietas', 'Salchicha lisa y blanda (ideal)', 'Trozos blandos con bordes definidos', 'Pastosa, bordes irregulares', 'Líquida, sin trozos (diarrea)']
export const HECES_COLORES = [['marron', 'Marrón'], ['amarillento', 'Amarillento'], ['verdoso', 'Verdoso'], ['palido', 'Pálido'], ['negro', 'Muy oscuro o negro']] as const
export const HECES_MARCAS = [['flotan', 'Flotantes'], ['brillo', 'Brillantes'], ['restos', 'Restos de comida'], ['sangre', 'Con presencia de sangre']] as const
export const ORINA_COLORES = ['#f7f6ee', '#f6efb8', '#f1df6e', '#e6c53a', '#c9962a', '#9c4a24']
export const ORINA_NOMBRES = ['Transparente', 'Muy claro', 'Amarillo', 'Amarillo oscuro', 'Ámbar', 'Marrón / rojizo']

/** ¿Está respondido el grupo? `null` = no pide respuesta diaria (solo se marca si pasa algo). */
export function respondido(g: Grupo, d: SintDia): boolean | null {
  switch (g.tipo) {
    case 'una': return (d.sel?.[g.id]?.length ?? 0) > 0 || (!!g.con_escala && d.escala?.[g.id] != null)
    case 'escala': return d.escala?.[g.id] != null
    case 'varias': return g.neutra ? (d.sel?.[g.id]?.length ?? 0) > 0 : null
    case 'hambre': return !!d.sin_hambre || COMIDAS.every(([k]) => d.hambre?.[k] != null)
    case 'heces': return !!d.sin_heces || (d.heces?.length ?? 0) > 0
    case 'micciones': return d.micciones != null || d.orina_color != null
    default: return null
  }
}

/** Apartados respondidos sobre los que piden respuesta cada día. */
export function cumplimiento(grupos: Grupo[], d: SintDia) {
  const partes = grupos.map((g) => [g.nombre, respondido(g, d)] as const).filter((p): p is readonly [string, boolean] => p[1] !== null)
  const hechos = partes.filter(([, ok]) => ok).length
  return { hechos, total: partes.length, faltan: partes.filter(([, ok]) => !ok).map(([n]) => n), pct: partes.length ? hechos / partes.length : 0 }
}
export const nivel = (pct: number) => (pct >= 0.9 ? 'verde' : pct >= 0.5 ? 'amarillo' : 'rojo') as 'verde' | 'amarillo' | 'rojo'

const TIPOS: TipoGrupo[] = ['una', 'varias', 'detalle', 'escala', 'hambre', 'heces', 'micciones', 'texto']
/** Comprueba una configuración pegada a mano y la deja limpia. `null` si no vale. */
export function leerGrupos(texto: string): Grupo[] | null {
  let x: unknown
  try { x = JSON.parse(texto) } catch { return null }
  const lista = Array.isArray(x) ? x : (x as { grupos?: unknown } | null)?.grupos
  if (!Array.isArray(lista) || !lista.length) return null
  const out: Grupo[] = []
  for (const g of lista as { id?: unknown; nombre?: unknown; tipo?: unknown; neutra?: unknown; opciones?: unknown; min_txt?: unknown; max_txt?: unknown; con_escala?: unknown; pagina?: unknown }[]) {
    if (!g || typeof g.nombre !== 'string' || !g.nombre.trim()) return null
    const tipo: TipoGrupo = TIPOS.includes(g.tipo as TipoGrupo) ? (g.tipo as TipoGrupo) : 'varias'
    const id = typeof g.id === 'string' && g.id ? g.id : idLibre(g.nombre, out.map((o) => o.id))
    if (out.some((o) => o.id === id)) return null
    const opciones: Opcion[] = []
    for (const o of Array.isArray(g.opciones) ? (g.opciones as unknown[]) : []) {
      const nombre = typeof o === 'string' ? o : (o as { nombre?: unknown } | null)?.nombre
      if (typeof nombre !== 'string' || !nombre.trim()) return null
      const oid = typeof o === 'object' && o && typeof (o as { id?: unknown }).id === 'string' ? (o as { id: string }).id : idLibre(nombre, opciones.map((p) => p.id))
      opciones.push({ id: oid, nombre: nombre.trim() })
    }
    if (conOpciones(tipo) && !opciones.length) return null
    const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    const mixto = (tipo === 'una' || tipo === 'varias') && !!g.con_escala
    const extremos = tipo === 'escala' || mixto ? { ...(mixto ? { con_escala: true } : {}), ...(txt(g.min_txt) ? { min_txt: txt(g.min_txt) } : {}), ...(txt(g.max_txt) ? { max_txt: txt(g.max_txt) } : {}) } : {}
    // Una escala conserva las opciones que tuvo el grupo: así lo ya registrado con ellas se sigue leyendo.
    out.push({ id, nombre: g.nombre.trim(), tipo, ...(conOpciones(tipo) || (tipo === 'escala' && opciones.length) ? { opciones } : {}), ...(tipo === 'varias' && g.neutra ? { neutra: true } : {}), ...extremos, ...(PAGINAS.some(([k]) => k === g.pagina) ? { pagina: g.pagina as Pagina } : {}) })
  }
  return out
}

/** Nombre legible de una opción que ya no está en los grupos (se quitó): «taquicardia_en_reposo» → «Taquicardia en reposo». */
export const nombreDeId = (id: string) => { const t = id.replace(/_\d+$/, '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1) }

export type Episodio = { dia: string; hora: string; grupo: string; nombre: string; gravedad: number | null; urgencias: boolean; acciones: string[]; hice: string }
/** Episodios anotados (opciones marcadas en los grupos 'detalle', como Disautonomía), en orden. */
export function episodiosDe(grupos: Grupo[], dias: { day: string; value: SintDia }[]): Episodio[] {
  return grupos.filter((g) => g.tipo === 'detalle').flatMap((g) =>
    dias.flatMap((d) => (d.value.sel?.[g.id] ?? []).flatMap((id) => {
      const xs = episodiosOpcion(d.value.det?.[g.id]?.[id])
      const nombre = g.opciones?.find((o) => o.id === id)?.nombre ?? nombreDeId(id)
      // Una opción marcada sin detalle cuenta como un episodio.
      return (xs.length ? xs : [{} as Detalle]).map((det) => ({ dia: d.day, hora: det.hora ?? '', grupo: g.nombre, nombre, gravedad: det.gravedad ?? null, urgencias: !!det.urgencias, acciones: det.acciones ?? [], hice: det.hice ?? '' }))
    })),
  ).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora))
}

/** Sigla de un tipo de episodio para el calendario: las iniciales de sus palabras, sin las de enlace ni lo
 *  que va entre comillas. «Disautonomía nocturna» → DN; «Ansiedad «chunguera»» → A; «Taquicardia en reposo» → TR. */
export function sigla(nombre: string) {
  const w = nombre.replace(/[«"“][^»"”]*[»"”]/g, ' ').split(/[\s()/,-]+/).filter((x) => x && !ENLACE.has(x.toLowerCase()))
  return (w.map((x) => x[0]).join('') || nombre.slice(0, 1)).toUpperCase().slice(0, 3)
}
const ENLACE = new Set(['de', 'del', 'en', 'el', 'la', 'los', 'las', 'y', 'con', 'sin', 'a', 'al', 'por', 'tras'])

/** Resumen de los episodios de un día: sus siglas (sin repetir), la gravedad más alta y si alguno acabó en ingreso. */
export function marcaDia(xs: Episodio[]) {
  const gs = xs.map((e) => e.gravedad).filter((g): g is number => g != null)
  return {
    n: xs.length,
    siglas: [...new Set(xs.map((e) => sigla(e.nombre)))],
    nombres: [...new Set(xs.map((e) => e.nombre))],
    gravedad: gs.length ? Math.max(...gs) : null,
    ingreso: xs.some((e) => e.urgencias),
  }
}
