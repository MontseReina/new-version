// GENERADO con «npm run build:avisos» a partir de fuente.ts y de src/modules/avisos/reglas.ts. No editar a mano: es lo que se pega en Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";
//#region src/lib/dates.ts
function toDateStr(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr, n) {
	const d = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
	d.setDate(d.getDate() + n);
	return toDateStr(d);
}
function diffDays(a, b) {
	const da = (/* @__PURE__ */ new Date(a.slice(0, 10) + "T12:00:00")).getTime();
	const db = (/* @__PURE__ */ new Date(b.slice(0, 10) + "T12:00:00")).getTime();
	return Math.round((da - db) / 864e5);
}
function fmtDate(s) {
	if (!s) return "—";
	return new Date(s.length <= 10 ? s + "T12:00:00" : s).toLocaleDateString("es-ES", {
		weekday: "short",
		day: "numeric",
		month: "short"
	});
}
const suma = (d) => (d.agua_ml ?? 0) + (d.mar_ml ?? 0) + ((d.caldo_tazas ?? 0) + (d.infusion_tazas ?? 0) + (d.cardo_tazas ?? 0)) * 200;
const total = (d) => d.total_ml ?? suma(d);
/** Fila de la pauta que corresponde al momento de levantarse, o -1 si la pauta no tiene ninguna. */
const filaLevantar = (c) => (c?.pauta ?? []).findIndex((f) => /levant|despert/i.test(f.momento));
//#endregion
//#region src/modules/nutricion/logica.ts
/** Nutrición: forma de los datos y cálculos. Sin datos personales: menús, platos, horarios y
*  objetivos de cada usuaria viven en sus ajustes (base de datos), no en el código. */
const MENUS = {
	folicular: "Menú folicular",
	luteo: "Menú lúteo"
};
const aMin = (h) => {
	const m = /^(\d{1,2}):(\d{2})$/.exec(h ?? "");
	return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const aHora = (min) => {
	const x = (Math.round(min) % 1440 + 1440) % 1440;
	return String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
};
/** Qué menú toca un día y por qué. Folicular desde la regla hasta la ovulación; lúteo desde la ovulación hasta la regla. */
function menuDe(cfg, info, date) {
	const dow = ((/* @__PURE__ */ new Date(date + "T12:00:00")).getDay() + 6) % 7;
	const fijo = cfg.menu_fijo === "folicular" || cfg.menu_fijo === "luteo" ? cfg.menu_fijo : null;
	const id = fijo ?? (info?.fase === "lutea" ? "luteo" : "folicular");
	const menu = cfg.menus?.[id] ?? null;
	const semana = info ? Math.floor((info.dia - 1) / 7) % 2 + 1 : 1;
	let porque = "Sin reglas registradas todavía: se enseña el menú folicular.";
	let desdeFase = 0;
	if (fijo) {
		porque = `Has elegido ver siempre el ${MENUS[fijo].toLowerCase()}, sea cual sea la fase del ciclo.`;
		if (fijo === "luteo" && info?.fase === "lutea") desdeFase = diffDays(date, info.ciclo.ovulacion) - 1;
	} else if (info) {
		const c = info.ciclo;
		if (id === "luteo") {
			desdeFase = diffDays(date, c.ovulacion) - 1;
			porque = `Día ${info.dia} del ciclo: la ovulación fue hacia el ${fmtDate(c.ovulacion)}. Toca el menú lúteo hasta que venga la regla (${c.siguientePrevisto ? "prevista el " : ""}${fmtDate(c.siguiente)}).`;
		} else porque = `Día ${info.dia} del ciclo: toca el menú folicular hasta la ovulación (hacia el ${fmtDate(c.ovulacion)}).`;
	}
	const n = menu?.dias.length ?? 0;
	let indice = 0;
	if (menu && n) {
		if (menu.tipo === "semana") indice = dow % n;
		else indice = desdeFase < n ? Math.max(0, desdeFase) : n - Math.min(7, n) + (desdeFase - n) % Math.min(7, n);
	}
	return {
		id,
		menu,
		porque,
		indice,
		semana
	};
}
/** Platos que tocan en una toma. Los que alternan por semana solo salen en la suya. */
function platosDe(cfg, m, toma) {
	return (m.menu?.dias[m.indice]?.[toma] ?? []).filter((r) => typeof r === "string" || !r.semana || r.semana === m.semana).map((r) => {
		const id = typeof r === "string" ? r : r.id;
		return {
			id,
			nombre: cfg.platos?.[id]?.nombre ?? id
		};
	});
}
const tomasDe = (cfg) => cfg?.tomas ?? [];
/** Anotada sin decir cuánto: tiene escrito lo que ha tomado o alguna hora, pero ningún estado marcado. */
const anotada = (t) => !!t && !t.estado && (!!t.otro?.trim() || aMin(t.ini) != null || aMin(t.fin) != null);
const hecha = (t) => t?.estado === "entera" || t?.estado === "tres_cuartos" || t?.estado === "media" || anotada(t);
/** Hora límite prevista de una toma, en minutos. */
const limite = (t) => aMin(t.hasta) ?? aMin(t.hora);
/** Hora en la que acaba una toma: el fin si lo guarda, o su inicio. */
const finDe = (t) => aMin(t?.fin) ?? aMin(t?.ini);
/** La última comida con hora: la más tardía de hoy que ya haya pasado; si hoy no hay ninguna, la más tardía de ayer
*  (la cena, si está registrada). `minutos` = los que han pasado hasta `ahoraMin`. */
function ultimaComida(cfg, ayer, d, ahoraMin) {
	const defs = tomasDe(cfg);
	const mejor = (dia, tope) => {
		let r = null;
		for (const t of defs) {
			const x = dia?.tomas?.[t.id];
			const f = finDe(x);
			if (hecha(x) && f != null && f <= tope && (!r || f >= r.fin)) r = {
				nombre: t.nombre,
				fin: f
			};
		}
		return r;
	};
	const h = mejor(d, ahoraMin);
	if (h) return {
		nombre: h.nombre,
		hora: aHora(h.fin),
		ayer: false,
		minutos: ahoraMin - h.fin
	};
	const a = mejor(ayer, 1440);
	return a ? {
		nombre: a.nombre,
		hora: aHora(a.fin),
		ayer: true,
		minutos: ahoraMin + 1440 - a.fin
	} : null;
}
//#endregion
//#region src/modules/nutricion/kcal.ts
/** Kilocalorías estimadas: las de los platos del menú (cifra guardada en los ajustes de cada plato) por la parte
*  que se tomó. Son un suelo que alcanzar, nunca un tope. La referencia del día es la cifra pautada por
*  nutrición clínica (`kcal_min`) o, sin ella, lo previsto en el menú de ese día. */
const PARTE = {
	entera: 1,
	tres_cuartos: .75,
	media: .5,
	no: 0
};
const kcalDePlatos = (cfg, ids) => {
	let s = 0;
	for (const id of ids) {
		const k = cfg.platos?.[id]?.kcal;
		if (k == null) return null;
		s += k;
	}
	return s;
};
/** Kilocalorías de un día. `ahoraMin` = minutos del día para «lo que va de día»; `null` = el día entero. */
function kcalDia(cfg, d, menu, ahoraMin) {
	let comido = 0, previsto = 0, hasta = 0, fuera = 0;
	const sinDato = [];
	for (const t of tomasDe(cfg)) {
		const x = d.tomas?.[t.id];
		const delMenu = kcalDePlatos(cfg, platosDe(cfg, menu, t.id).map((p) => p.id));
		previsto = previsto == null || delMenu == null ? null : previsto + delMenu;
		if (hecha(x) || x?.estado === "no" || ahoraMin == null || limite(t) != null && ahoraMin >= limite(t) + 30) hasta = hasta == null || delMenu == null ? null : hasta + delMenu;
		if (!x || x.estado === "no" || !hecha(x)) continue;
		if (!x.estado || x.otro?.trim()) {
			sinDato.push(t.nombre);
			fuera += delMenu ?? 0;
			continue;
		}
		const ids = (x.platos?.length ? x.platos : platosDe(cfg, menu, t.id).map((p) => p.id)).filter((id) => x.postre?.[id] !== "no");
		const k = kcalDePlatos(cfg, ids);
		if (k == null) {
			sinDato.push(t.nombre);
			fuera += delMenu ?? 0;
			continue;
		}
		comido += k * PARTE[x.estado];
	}
	const min = cfg.kcal_min || null;
	const referencia = min ?? previsto;
	const parte = (kcalMenu) => referencia == null || previsto == null || kcalMenu == null ? null : previsto ? Math.round(referencia * (Math.max(0, kcalMenu) / previsto)) : 0;
	return {
		comido: Math.round(comido),
		sinDato,
		previsto,
		previstoHasta: hasta,
		referencia,
		deMenu: !min,
		referenciaHasta: parte(hasta == null ? null : hasta - fuera),
		referenciaContable: parte(previsto == null ? null : previsto - fuera)
	};
}
const fmtKcal = (n) => Math.round(n).toLocaleString("es-ES");
//#endregion
//#region src/modules/avisos/reglas.ts
/** Avisos al móvil: qué aviso toca en cada momento. Lo usa la función del servidor `avisos`, que lo revisa
*  cada cinco minutos, y la página Avisos para enseñar la lista. Sin datos personales: horas, pautas y
*  menús salen de los ajustes y registros de cada usuaria. */
const AVISOS = [
	{
		id: "ayuno",
		nombre: "Horas sin comer",
		detalle: "Media hora antes de cumplir las horas de ayuno, al cumplirlas y cada hora que pase después sin comer.",
		porDefecto: true
	},
	{
		id: "primera",
		nombre: "Primera toma del día",
		detalle: "Si pasa una hora desde que te levantas sin ninguna toma. La hora de levantarte es la del botón «Vaso de agua y chupito de mar al levantarme» de Hidratación.",
		porDefecto: true
	},
	{
		id: "agua",
		nombre: "Agua a mediodía",
		detalle: "A la hora que digas, si no llegas a la cantidad mínima.",
		porDefecto: true
	},
	{
		id: "kcal",
		nombre: "Kilocalorías del día",
		detalle: "A media tarde, si vas en rango o por debajo de lo previsto hasta esa hora; y el balance del día después de cenar. Nunca avisa por pasarte.",
		porDefecto: true
	},
	{
		id: "dormir",
		nombre: "Ya puedes acostarte",
		detalle: "Cuando pasan las horas mínimas desde que terminas de cenar.",
		porDefecto: true
	},
	{
		id: "pendiente",
		nombre: "Comida principal sin anotar",
		detalle: "Desayuno, comida o cena sin anotar media hora después de su hora.",
		porDefecto: true
	},
	{
		id: "cena",
		nombre: "Hora de cenar",
		detalle: "Media hora antes de la hora máxima de terminar la cena, si aún no has empezado.",
		porDefecto: true
	}
];
const activo = (c, id) => c.activos?.[id] ?? AVISOS.find((a) => a.id === id).porDefecto;
const enSilencio = (c, m) => {
	const a = aMin(c.silencio_desde ?? "23:30"), b = aMin(c.silencio_hasta ?? "07:30");
	if (a == null || b == null || a === b) return false;
	return a < b ? m >= a && m < b : m >= a || m < b;
};
/** ¿Estamos dentro de la franja [desde, desde + dura) minutos? */
const dentro = (m, desde, dura) => m >= desde && m < desde + dura;
/** Hora a la que se levantó hoy: la del toque «al levantarme» de Hidratación. */
function horaLevantar(hc, d) {
	const i = filaLevantar(hc);
	const k = i >= 0 ? "pauta:" + i : "levantar";
	const t = (d.horas ?? []).find((x) => x.k === k);
	return aMin(t?.h);
}
/** Todos los avisos que tocan ahora, antes de quitar los ya enviados. */
function avisosAhora(x) {
	const { ahoraMin: m, cfg, nutriCfg: nc } = x;
	if (enSilencio(cfg, m)) return [];
	const out = [];
	const defs = tomasDe(nc);
	const algunaHoy = defs.some((t) => hecha(x.nutriHoy.tomas?.[t.id]));
	if (activo(cfg, "ayuno")) {
		const u = ultimaComida(nc, x.nutriAyer, x.nutriHoy, m);
		const max = (nc.ayuno_max_h ?? 12) * 60;
		if (u) {
			const cenaId = defs[defs.length - 1]?.id;
			const sinCena = u.ayer && cenaId != null && !hecha(x.nutriAyer?.tomas?.[cenaId]);
			const desde = `${u.nombre.toLowerCase()}${u.ayer ? " de ayer" : ""}, ${u.hora}${sinCena ? "; la cena de ayer no está anotada" : ""}`;
			if (dentro(u.minutos, max - 30, 30)) out.push({
				clave: "ayuno-antes",
				id: "ayuno",
				titulo: "Ayuno",
				ruta: "nutricion",
				cuerpo: `A las ${aHora(m + max - u.minutos)} cumples ${max / 60} horas sin comer (desde: ${desde}). ${algunaHoy ? "Toca comer." : "Prepara la primera toma."}`
			});
			else if (u.minutos >= max) {
				const h = Math.floor(u.minutos / 60);
				if (u.minutos - h * 60 < 30 && h <= 20) out.push({
					clave: "ayuno-" + h,
					id: "ayuno",
					titulo: "Ayuno",
					ruta: "nutricion",
					cuerpo: h * 60 === max ? `Llevas ${h} horas sin comer (desde: ${desde}). Es la hora: come ya.` : `Llevas ${h} horas sin comer (desde: ${desde}). Prioriza comer ahora.`
				});
			}
		}
	}
	if (activo(cfg, "primera") && !algunaHoy) {
		const w = horaLevantar(x.hidraCfg, x.hidraHoy);
		if (w != null && dentro(m, w + 60, 90)) out.push({
			clave: "primera",
			id: "primera",
			titulo: "Primera toma",
			ruta: "nutricion",
			cuerpo: `Te levantaste a las ${aHora(w)} y aún no has anotado ninguna toma. Toca la primera.`
		});
	}
	if (activo(cfg, "agua")) {
		const h = aMin(cfg.agua_hora ?? "12:00") ?? 720, min = cfg.agua_ml ?? 500;
		const t = total(x.hidraHoy);
		if (dentro(m, h, 90) && t < min) out.push({
			clave: "agua",
			id: "agua",
			titulo: "Hidratación",
			ruta: "hidratacion",
			cuerpo: `Son las ${aHora(h)} y llevas ${t} ml. Te faltan ${min - t} ml para los ${min} de mediodía. Bebe lejos de las comidas.`
		});
	}
	if (activo(cfg, "kcal")) {
		const rango = (cfg.rango_pct ?? 90) / 100;
		const sin = (s) => s.length ? ` Sin contar: ${s.join(", ").toLowerCase()} (anotaste otra cosa o no dijiste cuánto).` : "";
		const h = aMin(cfg.kcal_hora ?? "17:30") ?? 1050;
		if (dentro(m, h, 60)) {
			const k = kcalDia(nc, x.nutriHoy, x.menu, m);
			if (k.referenciaHasta) {
				const ok = k.comido >= k.referenciaHasta * rango;
				out.push({
					clave: "kcal-tarde",
					id: "kcal",
					titulo: "Kilocalorías",
					ruta: "nutricion",
					cuerpo: ok ? `Vas en rango: unas ${fmtKcal(k.comido)} kcal de ${fmtKcal(k.referenciaHasta)} previstas hasta ahora.${sin(k.sinDato)}` : `Vas por debajo: unas ${fmtKcal(k.comido)} kcal de ${fmtKcal(k.referenciaHasta)} previstas hasta ahora. Te faltan unas ${fmtKcal(k.referenciaHasta - k.comido)}: no te saltes el snack y haz la cena entera.${sin(k.sinDato)}`
				});
			}
		}
		const cena = defs[defs.length - 1];
		const xc = cena ? x.nutriHoy.tomas?.[cena.id] : void 0;
		const finCena = hecha(xc) ? finDe(xc) : null;
		const tope = (aMin(nc.cena_fin_max ?? "21:00") ?? 1260) + 30;
		const cuando = finCena != null ? finCena + 30 : tope;
		if (dentro(m, cuando, 90)) {
			const k = kcalDia(nc, x.nutriHoy, x.menu, null);
			const ref = k.referenciaContable;
			if (ref) {
				const pct = Math.round(k.comido / ref * 100);
				const de = k.deMenu ? "del menú" : "pautadas";
				out.push({
					clave: "kcal-dia",
					id: "kcal",
					titulo: "Kilocalorías del día",
					ruta: "nutricion",
					cuerpo: (k.comido >= ref * rango ? `Hoy, en rango: unas ${fmtKcal(k.comido)} kcal de ${fmtKcal(ref)} ${de} (${pct} %).` : `Hoy te has quedado por debajo: unas ${fmtKcal(k.comido)} kcal de ${fmtKcal(ref)} ${de} (${pct} %).`) + (finCena == null ? " La cena aún no está anotada." : "") + sin(k.sinDato)
				});
			}
		}
	}
	if (activo(cfg, "dormir")) {
		const cena = defs[defs.length - 1];
		const xc = cena ? x.nutriHoy.tomas?.[cena.id] : void 0;
		const fin = hecha(xc) ? aMin(xc?.fin) : null;
		const tras = x.objCfg.dormir_tras_cena_min ?? 120;
		if (fin != null && dentro(m, fin + tras, 60)) out.push({
			clave: "dormir",
			id: "dormir",
			titulo: "A dormir",
			ruta: "nutricion",
			cuerpo: `Han pasado ${tras % 60 ? `${Math.floor(tras / 60)} h ${tras % 60} min` : `${tras / 60} horas`} desde que terminaste de cenar (${aHora(fin)}). Ya puedes irte a la cama.`
		});
	}
	if (activo(cfg, "pendiente")) {
		const ultima = defs[defs.length - 1];
		for (const t of defs.filter((t) => t.principal && !(t === ultima && activo(cfg, "cena")))) {
			const xt = x.nutriHoy.tomas?.[t.id], l = limite(t);
			if (l != null && !hecha(xt) && xt?.estado !== "no" && dentro(m, l + 30, 60)) out.push({
				clave: "pendiente-" + t.id,
				id: "pendiente",
				titulo: t.nombre,
				ruta: "nutricion",
				cuerpo: `${t.nombre} (${t.hasta ? `${t.hora}–${t.hasta}` : t.hora}) sigue sin anotar. ¿La has hecho?`
			});
		}
	}
	if (activo(cfg, "cena")) {
		const cena = defs[defs.length - 1];
		const xc = cena ? x.nutriHoy.tomas?.[cena.id] : void 0;
		const max = aMin(nc.cena_fin_max ?? "21:00") ?? 1260;
		if (cena && !hecha(xc) && aMin(xc?.ini) == null && dentro(m, max - 30, 30)) out.push({
			clave: "cena",
			id: "cena",
			titulo: "Cena",
			ruta: "nutricion",
			cuerpo: `Son las ${aHora(max - 30)}: la cena tiene que estar terminada a las ${aHora(max)}.`
		});
	}
	return out;
}
/** Quita los ya enviados hoy y evita dos avisos de comer seguidos: la «primera toma» no sale si un aviso
*  de ayuno salió hace menos de 45 minutos (o sale a la vez). `enviados` = clave → minuto del día. */
function filtrar(avisos, enviados, ahoraMin) {
	const nuevos = avisos.filter((a) => enviados[a.clave] == null);
	const ayunoReciente = nuevos.some((a) => a.id === "ayuno") || Object.entries(enviados).some(([k, v]) => k.startsWith("ayuno-") && ahoraMin - v < 45);
	return nuevos.filter((a) => !(a.id === "primera" && ayunoReciente));
}
/** Texto discreto para la pantalla bloqueada. */
const discreto = (a) => ({
	...a,
	titulo: "New Version",
	cuerpo: `Tienes un aviso de ${a.ruta === "hidratacion" ? "Hidratación" : "Nutrición"}.`
});
/** Más de estos días sin regla entre dos días con regla = empieza un ciclo nuevo. */
const SALTO = 9;
/** Ciclos fuera de este intervalo no entran en la media (suele ser una regla sin registrar). */
const MIN_CICLO = 15;
const MAX_CICLO = 45;
/** Agrupa los días con regla en reglas. El manchado no abre ciclo. */
function reglasDe(m) {
	const out = [];
	for (const d of Object.keys(m).filter((k) => m[k]?.regla).sort()) {
		const u = out[out.length - 1];
		if (u && diffDays(d, u.fin) <= SALTO) u.fin = d;
		else out.push({
			inicio: d,
			fin: d
		});
	}
	return out;
}
const mediaDe = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
function crearModelo(m, cfg, hoy) {
	const reglas = reglasDe(m);
	const duraciones = reglas.slice(1).map((r, i) => diffDays(r.inicio, reglas[i].inicio));
	const validas = duraciones.filter((n) => n >= MIN_CICLO && n <= MAX_CICLO).slice(-6);
	const cerradas = reglas.filter((r) => diffDays(hoy, r.fin) > 1 && r.fin > r.inicio).slice(-6);
	return {
		hoy,
		reglas,
		duraciones,
		media: validas.length ? mediaDe(validas) : cfg.duracion_defecto || 28,
		nMedia: validas.length,
		mediaRegla: cerradas.length ? mediaDe(cerradas.map((r) => diffDays(r.fin, r.inicio) + 1)) : 5,
		lutea: cfg.lutea_dias || 14,
		critica: cfg.critica_dias ?? 7
	};
}
/** Ciclo al que pertenece una fecha. `null` si es anterior a la primera regla registrada. */
function cicloDe(mo, date) {
	const { reglas, media, mediaRegla, lutea, hoy } = mo;
	if (!reglas.length || date < reglas[0].inicio) return null;
	let i = reglas.length - 1;
	while (reglas[i].inicio > date) i--;
	const r = reglas[i];
	const con = (c) => ({
		...c,
		ovulacion: addDays(c.siguiente, -lutea)
	});
	if (i < reglas.length - 1) return con({
		inicio: r.inicio,
		siguiente: reglas[i + 1].inicio,
		finRegla: r.fin,
		previsto: false,
		siguientePrevisto: false
	});
	let sig = addDays(r.inicio, media);
	if (sig < hoy) sig = hoy;
	if (date < sig) {
		const enCurso = diffDays(hoy, r.fin) <= 1;
		const finPrevisto = addDays(r.inicio, mediaRegla - 1);
		return con({
			inicio: r.inicio,
			siguiente: sig,
			finRegla: enCurso && finPrevisto > r.fin ? finPrevisto : r.fin,
			previsto: false,
			siguientePrevisto: true
		});
	}
	let s = sig;
	while (date >= addDays(s, media)) s = addDays(s, media);
	return con({
		inicio: s,
		siguiente: addDays(s, media),
		finRegla: addDays(s, mediaRegla - 1),
		previsto: true,
		siguientePrevisto: true
	});
}
function infoDia(mo, m, date) {
	const c = cicloDe(mo, date);
	if (!c) return null;
	const fertilDesde = addDays(c.ovulacion, -5);
	const enRegla = date <= c.finRegla;
	const fase = enRegla ? "menstrual" : date < fertilDesde ? "folicular" : date <= c.ovulacion ? "ovulatoria" : "lutea";
	return {
		ciclo: c,
		dia: diffDays(date, c.inicio) + 1,
		fase,
		reglaPrevista: enRegla && !m[date]?.regla && date >= mo.hoy,
		fertil: fase === "ovulatoria",
		ovulacion: date === c.ovulacion,
		critica: mo.critica > 0 && date >= addDays(c.siguiente, -mo.critica) && date < c.siguiente
	};
}
//#endregion
//#region supabase/functions/avisos/webpush.ts
const enc = new TextEncoder();
const texto8 = (t) => new Uint8Array(enc.encode(t));
const b64url = (buf) => {
	const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	let s = "";
	for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const desB64url = (s) => {
	const t = s.replace(/-/g, "+").replace(/_/g, "/");
	const bin = atob(t + "=".repeat((4 - t.length % 4) % 4));
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const unir = (...partes) => {
	const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
	let i = 0;
	for (const p of partes) {
		out.set(p, i);
		i += p.length;
	}
	return out;
};
async function hmac(clave, datos) {
	const k = await crypto.subtle.importKey("raw", clave, {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	return new Uint8Array(await crypto.subtle.sign("HMAC", k, datos));
}
/** Clave privada VAPID (`d`, base64url) con su pública (punto sin comprimir, base64url) → clave para firmar. */
async function clavePrivada(publica, privada) {
	const p = desB64url(publica);
	const jwk = {
		kty: "EC",
		crv: "P-256",
		d: privada,
		x: b64url(p.slice(1, 33)),
		y: b64url(p.slice(33, 65)),
		ext: true
	};
	return crypto.subtle.importKey("jwk", jwk, {
		name: "ECDSA",
		namedCurve: "P-256"
	}, false, ["sign"]);
}
/** Cabecera Authorization con la firma VAPID para el servicio de avisos de ese endpoint. */
async function vapid(endpoint, publica, privada, sujeto) {
	const aud = new URL(endpoint).origin;
	const cab = b64url(texto8(JSON.stringify({
		typ: "JWT",
		alg: "ES256"
	})));
	const cuerpo = b64url(texto8(JSON.stringify({
		aud,
		exp: Math.floor(Date.now() / 1e3) + 43200,
		sub: sujeto
	})));
	const firma = await crypto.subtle.sign({
		name: "ECDSA",
		hash: "SHA-256"
	}, await clavePrivada(publica, privada), texto8(`${cab}.${cuerpo}`));
	return `vapid t=${cab}.${cuerpo}.${b64url(firma)}, k=${publica}`;
}
/** Cifra el contenido para una suscripción (un solo registro aes128gcm). */
async function cifrar(sub, texto) {
	const uaPub = desB64url(sub.keys.p256dh);
	const auth = desB64url(sub.keys.auth);
	const par = await crypto.subtle.generateKey({
		name: "ECDH",
		namedCurve: "P-256"
	}, true, ["deriveBits"]);
	const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
	const uaKey = await crypto.subtle.importKey("raw", uaPub, {
		name: "ECDH",
		namedCurve: "P-256"
	}, false, []);
	const ikm = await hmac(await hmac(auth, new Uint8Array(await crypto.subtle.deriveBits({
		name: "ECDH",
		public: uaKey
	}, par.privateKey, 256))), unir(texto8("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])));
	const sal = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	const prk = await hmac(sal, ikm);
	const cek = (await hmac(prk, unir(texto8("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
	const nonce = (await hmac(prk, unir(texto8("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
	const claveAes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
	const datos = unir(texto8(texto), new Uint8Array([2]));
	const cifrado = new Uint8Array(await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: nonce
	}, claveAes, datos));
	const rs = new Uint8Array([
		0,
		0,
		16,
		0
	]);
	return unir(sal, rs, new Uint8Array([asPub.length]), asPub, cifrado);
}
/** Envía un aviso. `caducada` = la suscripción ya no vale (el móvil la retiró) y hay que borrarla. */
async function enviar(sub, contenido, v, ttl = 3600) {
	const cuerpo = await cifrar(sub, JSON.stringify(contenido));
	const r = await fetch(sub.endpoint, {
		method: "POST",
		headers: {
			Authorization: await vapid(sub.endpoint, v.publica, v.privada, v.sujeto),
			"Content-Encoding": "aes128gcm",
			"Content-Type": "application/octet-stream",
			TTL: String(ttl),
			Urgency: "high"
		},
		body: cuerpo
	});
	const detalle = r.ok ? void 0 : (await r.text().catch(() => "")).slice(0, 300);
	return {
		ok: r.ok,
		estado: r.status,
		caducada: r.status === 404 || r.status === 410,
		detalle
	};
}
//#endregion
//#region supabase/functions/avisos/fuente.ts
const APP_URL = Deno.env.get("APP_URL") ?? "https://montsereina.github.io/new-version/";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUJETO = Deno.env.get("VAPID_SUBJECT") ?? APP_URL;
const SECRETO = Deno.env.get("AVISOS_SECRETO") ?? "";
const PROVIDER = "avisos";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: {
	persistSession: false,
	autoRefreshToken: false
} });
const cors = {
	"Access-Control-Allow-Origin": new URL(APP_URL).origin,
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: {
		...cors,
		"Content-Type": "application/json"
	}
});
async function leerFila(userId) {
	const { data, error } = await admin.from("integrations").select("secret,state").eq("user_id", userId).eq("provider", PROVIDER).maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}
async function guardarFila(userId, f) {
	const { error } = await admin.from("integrations").upsert({
		user_id: userId,
		provider: PROVIDER,
		secret: f.secret,
		state: f.state
	});
	if (error) throw new Error(error.message);
}
/** Fecha (AAAA-MM-DD) y minuto del día en la zona horaria de la usuaria. */
function ahoraEn(tz, d = /* @__PURE__ */ new Date()) {
	const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).formatToParts(d).map((x) => [x.type, x.value]));
	return {
		hoy: `${p.year}-${p.month}-${p.day}`,
		min: Number(p.hour) * 60 + Number(p.minute),
		hm: `${p.hour}:${p.minute}`
	};
}
async function diario(userId, modulo, desde, hasta) {
	const { data, error } = await admin.from("entries").select("day,value").eq("user_id", userId).eq("module", modulo).eq("kind", "dia").gte("day", desde).lte("day", hasta).is("deleted_at", null);
	if (error) throw new Error(error.message);
	return new Map((data ?? []).map((r) => [r.day, r.value]));
}
/** Claves VAPID de la usuaria: se crean la primera vez y se guardan en su fila. */
async function clavesDe(userId, fila) {
	if (fila.secret.vapid?.publica && fila.secret.vapid.privada) return fila.secret.vapid;
	const par = await crypto.subtle.generateKey({
		name: "ECDSA",
		namedCurve: "P-256"
	}, true, ["sign", "verify"]);
	const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
	const x = desB64url(jwk.x), y = desB64url(jwk.y);
	const pub = /* @__PURE__ */ new Uint8Array(65);
	pub[0] = 4;
	pub.set(x, 1);
	pub.set(y, 33);
	const vapid = {
		publica: b64url(pub),
		privada: jwk.d
	};
	fila.secret = {
		...fila.secret,
		vapid
	};
	await guardarFila(userId, fila);
	return vapid;
}
/** Envía un aviso a todos los móviles de la usuaria. Devuelve los móviles que siguen valiendo. */
async function mandar(subs, a, ttl, claves) {
	const vivas = [], fallos = [];
	let enviado = false;
	for (const s of subs) try {
		const r = await enviar(s, {
			titulo: a.titulo,
			cuerpo: a.cuerpo,
			ruta: a.ruta,
			tag: a.clave
		}, {
			...claves,
			sujeto: SUJETO
		}, ttl);
		if (r.ok) enviado = true;
		else fallos.push(`${r.estado} ${r.detalle ?? ""}`.trim());
		if (!r.caducada) vivas.push(s);
	} catch (e) {
		fallos.push(String(e));
		vivas.push(s);
	}
	return {
		vivas,
		enviado,
		fallos
	};
}
/** Revisa los avisos de una usuaria y envía los que tocan ahora. */
async function revisar(userId, fila) {
	const { data: perfil } = await admin.from("profiles").select("timezone").eq("id", userId).maybeSingle();
	const { hoy, min, hm } = ahoraEn(perfil?.timezone || "Europe/Madrid");
	const { data: ajustes } = await admin.from("settings").select("data").eq("user_id", userId).maybeSingle();
	const cfg = ajustes?.data ?? {};
	const nutriCfg = cfg.nutricion ?? {};
	const ayer = addDays(hoy, -1);
	const [nutri, hidra, ciclo] = await Promise.all([
		diario(userId, "nutricion", ayer, hoy),
		diario(userId, "hidratacion", hoy, hoy),
		diario(userId, "ciclo", addDays(hoy, -400), hoy)
	]);
	const mapa = Object.fromEntries(ciclo);
	const info = infoDia(crearModelo(mapa, cfg.ciclo ?? {}, hoy), mapa, hoy);
	const avisosCfg = cfg.avisos ?? {};
	const todos = avisosAhora({
		hoy,
		ahoraMin: min,
		cfg: avisosCfg,
		nutriCfg,
		hidraCfg: cfg.hidratacion ?? null,
		objCfg: cfg.objetivos ?? {},
		menu: menuDe(nutriCfg, info, hoy),
		nutriHoy: nutri.get(hoy) ?? {},
		nutriAyer: nutri.get(ayer) ?? null,
		hidraHoy: hidra.get(hoy) ?? {}
	});
	const enviados = { ...fila.state.enviados?.[hoy] ?? {} };
	const nuevos = filtrar(todos, enviados, min);
	let subs = fila.secret.subs ?? [];
	const ultimos = [...fila.state.ultimos ?? []];
	const fallos = [];
	for (const a of nuevos) {
		const r = await mandar(subs, avisosCfg.texto === "discreto" ? discreto(a) : a, 3600, fila.secret.vapid);
		subs = r.vivas;
		fallos.push(...r.fallos);
		enviados[a.clave] = min;
		if (r.enviado) ultimos.unshift({
			cuando: `${hoy} ${hm}`,
			titulo: a.titulo,
			cuerpo: a.cuerpo
		});
	}
	if (!nuevos.length && subs.length === (fila.secret.subs ?? []).length) return { enviados: 0 };
	const guardados = Object.fromEntries(Object.entries(fila.state.enviados ?? {}).filter(([d]) => d >= ayer));
	await guardarFila(userId, {
		secret: {
			...fila.secret,
			subs
		},
		state: {
			...fila.state,
			enviados: {
				...guardados,
				[hoy]: enviados
			},
			ultimos: ultimos.slice(0, 20),
			...fallos.length ? { fallo: {
				cuando: `${hoy} ${hm}`,
				detalle: fallos.slice(0, 3)
			} } : {}
		}
	});
	return {
		enviados: nuevos.length,
		fallos: fallos.length
	};
}
Deno.serve(async (req) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
	if (req.method !== "POST") return json({ error: "Método no admitido" }, 405);
	try {
		const cuerpo = await req.json().catch(() => ({}));
		if (cuerpo.accion === "revisar") {
			if (SECRETO && req.headers.get("x-avisos-secreto") !== SECRETO) return json({ error: "No autorizado" }, 401);
			const { data, error } = await admin.from("integrations").select("user_id,secret,state").eq("provider", PROVIDER);
			if (error) throw new Error(error.message);
			const res = [];
			for (const f of data ?? []) {
				if (!f.secret?.subs?.length || !f.secret.vapid) continue;
				try {
					res.push(await revisar(f.user_id, f));
				} catch (e) {
					res.push({ error: String(e) });
				}
			}
			return json({
				ok: true,
				usuarias: res.length,
				res
			});
		}
		const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
		const { data: quien, error: errQuien } = await admin.auth.getUser(jwt);
		if (errQuien || !quien?.user) return json({ error: "Sesión no válida" }, 401);
		const userId = quien.user.id;
		const fila = await leerFila(userId) ?? {
			secret: {},
			state: {}
		};
		if (cuerpo.accion === "clave") return json({ clave: (await clavesDe(userId, fila)).publica });
		if (cuerpo.accion === "estado") return json({
			moviles: (fila.secret.subs ?? []).map((s) => ({
				endpoint: s.endpoint,
				dispositivo: s.dispositivo ?? "",
				alta: s.alta ?? ""
			})),
			ultimos: fila.state.ultimos ?? []
		});
		if (cuerpo.accion === "suscribir") {
			const s = cuerpo.sub;
			if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth || !/^https:\/\//.test(s.endpoint)) return json({ error: "Suscripción no válida" }, 400);
			const subs = (fila.secret.subs ?? []).filter((x) => x.endpoint !== s.endpoint);
			subs.push({
				endpoint: s.endpoint,
				keys: {
					p256dh: s.keys.p256dh,
					auth: s.keys.auth
				},
				dispositivo: (cuerpo.dispositivo ?? "").slice(0, 60),
				alta: (/* @__PURE__ */ new Date()).toISOString()
			});
			await guardarFila(userId, {
				...fila,
				secret: {
					...fila.secret,
					subs: subs.slice(-5)
				}
			});
			return json({ ok: true });
		}
		if (cuerpo.accion === "baja") {
			const subs = (fila.secret.subs ?? []).filter((x) => x.endpoint !== cuerpo.endpoint);
			await guardarFila(userId, {
				...fila,
				secret: {
					...fila.secret,
					subs
				}
			});
			return json({ ok: true });
		}
		if (cuerpo.accion === "prueba") {
			const subs = fila.secret.subs ?? [];
			if (!subs.length) return json({ error: "No hay ningún móvil con los avisos activados." }, 400);
			const r = await mandar(subs, {
				clave: "prueba",
				id: "ayuno",
				titulo: "New Version",
				cuerpo: "Aviso de prueba: los avisos llegan a este móvil.",
				ruta: "avisos"
			}, 600, await clavesDe(userId, fila));
			if (r.vivas.length !== subs.length) await guardarFila(userId, {
				...fila,
				secret: {
					...fila.secret,
					subs: r.vivas
				}
			});
			return r.enviado ? json({ ok: true }) : json({ error: "No se ha podido enviar: " + (r.fallos[0] ?? "sin respuesta") }, 502);
		}
		return json({ error: "Acción desconocida" }, 400);
	} catch (e) {
		return json({ error: String(e instanceof Error ? e.message : e) }, 500);
	}
});
//#endregion
