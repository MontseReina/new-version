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
  /** Grupos de partida nuevos que ya se añadieron a sus grupos (para no volver a ponerlos si los quita). */
  extras?: string[]
}

export type Detalle = {
  hora?: string | null
  gravedad?: number | null
  urgencias?: boolean | null
  /** Qué hice: botones rápidos marcados (por nombre, tal como están en los ajustes). */
  acciones?: string[] | null
  /** Qué hice, con mis palabras. */
  hice?: string | null
  /** Datos del episodio (desde la 0.24.0). Los sí/no quedan sin contestar (null) hasta que se toca uno. */
  prodromo?: string | null
  duracion?: Tiempo | null
  conocimiento?: boolean | null
  conocimiento_t?: Tiempo | null
  movimientos?: boolean | null
  dolor_barriga?: boolean | null
  nauseas?: boolean | null
  sudor_frio?: boolean | null
  desencadenantes?: string | null
  /** Episodio terminado y plegado con «Guardar» (desde la 0.27.1); solo afecta a cómo se ve. */
  guardado?: boolean | null
  /** Otros tipos del mismo episodio, además de la opción bajo la que se guarda (desde la 0.27.2):
   *  un episodio puede ser a la vez «Mareos» y «Ansiedad», por ejemplo. */
  tipos?: string[] | null
}

