/** Equivalencias de proteína: cuánta proteína efectiva lleva cada tipo de alimento proteico, para pasar los gramos
 *  de proteína a gramos de alimento (o a unidades, como los huevos). Valores medios de tablas de composición
 *  españolas, en crudo y en la parte comestible, redondeados. Sirven para hacerse una idea, no para pesar. */
export interface FuenteProteina {
  id: string
  nombre: string
  grupo: 'Carnes' | 'Pescados y mariscos' | 'Huevos y lácteos' | 'Vegetales' | 'Suplementos'
  /** Gramos de proteína por cada 100 g de alimento. */
  por100: number
  /** Si se cuenta mejor en unidades: gramos de una unidad y su nombre. */
  unidad?: { g: number; uno: string; varios: string }
}

export const FUENTES_PROTEINA: FuenteProteina[] = [
  { id: 'pollo_pechuga', nombre: 'Pechuga de pollo', grupo: 'Carnes', por100: 23 },
  { id: 'pollo_muslo', nombre: 'Muslo o contramuslo de pollo', grupo: 'Carnes', por100: 19 },
  { id: 'pavo', nombre: 'Pavo (pechuga o muslo)', grupo: 'Carnes', por100: 22 },
  { id: 'ternera', nombre: 'Ternera magra', grupo: 'Carnes', por100: 21 },
  { id: 'cerdo', nombre: 'Lomo de cerdo', grupo: 'Carnes', por100: 21 },
  { id: 'cordero', nombre: 'Cordero', grupo: 'Carnes', por100: 18 },
  { id: 'conejo', nombre: 'Conejo', grupo: 'Carnes', por100: 21 },
  { id: 'jamon', nombre: 'Jamón serrano', grupo: 'Carnes', por100: 30 },
  { id: 'pescado_blanco', nombre: 'Pescado blanco (merluza, lubina, dorada, gallo)', grupo: 'Pescados y mariscos', por100: 18 },
  { id: 'pescado_azul', nombre: 'Pescado azul (salmón, trucha, caballa, sardina)', grupo: 'Pescados y mariscos', por100: 20 },
  { id: 'atun', nombre: 'Atún o bonito fresco', grupo: 'Pescados y mariscos', por100: 24 },
  { id: 'atun_lata', nombre: 'Atún en lata (escurrido)', grupo: 'Pescados y mariscos', por100: 25 },
  { id: 'marisco', nombre: 'Gambas o langostinos (pelados)', grupo: 'Pescados y mariscos', por100: 20 },
  { id: 'calamar', nombre: 'Calamar o sepia', grupo: 'Pescados y mariscos', por100: 16 },
  { id: 'mejillon', nombre: 'Mejillones (sin concha)', grupo: 'Pescados y mariscos', por100: 12 },
  { id: 'huevo', nombre: 'Huevo', grupo: 'Huevos y lácteos', por100: 12.6, unidad: { g: 50, uno: 'huevo', varios: 'huevos' } },
  { id: 'clara', nombre: 'Clara de huevo', grupo: 'Huevos y lácteos', por100: 11, unidad: { g: 33, uno: 'clara', varios: 'claras' } },
  { id: 'queso_fresco', nombre: 'Queso fresco (de Burgos, de cabra)', grupo: 'Huevos y lácteos', por100: 12 },
  { id: 'requeson', nombre: 'Requesón', grupo: 'Huevos y lácteos', por100: 11 },
  { id: 'queso_curado', nombre: 'Queso curado', grupo: 'Huevos y lácteos', por100: 30 },
  { id: 'yogur', nombre: 'Yogur natural o de oveja', grupo: 'Huevos y lácteos', por100: 4.5, unidad: { g: 125, uno: 'yogur', varios: 'yogures' } },
  { id: 'yogur_griego', nombre: 'Yogur griego o skyr', grupo: 'Huevos y lácteos', por100: 8, unidad: { g: 125, uno: 'yogur', varios: 'yogures' } },
  { id: 'kefir', nombre: 'Kéfir', grupo: 'Huevos y lácteos', por100: 3.5 },
  { id: 'cuajada', nombre: 'Cuajada de oveja', grupo: 'Huevos y lácteos', por100: 5.5, unidad: { g: 125, uno: 'cuajada', varios: 'cuajadas' } },
  { id: 'legumbres', nombre: 'Legumbres cocidas (lentejas, garbanzos)', grupo: 'Vegetales', por100: 8.5 },
  { id: 'tofu', nombre: 'Tofu', grupo: 'Vegetales', por100: 13 },
  { id: 'tempeh', nombre: 'Tempeh', grupo: 'Vegetales', por100: 19 },
  { id: 'quinoa', nombre: 'Quinoa (en crudo)', grupo: 'Vegetales', por100: 14 },
  { id: 'almendras', nombre: 'Almendras', grupo: 'Vegetales', por100: 21 },
  { id: 'semillas', nombre: 'Semillas (calabaza, cáñamo)', grupo: 'Vegetales', por100: 30 },
  { id: 'prot_guisante', nombre: 'Proteína de guisante en polvo', grupo: 'Suplementos', por100: 80, unidad: { g: 25, uno: 'cacito', varios: 'cacitos' } },
]

export const FUENTE_POR_DEFECTO = 'pollo_pechuga'

/** Cuánto alimento hace falta para `g` gramos de proteína: gramos redondeados a 10 o, si se cuenta en
 *  unidades, unidades redondeadas a la media. */
export function cantidadPara(f: FuenteProteina, g: number): string {
  const gramos = (g / f.por100) * 100
  if (f.unidad) {
    const n = Math.max(0.5, Math.round((gramos / f.unidad.g) * 2) / 2)
    const txt = Number.isInteger(n) ? String(n) : n === 0.5 ? '½' : `${Math.floor(n)}½`
    return `${txt} ${n <= 1 ? f.unidad.uno : f.unidad.varios}`
  }
  return `${(Math.round(gramos / 10) * 10).toLocaleString('es-ES')} g`
}
