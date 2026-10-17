/** Exportación para Claude: todos los registros de un periodo en un texto (Markdown) para pegar o adjuntar en una
 *  conversación. Primero el contexto y los resúmenes; después, día a día. No incluye el diario de introspección,
 *  que tiene su propio informe. */
import { fmtDate } from '../../lib/dates'
import { duracion } from '../nutricion/logica'
import { objetivo } from '../hidratacion/logica'
import { COMIDAS, HECES_COLORES, ORINA_NOMBRES, conOpciones, gruposDe, tieneEscala, type SintDia } from '../sintomas/logica'
import { FLUJOS, MANCHADOS } from '../ciclo/logica'
import { cumplimiento } from '../suplementos/logica'
import {
  ayunoTxt, cicloTxt, larga, miles, composicionTxt, corta, dec, episodiosDe, hidratacionTxt, kcalTxt, media, objetivosDel, pautaTxt, pct, pl,
  productosVigentes, resumenHidratacion, resumenNutricion, resumenPeso, resumenSuplementos, sintomasDel, sinTomar, terapiaDel,
  tomasDelDia, type Contexto,
} from './calculos'
import { diasDe, type Periodo } from './datos'

const COLOR: { [k: string]: string } = Object.fromEntries(HECES_COLORES)
const FLUJO: { [k: string]: string } = { ...Object.fromEntries(FLUJOS), si: 'sí' }
const MANCHADO: { [k: string]: string } = Object.fromEntries(MANCHADOS)

function sintomasDelDia(c: Contexto, d: SintDia): string[] {
  const out: string[] = []
  const grupos = gruposDe(c.sintCfg)
  for (const g of grupos) {
    const partes: string[] = []
    if (conOpciones(g.tipo) && g.tipo !== 'detalle') {
      const ops = (d.sel?.[g.id] ?? []).map((id) => g.opciones?.find((o) => o.id === id)?.nombre ?? id)
      if (ops.length) partes.push(ops.join(', '))
    }
    if (tieneEscala(g) && d.escala?.[g.id] != null) partes.push(`${d.escala[g.id]}/10`)
    if (g.tipo === 'hambre') {
      const h = COMIDAS.filter(([k]) => d.hambre?.[k] != null).map(([k, n]) => `${n.toLowerCase()} ${d.hambre![k]}/10`)
      if (h.length) partes.push(h.join(', '))
      if (d.sin_hambre) partes.push('come sin hambre')
    }
    if (g.tipo === 'heces') {
      if (d.sin_heces) partes.push('sin deposición')
      for (const x of d.heces ?? []) {
        partes.push([
          x.bristol ? `Bristol ${x.bristol}` : 'sin Bristol', x.color && COLOR[x.color]?.toLowerCase(),
          x.flotan && 'flotan', x.brillo && 'brillantes', x.restos && 'restos de comida', x.sangre && 'con sangre',
        ].filter(Boolean).join(', '))
      }
    }
    if (g.tipo === 'micciones') {
      if (d.micciones != null) partes.push(String(d.micciones))
      if (d.orina_color) partes.push(`color ${ORINA_NOMBRES[d.orina_color - 1]?.toLowerCase() ?? d.orina_color}`)
      if (d.orina_olor) partes.push('con olor')
    }
    if (g.tipo === 'texto' && d.texto?.[g.id]?.trim()) partes.push(`«${d.texto[g.id].trim()}»`)
    if (partes.length) out.push(`${g.nombre}: ${partes.join(' · ')}`)
  }
  return out
}