/** Todos los tipos (ids) de un episodio: la opción bajo la que se guarda y los demás que lleve. */
export const tiposEpisodio = (id: string, x: Detalle) => [id, ...(x.tipos ?? []).filter((t) => t !== id)]
/** Si un día tiene algún episodio de un tipo, aunque esté guardado bajo otra opción. */
export function diaConTipo(g: Grupo, d: SintDia, id: string) {
  if (d.sel?.[g.id]?.includes(id)) return true
  return Object.values(d.det?.[g.id] ?? {}).some((x) => episodiosOpcion(x).some((e) => (e.tipos ?? []).includes(id)))
}
/** Un tiempo con su unidad, tal como se anota: «20 min», «2 h», «30 s». */
export type Tiempo = { n?: number | null; u?: 'seg' | 'min' | 'h' | null }
export const UNIDADES: ['seg' | 'min' | 'h', string][] = [['seg', 's'], ['min', 'min'], ['h', 'h']]
export const textoTiempo = (t?: Tiempo | null) => (t?.n != null ? `${t.n} ${UNIDADES.find(([k]) => k === (t.u ?? 'min'))![1]}` : '')
/** Sí/no del episodio, en el orden en que se enseñan. */
export const SI_NO_EPISODIO: ['movimientos' | 'dolor_barriga' | 'nauseas' | 'sudor_frio', string][] = [
  ['movimientos', 'Movimientos (descarga adrenérgica)'], ['dolor_barriga', 'Dolor de barriga'], ['nauseas', 'Náuseas'], ['sudor_frio', 'Sudor frío'],
]
/** Datos del episodio en una línea, para los informes. */
export function textoDetalle(x: Detalle): string {
  const sn = (v: boolean | null | undefined, l: string) => (v == null ? '' : `${l}: ${v ? 'sí' : 'no'}`)
  return [
    x.prodromo && `pródromo: ${x.prodromo}`,
    textoTiempo(x.duracion) && `duración ${textoTiempo(x.duracion)}`,
    x.conocimiento == null ? '' : x.conocimiento ? `pérdida de conocimiento${textoTiempo(x.conocimiento_t) ? ` (${textoTiempo(x.conocimiento_t)})` : ''}` : 'sin pérdida de conocimiento',
    ...SI_NO_EPISODIO.map(([k, l]) => sn(x[k], l.toLowerCase())),
    x.desencadenantes && `desencadenantes: ${x.desencadenantes}`,
  ].filter(Boolean).join(' · ')
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
  /** Tipo de medición hasta la 0.22.1 (uno solo). Desde la 0.23.0 se guarda en `tipos`; leer con `tiposDe`. */
  tipo?: TipoMedida | null
  /** Tipos de medición de la toma (desde la 0.23.0): se pueden combinar, p. ej. durante el episodio y postprandial.
   *  «Medición habitual» y «Durante el episodio» se excluyen entre sí. */
  tipos?: TipoMedida[] | null
  /** En las postprandiales: minutos desde que terminó de comer (15, 30, 60, 90 o 120). */
  min_comida?: number | null
  /** Hidratación antes de medir: sin hidratar todavía o ya hidratada. */
  hidratacion?: Hidratacion | null
  /** Constantes que se intentaron y no se pudieron medir. */
  no_medible?: CampoMedida[] | null
  /** El tensiómetro no capta la tensión porque está muy baja (es un hallazgo, no una toma que falte). */
  ta_no_capta?: boolean | null
  /** Notas de la toma, con sus palabras: qué estaba pasando, qué había comido, cómo se encontraba… */
  nota?: string | null
  /** Toma que empezó como rato de pulso alto del anillo Oura y se completó a mano. */
  de_oura?: boolean | null
  /** Toma que llegó del reloj (Apple Salud): hora de la lectura del reloj, para no enseñarla dos veces (desde la 0.25.0). */
  de_reloj?: string | null
  /** Toma abierta con «Siento taquicardia ahora» (desde la 0.25.0): el pulso del reloj de ese minuto se rellena solo. */
  taquicardia?: boolean | null
  /** El pulso de la toma lo puso el reloj (no se tecleó). */
  fc_de_reloj?: boolean | null
  /** Medición fija del día a la que pertenece (desde la 0.24.0). Sin ella, es una toma esporádica. */
  momento?: Momento | null
  /** En «Poslevantarme»: minutos que llevaba de pie al medir (test de bipedestación, desde la 0.24.0). */
  min_de_pie?: number | null
  /** Qué notaba al medir (tomas del test de pie, desde la 0.26.0), con los nombres de `SINTOMAS_TEST`. */
  sintomas?: string[] | null
  /** Esporádica clasificada en un momento del día (desde la 0.27.0): cuando ese momento fijo ya tiene toma, o para
   *  situar una toma suelta. No ocupa la medición fija. */
  cuando?: Momento | null
}
/** Test de pie del día (desde la 0.26.0, además de la hora de inicio): lo hecho antes y si lo cortó sentándose o tumbándose. */
export type TestPie = {
  inicio?: string | null
  /** Marcas de `ANTES_TEST`. */
  antes?: string[] | null
  /** Se sentó o se tumbó antes de acabar: minuto del test, hora, motivo y la toma ya sentada. */
  sentada?: { min: number; hora: string; motivo?: string[] | null; fc?: number | null; pas?: number | null; pad?: number | null } | null
  /** Se mareó al incorporarse y se le pasó en menos de un minuto (orienta a hipotensión ortostática inicial, que el tensiómetro no capta). */
  mareo_inicial?: boolean | null
}
/** Mediciones fijas del día, en su orden. */
export type Momento = 'levantarme' | 'poslevantarme' | 'tarde_tumbada' | 'tarde_de_pie' | 'antes_desayunar' | 'despues_desayunar' | 'media_manana' | 'antes_comer' | 'despues_comer' | 'media_tarde' | 'antes_cenar' | 'despues_cenar' | 'antes_cama'
export const MOMENTOS: [Momento, string][] = [
  ['levantarme', 'Al levantarme'],
  ['poslevantarme', 'Poslevantarme'],
  ['antes_desayunar', 'Antes de desayunar'],
  ['despues_desayunar', 'Después de desayunar'],
  ['media_manana', 'Media mañana'],
  ['antes_comer', 'Antes de comer'],
  ['despues_comer', 'Después de comer'],
  ['media_tarde', 'Media tarde'],
  ['antes_cenar', 'Antes de cenar'],
  ['despues_cenar', 'Después de cenar'],
  ['antes_cama', 'Antes de irme a la cama'],
  ['tarde_tumbada', 'Tarde · tumbada'],
  ['tarde_de_pie', 'Tarde · de pie'],
]
/** Mediciones fijas del test de pie (hoja POTS) y del resto del día (hoja Hipotensión), desde la 0.27.0. */
export const MOMENTOS_TEST: Momento[] = ['levantarme', 'poslevantarme']
/** Segundo test de pie, por la tarde (desde la 0.28.0): tumbada y de pie al 1, 3, 5 y 10 minutos, igual que el de la mañana. */
export const MOMENTOS_TEST_TARDE: Momento[] = ['tarde_tumbada', 'tarde_de_pie']
export type SesionTest = 'manana' | 'tarde'
/** Momentos, campo del día y etiquetas de cada test de pie. */
export const SESIONES_TEST: { [k in SesionTest]: { tumbada: Momento; dePie: Momento; campo: 'test_pie' | 'test_pie_tarde'; nombre: string } } = {
  manana: { tumbada: 'levantarme', dePie: 'poslevantarme', campo: 'test_pie', nombre: 'de la mañana' },
  tarde: { tumbada: 'tarde_tumbada', dePie: 'tarde_de_pie', campo: 'test_pie_tarde', nombre: 'de la tarde' },
}
/** ¿Es una toma de alguno de los dos tests de pie? */
export const esMomentoTest = (m?: Momento | null) => !!m && (MOMENTOS_TEST.includes(m) || MOMENTOS_TEST_TARDE.includes(m))
export const esTumbadaTest = (m?: Momento | null) => m === 'levantarme' || m === 'tarde_tumbada'
export const esDePieTest = (m?: Momento | null) => m === 'poslevantarme' || m === 'tarde_de_pie'
export const MOMENTOS_DIA: Momento[] = ['antes_desayunar', 'despues_desayunar', 'media_manana', 'antes_comer', 'despues_comer', 'media_tarde', 'antes_cenar', 'despues_cenar', 'antes_cama']
/** Parejas antes / después de cada comida, para la hipotensión postprandial. */
export const PAREJAS_COMIDA: [string, Momento, Momento][] = [['Desayuno', 'antes_desayunar', 'despues_desayunar'], ['Comida', 'antes_comer', 'despues_comer'], ['Cena', 'antes_cenar', 'despues_cenar']]
const esDespues = (m: Momento) => m === 'despues_desayunar' || m === 'despues_comer' || m === 'despues_cenar'
export const etiquetaMomento = (m?: Momento | null) => (m ? MOMENTOS.find(([k]) => k === m)?.[1] ?? '' : '')
/** Momento con sus minutos de pie: «Poslevantarme (5 min de pie)». */
export const etiquetaToma = (m: Medida) => {
  const e = etiquetaMomento(m.momento)
  if (!e && m.cuando) return `${etiquetaMomento(m.cuando)} (esporádica)`
  return e && m.min_de_pie ? `${e} (${m.min_de_pie} min de pie)` : e
}
/** Momentos fijos con varias tomas: en «Poslevantarme», el test de bipedestación al 1, 3, 5 y 10 minutos de pie
 *  (desde la 0.26.0; hasta entonces, solo 5 y 10). La hipotensión ortostática clásica se mira en los 3 primeros minutos. */
export const MINUTOS_DE_PIE = [1, 3, 5, 10]
/** Minutos del test con aviso al móvil (el de 1 y 3 minutos suena solo en la app, que está abierta). */
export const MINUTOS_AVISO_PIE = [5, 10]
/** «Antes del test»: lo que puede cambiar la respuesta del test y conviene que quede anotado. */
export const ANTES_TEST = ['Sin beber aún', 'Ampolla o agua', 'Sal', 'Hidroelectrolíticos fast', 'Hidroelectrolíticos de rescate', 'Medias o faja', 'Café', 'Medicación']
/** Síntomas que se marcan en cada toma del test de pie. */
export const SINTOMAS_TEST = ['Mareo', 'Palpitaciones', 'Visión borrosa', 'Temblor', 'Náusea', 'Calor', 'Frío', 'Debilidad', 'Niebla mental', 'Nada']
export const subtomasDe = (m: Momento): (number | null)[] => (esDePieTest(m) ? MINUTOS_DE_PIE : [null])
/** Cómo nace una medición fija: habitual (las de después de desayunar, comer y cenar, además postprandial); al levantarme, tumbada; poslevantarme, de pie. */
export function porDefectoMomento(m: Momento, minDePie: number | null): Medida {
  return {
    momento: m,
    tipos: esDespues(m) ? ['habitual', 'postprandial'] : ['habitual'],
    ...(esTumbadaTest(m) ? { posicion: 'tumbada' as const } : esDePieTest(m) ? { posicion: 'de_pie' as const } : {}),
    ...(minDePie ? { min_de_pie: minDePie } : {}),
  }
}
/** ¿Tiene la toma algo anotado además de la hora, el tipo y la posición (que pueden venir puestos)? */
export function medidaConDatos(m: Medida) {
  return [m.fc, m.pas, m.pad, m.glucosa, m.spo2].some((v) => v != null) || !!m.ta_no_capta || !!(m.no_medible ?? []).length || !!m.hidratacion || !!m.nota
}
export type CampoMedida = 'fc' | 'ta' | 'glucosa' | 'spo2'
export type TipoMedida = 'habitual' | 'episodio' | 'postprandial'
export const TIPOS_MEDIDA: [TipoMedida, string][] = [['habitual', 'Medición habitual'], ['episodio', 'Durante el episodio'], ['postprandial', 'Postprandial']]
/** Tipos de una toma, guardada con la forma antigua (`tipo`) o con la nueva (`tipos`). */
export function tiposDe(m: Medida): TipoMedida[] {
  if (m.tipos) return TIPOS_MEDIDA.map(([k]) => k).filter((k) => m.tipos!.includes(k))
  return m.tipo ? [m.tipo] : []
}
/** Marca o desmarca un tipo. «Medición habitual» y «Durante el episodio» no van juntas: al marcar una se quita la otra. */
export function alternarTipo(m: Medida, k: TipoMedida): Medida {
  const ahora = tiposDe(m)
  let nuevos = ahora.includes(k) ? ahora.filter((x) => x !== k) : [...ahora, k]
  if (!ahora.includes(k) && k === 'habitual') nuevos = nuevos.filter((x) => x !== 'episodio')
  if (!ahora.includes(k) && k === 'episodio') nuevos = nuevos.filter((x) => x !== 'habitual')
  return { tipo: null, tipos: nuevos.length ? nuevos : null, ...(nuevos.includes('postprandial') ? {} : { min_comida: null }) }
}
/** Botones de «Tiempo desde que terminé de comer» en las tomas postprandiales. */
export const MIN_COMIDA = [15, 30, 60, 90, 120]
const txtMin = (n: number) => (n >= 120 ? '2 h o más' : `${n} min`)
export const etiquetaMinComida = (n: number) => txtMin(n)
/** Tipos en texto: «Durante el episodio · postprandial». */
export function textoTipos(m: Medida) {
  const ts = tiposDe(m)
  return ts.map((k, i) => {
    const l = TIPOS_MEDIDA.find(([x]) => x === k)![1]
    const t = i === 0 ? l : l.toLowerCase()
    return k === 'postprandial' && m.min_comida ? `${t} (${txtMin(m.min_comida)} tras comer)` : t
  }).join(' · ')
}
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
    etiquetaToma(m),
    textoTipos(m),
    m.fc != null ? `FC ${m.fc} lpm` : no('fc') && 'FC no medible',
    m.pas != null || m.pad != null ? `TA ${m.pas ?? '—'}/${m.pad ?? '—'} mmHg` : m.ta_no_capta ? 'TA indetectable (el tensiómetro no la capta, muy baja)' : no('ta') && 'TA no medible',
    m.glucosa != null ? `Glucosa ${m.glucosa} mg/dl` : no('glucosa') && 'glucosa no medible',
    m.spo2 != null ? `SatO₂ ${m.spo2} %` : no('spo2') && 'SatO₂ no medible',
    m.posicion && POSICIONES.find(([k]) => k === m.posicion)?.[1].toLowerCase(),
    m.hidratacion && HIDRATACIONES.find(([k]) => k === m.hidratacion)?.[1].toLowerCase(),
    (m.sintomas ?? []).length > 0 && `notaba: ${m.sintomas!.join(', ').toLowerCase()}`,
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
  /** Test de bipedestación de la mañana: hora (HH:MM:SS) a la que se puso de pie, para avisar en cada toma. */
  test_pie?: TestPie | null
  /** Test de pie de la tarde (desde la 0.28.0): mismos campos que el de la mañana. */
  test_pie_tarde?: TestPie | null
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
  /** Observaciones de los ratos a 100 lpm o más del pulso del día (reloj u Oura), por clave `reloj|HH:MM` u `oura|HH:MM`. */
  obs_ratos?: { [clave: string]: string }
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