export function textoExportacion(p: Periodo, c: Contexto): string {
  const L: string[] = []
  const hasta = p.hasta < c.hoy ? p.hasta : c.hoy
  L.push(`# New Version · Mis registros del ${larga(p.desde)} al ${larga(p.hasta)}`)
  L.push('')
  L.push('Datos anotados por mí en la app New Version. Las kilocalorías son estimaciones de la app a partir de mi menú y de raciones caseras. «Sin registrar» quiere decir que no lo anoté, no que no pasara.')

  // ---------- Contexto ----------
  L.push('', '## Contexto')
  const info = cicloTxt(c, hasta)
  L.push(`- Ciclo a ${larga(hasta)}: ${info ?? 'sin reglas registradas'}.${c.modelo.nMedia ? ` Duración media ${c.modelo.media} días (${pl(c.modelo.nMedia, 'ciclo', 'ciclos')}).` : ''} Ventana crítica: los ${c.modelo.critica} días antes de la regla.`)
  const reglas = c.modelo.reglas.filter((r) => r.fin >= p.desde && r.inicio <= p.hasta)
  if (reglas.length) L.push(`- Reglas en el periodo: ${reglas.map((r) => (r.fin > r.inicio ? `${corta(r.inicio)} a ${corta(r.fin)}` : corta(r.inicio))).join('; ')}.`)
  const prods = productosVigentes(c, hasta)
  if (prods.length) {
    L.push('- Suplementos que tomo ahora:')
    for (const x of prods) L.push(`  - ${x.nombre}${x.marca ? ` (${x.marca})` : ''}: ${pautaTxt(x) || 'sin pauta anotada'}`)
  }
  const ter = terapiaDel(p, c)
  if (ter.length) {
    L.push('- Terapia endovenosa:')
    for (const t of ter) L.push(`  - ${t.nombre}: ${[t.pauta, t.veces.length ? `en el periodo el ${t.veces.map(corta).join(', ')}` : 'ninguna en el periodo', t.proxima && `próxima ${fmtDate(t.proxima)}`].filter(Boolean).join(' · ')}`)
  }

  // ---------- Resumen ----------
  L.push('', '## Resumen del periodo')
  const { dias: sDias, grupos } = sintomasDel(p, c)
  const epis = episodiosDe(grupos, sDias)
  L.push(`- Días con síntomas anotados: ${sDias.length}. Episodios: ${epis.length}${epis.length ? ` (${epis.map((e) => `${corta(e.dia)}${e.hora ? ' ' + e.hora : ''}${e.gravedad != null ? `, ${e.gravedad}/10` : ''}${e.urgencias ? ', urgencias' : ''}`).join('; ')})` : ''}.`)
  const nut = resumenNutricion(p, c)
  if (nut?.diasConRegistro) {
    L.push(`- Comidas: ${nut.hechas} de ${nut.total} tomas hechas en ${pl(nut.diasConRegistro, 'día', 'días')}${nut.saltadas.length ? `; más saltadas: ${nut.saltadas.slice(0, 3).map(([n, x]) => `${n.toLowerCase()} ${x}`).join(', ')}` : ''}.`)
    if (nut.kcal) L.push(`- Kilocalorías: media de unas ${miles(nut.kcal.mediaComido)} al día frente a ${miles(nut.kcal.mediaReferencia)} ${nut.kcal.deMenu ? 'previstas en mi menú' : 'pautadas'} (${pct(nut.kcal.mediaComido / nut.kcal.mediaReferencia)}); llego en ${nut.kcal.llega} de ${pl(nut.kcal.dias, 'día', 'días')}.`)
    if (nut.cenasConHora) L.push(`- Cena terminada a las ${c.nutriCfg?.cena_fin_max ?? '21:00'} o antes: ${nut.cenasATiempo} de ${pl(nut.cenasConHora, 'día', 'días')}.`)
    if (nut.ayunos.length) L.push(`- Ayuno de la noche: media ${duracion(Math.round(media(nut.ayunos)))}, entre ${duracion(Math.min(...nut.ayunos))} y ${duracion(Math.max(...nut.ayunos))}.`)
  }
  const hid = resumenHidratacion(p, c)
  if (hid) L.push(`- Hidratación: media ${dec(hid.mediaMl / 1000)} litros al día; llego al objetivo en ${hid.llega} de ${pl(hid.dias, 'día', 'días')}.`)
  const sup = resumenSuplementos(p, c)
  if (sup) L.push(`- Suplementos: ${sup.hechas} de ${sup.pautadas} tomas pautadas hechas (${pct(sup.hechas / sup.pautadas)}).`)
  const peso = resumenPeso(p)
  if (peso.del.length) {
    L.push(`- Peso: ${peso.del.map((x) => `${corta(x.dia)} ${x.kg != null ? dec(x.kg) + ' kg' : ''}${composicionTxt(x) ? ` (${composicionTxt(x)})` : ''}`).join('; ')}.`)
  } else if (peso.anterior) L.push(`- Peso: sin pesadas en el periodo; la última, ${dec(peso.anterior.kg!)} kg el ${fmtDate(peso.anterior.dia)}.`)
  const obj = objetivosDel(p, c)
  if (obj.length) {
    L.push('- Objetivos de hábitos:')
    for (const o of obj) L.push(`  - ${o.nombre}: ${pct(o.parte!)} (${o.texto})`)
  }

  // ---------- Día a día ----------
  L.push('', '## Día a día')
  const obje = objetivo(c.hidraCfg)
  for (const day of diasDe(p.desde, hasta)) {
    const s = p.sint.get(day), n = p.nutri.get(day), h = p.hidra.get(day), su = p.supl.get(day)
    const dDesc = p.descanso.get(day)
    const fecha = new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const ci = cicloTxt(c, day)
    L.push('', `### ${fecha[0].toUpperCase() + fecha.slice(1)}${ci ? ` · ${ci}` : ''}`)
    const regla = c.cicloMapa[day]
    if (regla?.regla || regla?.manchado) L.push(`- Regla: ${[regla.regla && (FLUJO[regla.regla] ?? regla.regla).toLowerCase(), regla.manchado && `manchado ${(MANCHADO[regla.manchado] ?? regla.manchado).toLowerCase()}`, regla.coagulos && 'con coágulos'].filter(Boolean).join(', ')}`)
    const ep = epis.filter((e) => e.dia === day)
    for (const e of ep) L.push(`- **Episodio**: ${e.nombre}${e.hora ? ` a las ${e.hora}` : ''}${e.gravedad != null ? `, gravedad ${e.gravedad}/10` : ''}${e.urgencias ? ', ingreso en urgencias' : ''}`)
    const sl = s ? sintomasDelDia(c, s) : []
    if (sl.length) { L.push('- Síntomas:'); for (const x of sl) L.push(`  - ${x}`) } else L.push('- Síntomas: sin registrar')
    if (n?.tomas && Object.keys(n.tomas).length) {
      L.push(`- Comidas${n.menu ? ` (menú ${n.menu === 'luteo' ? 'lúteo' : 'folicular'})` : ''}:`)
      for (const x of tomasDelDia(c, day, n)) L.push(`  - ${x}`)
      const k = kcalTxt(c, day, n)
      if (k) L.push(`  - Kilocalorías: ${k}`)
    } else L.push('- Comidas: sin registrar')
    const ay = ayunoTxt(c, p, day)
    if (ay) L.push(`- Ayuno de la noche anterior: ${ay}`)
    if (dDesc?.sueno_min != null || dDesc?.despertar || dDesc?.dormir) L.push(`- Descanso: ${[dDesc.despertar && `despertar ${dDesc.despertar}`, dDesc.sueno_min != null && `sueño ${duracion(dDesc.sueno_min)}`, dDesc.dormir && `a dormir ${dDesc.dormir}`].filter(Boolean).join(', ')}`)
    L.push(`- Hidratación: ${h ? hidratacionTxt(h, obje) : 'sin registrar'}`)
    if (su) {
      const r = cumplimiento(c.suplCfg?.lista ?? [], su, day)
      const no = sinTomar(c, day, su)
      const ter2 = ter.filter((t) => t.veces.includes(day)).map((t) => t.nombre)
      if (r.marcadas) L.push(`- Suplementos: ${r.hechas} de ${r.pautadas} tomas${no.length ? `; sin tomar: ${no.join(', ')}` : ''}`)
      if (ter2.length) L.push(`- Terapia endovenosa: ${ter2.join(', ')}`)
    }
    for (const x of p.peso.filter((x) => x.dia === day)) L.push(`- Peso: ${x.kg != null ? dec(x.kg) + ' kg' : ''}${composicionTxt(x) ? ` · ${composicionTxt(x)}` : ''}${x.notas ? ` · ${x.notas}` : ''}`)
  }
  L.push('')
  return L.join('\n')
}