/** Grupos de Disautonomía de la 0.24.0: compresión del día y signos que orientan a Ehlers-Danlos, a compresiones
 *  vasculares abdominales o a activación mastocitaria. Se añaden una vez a los grupos guardados de cada usuaria
 *  (después los edita como los demás). */
export const EXTRAS_024 = 'disautonomia-0.24.0'
export const GRUPOS_DISAUTONOMIA: Grupo[] = [
  { id: 'compresion', nombre: 'Compresión', tipo: 'varias', neutra: true, pagina: 'disautonomia', opciones: op('Sin compresión', 'Medias', 'Faja abdominal') },
  { id: 'eds_compresiones', nombre: 'Ehlers-Danlos y compresiones', tipo: 'varias', neutra: true, pagina: 'disautonomia', opciones: op(
    'Nada hoy',
    'Dolor abdominal después de comer', 'Saciedad precoz', 'Vómitos después de comer', 'Disfagia', 'Alivio tumbada boca arriba', 'Alivio tumbada boca abajo', 'Alivio tumbada sobre el lado izquierdo',
    'Dolor pélvico que empeora de pie', 'Sangre en la orina',
    'Rubor o enrojecimiento', 'Sofocos', 'Picor', 'Habones (ronchas)', 'Dermografismo (marcas al rascar)', 'Congestión nasal',
    'Subluxación o luxación', 'Dolor articular', 'Hematomas sin golpe', 'Piernas o manos moradas de pie', 'Manos y pies fríos',
  ) },
]
/** 0.27.1: «Disfagia» en «Ehlers-Danlos y compresiones», detrás de «Vómitos después de comer». */
export const EXTRAS_0271 = 'disautonomia-0.27.1-disfagia'
/** Grupos de la usuaria con las novedades de la 0.24.0 y la 0.27.1 añadidas una sola vez, o null si no hay nada
 *  que añadir (o si aún no tiene grupos guardados). */
export function conGruposNuevos(c: SintCfg | null): Partial<SintCfg> | null {
  if (!c || !Array.isArray(c.grupos)) return null
  let grupos = c.grupos
  const extras = [...(c.extras ?? [])]
  if (!extras.includes(EXTRAS_024)) {
    const ids = new Set(grupos.map((g) => g.id))
    grupos = [...grupos, ...GRUPOS_DISAUTONOMIA.filter((g) => !ids.has(g.id))]
    extras.push(EXTRAS_024)
  }
  if (!extras.includes(EXTRAS_0271)) {
    grupos = grupos.map((g) => {
      if (g.id !== 'eds_compresiones' || (g.opciones ?? []).some((o) => o.id === 'disfagia')) return g
      const ops = [...(g.opciones ?? [])]
      const tras = ops.findIndex((o) => o.id === 'vomitos_despues_de_comer')
      ops.splice(tras < 0 ? ops.length : tras + 1, 0, { id: 'disfagia', nombre: 'Disfagia' })
      return { ...g, opciones: ops }
    })
    extras.push(EXTRAS_0271)
  }
  return extras.length === (c.extras ?? []).length ? null : { grupos, extras }
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
  ...GRUPOS_DISAUTONOMIA,
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

export type Episodio = { dia: string; hora: string; grupo: string; nombre: string; tipos: string[]; gravedad: number | null; urgencias: boolean; acciones: string[]; hice: string; datos: string }
/** Episodios anotados (opciones marcadas en los grupos 'detalle', como Disautonomía), en orden. */
export function episodiosDe(grupos: Grupo[], dias: { day: string; value: SintDia }[]): Episodio[] {
  return grupos.filter((g) => g.tipo === 'detalle').flatMap((g) =>
    dias.flatMap((d) => (d.value.sel?.[g.id] ?? []).flatMap((id) => {
      const xs = episodiosOpcion(d.value.det?.[g.id]?.[id])
      const nom = (t: string) => g.opciones?.find((o) => o.id === t)?.nombre ?? nombreDeId(t)
      // Una opción marcada sin detalle cuenta como un episodio. Con varios tipos, el nombre los une: «Mareos + Ansiedad».
      return (xs.length ? xs : [{} as Detalle]).map((det) => { const tipos = tiposEpisodio(id, det).map(nom); return { dia: d.day, hora: det.hora ?? '', grupo: g.nombre, nombre: tipos.join(' + '), tipos, gravedad: det.gravedad ?? null, urgencias: !!det.urgencias, acciones: det.acciones ?? [], hice: det.hice ?? '', datos: textoDetalle(det) } })
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
    siglas: [...new Set(xs.flatMap((e) => e.tipos.map(sigla)))],
    nombres: [...new Set(xs.flatMap((e) => e.tipos))],
    gravedad: gs.length ? Math.max(...gs) : null,
    ingreso: xs.some((e) => e.urgencias),
  }
}

/* ---------- Test de pie: cálculos (desde la 0.26.0) ---------- */

/** Una lectura del test: minuto desde que se puso de pie (negativo = tumbada antes), y lo que se midió. */
export type LecturaTest = { min: number; etiqueta: string; fc?: number | null; pas?: number | null; pad?: number | null; sintomas?: string[]; de?: 'toma' | 'reloj' | 'sentada' }
export type ResultadoTest = {
  basal: Medida | null
  lecturas: LecturaTest[]
  /** Subida máxima de FC de pie respecto a tumbada, y cuántas lecturas de pie llegan a +30. */
  dFc: number | null
  fcMax: number | null
  n30: number
  /** Mayor caída de tensión alta y baja en los 3 primeros minutos y después. */
  caida3: { pas: number | null; pad: number | null }
  caidaTarde: { pas: number | null; pad: number | null }
  pasMin: number | null
  sentada: TestPie['sentada']
}
const minDia = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) + (h.length > 5 ? Number(h.slice(6, 8)) / 60 : 0)

/**
 * Lecturas del test de pie de un día: la basal tumbada («Al levantarme»), las tomas de «Poslevantarme» con sus minutos de pie,
 * el pulso del reloj mientras estaba de pie (hasta que se sentó, o 10 minutos) y la toma ya sentada. Con eso calcula la subida
 * de FC y las caídas de tensión. Son patrones para que los valore el médico, no un diagnóstico.
 */
export function resultadoTest(d: SintDia, relojPuntos: [string, number, number][] = [], sesion: SesionTest = 'manana'): ResultadoTest {
  const S = SESIONES_TEST[sesion]
  const tp = d[S.campo] ?? null
  const xs = d.constantes ?? []
  const basal = xs.find((x) => x.momento === S.tumbada && medidaConDatos(x)) ?? null
  const tomas = xs.filter((x) => x.momento === S.dePie && x.min_de_pie && medidaConDatos(x)).sort((a, b) => a.min_de_pie! - b.min_de_pie!)
  const sentada = tp?.sentada ?? null
  const fin = sentada?.min ?? 10
  const lecturas: LecturaTest[] = []
  if (basal) lecturas.push({ min: -1, etiqueta: 'Tumbada', fc: basal.fc, pas: basal.pas, pad: basal.pad, sintomas: basal.sintomas ?? [], de: 'toma' })
  for (const t of tomas) if (t.min_de_pie! <= fin) lecturas.push({ min: t.min_de_pie!, etiqueta: `De pie ${t.min_de_pie}′`, fc: t.fc, pas: t.pas, pad: t.pad, sintomas: t.sintomas ?? [], de: 'toma' })
  const ini = tp?.inicio
  const reloj: LecturaTest[] = []
  if (ini) {
    const m0 = minDia(ini)
    for (const [h, , max] of relojPuntos) {
      const m = minDia(h) - m0
      if (m >= 0.5 && m <= fin + 0.01) reloj.push({ min: Math.round(m * 10) / 10, etiqueta: `Reloj ${h}`, fc: max, de: 'reloj' })
    }
  }
  if (sentada) lecturas.push({ min: sentada.min + 1, etiqueta: 'Sentada', fc: sentada.fc, pas: sentada.pas, pad: sentada.pad, sintomas: sentada.motivo ?? [], de: 'sentada' })
  const b = basal?.fc ?? null
  const dePie = [...lecturas.filter((l) => l.de === 'toma' && l.min > 0), ...reloj]
  const fcs = dePie.map((l) => l.fc).filter((v): v is number => v != null)
  const fcMax = fcs.length ? Math.max(...fcs) : null
  const caida = (desde: number, hasta: number) => {
    const ls = lecturas.filter((l) => l.de === 'toma' && l.min > desde && l.min <= hasta)
    const ps = ls.map((l) => l.pas).filter((v): v is number => v != null), ds = ls.map((l) => l.pad).filter((v): v is number => v != null)
    return { pas: basal?.pas != null && ps.length ? basal.pas - Math.min(...ps) : null, pad: basal?.pad != null && ds.length ? basal.pad - Math.min(...ds) : null }
  }
  const pasDePie = lecturas.filter((l) => l.de === 'toma' && l.min > 0).map((l) => l.pas).filter((v): v is number => v != null)
  return {
    basal, lecturas: [...lecturas, ...reloj].sort((p, q) => p.min - q.min),
    dFc: b != null && fcMax != null ? fcMax - b : null, fcMax,
    n30: b != null ? fcs.filter((f) => f - b >= 30).length : 0,
    caida3: caida(0, 3), caidaTarde: caida(3, 10),
    pasMin: pasDePie.length ? Math.min(...pasDePie) : null,
    sentada,
  }
}
/** ¿Cumple la caída el criterio de hipotensión ortostática (≥20 de alta o ≥10 de baja)? */
export const caidaHO = (c: { pas: number | null; pad: number | null }) => (c.pas != null && c.pas >= 20) || (c.pad != null && c.pad >= 10)

/** Tensiones del día fuera del test de pie (hoja Hipotensión, desde la 0.27.0): las fijas del día y las esporádicas. */
export type ResultadoDia = {
  /** Tomas con tensión alta, en orden de hora. */
  tomas: { hora: string; etiqueta: string; pas: number; pad: number | null }[]
  pasMin: { pas: number; hora: string; etiqueta: string } | null
  /** Tomas con la alta por debajo de 90 (o «no la capta»). */
  bajo90: number
  noCapta: number
  /** Antes y después de cada comida: caída de la alta (positiva si baja). */
  comidas: { comida: string; antes: number; despues: number; caida: number; min?: number | null }[]
}
export function resultadoDia(d: SintDia): ResultadoDia {
  const xs = (d.constantes ?? []).filter((x) => !esMomentoTest(x.momento))
  const tomas = xs.filter((x) => x.pas != null).map((x) => ({ hora: x.hora ?? '', etiqueta: etiquetaToma(x) || 'Esporádica', pas: x.pas!, pad: x.pad ?? null }))
    .sort((a, b) => a.hora.localeCompare(b.hora))
  const pasMin = tomas.reduce<ResultadoDia['pasMin']>((m, t) => (!m || t.pas < m.pas ? { pas: t.pas, hora: t.hora, etiqueta: t.etiqueta } : m), null)
  const fija = (k: Momento) => xs.find((x) => x.momento === k && x.pas != null)
  const comidas = PAREJAS_COMIDA.flatMap(([comida, a, b]) => {
    const x = fija(a), y = fija(b)
    return x && y ? [{ comida, antes: x.pas!, despues: y.pas!, caida: x.pas! - y.pas!, min: y.min_comida }] : []
  })
  return { tomas, pasMin, bajo90: tomas.filter((t) => t.pas < 90).length, noCapta: xs.filter((x) => x.ta_no_capta).length, comidas }
}
