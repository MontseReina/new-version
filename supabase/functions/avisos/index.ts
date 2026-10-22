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
//#region src/modules/nutricion/alimentos.ts
const A = (id, nombre, grupo, u, k, s, n, np) => ({
	id,
	nombre,
	grupo,
	u,
	k,
	s,
	n,
	np
});
const VERDURAS = [
	A("brocoli", "Brócoli", "verdura", "1 ración (150 g)", 50, [
		"brocoli",
		"brocolis",
		"brecol"
	]),
	A("coliflor", "Coliflor", "verdura", "1 ración (150 g)", 38, ["coliflor"]),
	A("col", "Col o repollo", "verdura", "1 ración (150 g)", 35, [
		"col",
		"repollo",
		"lombarda",
		"col lombarda"
	]),
	A("col_china", "Col china", "verdura", "1 ración (150 g)", 25, [
		"col china",
		"pak choi",
		"bok choy"
	]),
	A("kale", "Kale", "verdura", "1 ración (100 g)", 45, ["kale", "col rizada"]),
	A("coles_bruselas", "Coles de Bruselas", "verdura", "1 ración (100 g)", 43, ["coles de bruselas", "col de bruselas"]),
	A("espinacas", "Espinacas", "verdura", "1 ración (100 g)", 23, ["espinaca", "espinacas"]),
	A("acelgas", "Acelgas", "verdura", "1 ración (150 g)", 30, ["acelga", "acelgas"]),
	A("judias_verdes", "Judías verdes", "verdura", "1 ración (150 g)", 45, [
		"judias verdes",
		"judia verde",
		"judiasverdes",
		"vainas"
	]),
	A("calabacin", "Calabacín", "verdura", "1 ración (150 g)", 25, ["calabacin", "calabacines"]),
	A("berenjena", "Berenjena", "verdura", "1 ración (150 g)", 38, ["berenjena"]),
	A("calabaza", "Calabaza", "verdura", "1 ración (200 g)", 50, ["calabaza"]),
	A("zanahoria", "Zanahoria", "verdura", "1 mediana (80 g)", 32, ["zanahoria"], 1, 2),
	A("pimiento", "Pimiento", "verdura", "1/2 pimiento (100 g)", 30, [
		"pimiento",
		"pimientos asados",
		"pimiento asado"
	]),
	A("tomate", "Tomate", "verdura", "1 mediano (150 g)", 30, [
		"tomate",
		"tomate natural",
		"tomate rallado"
	]),
	A("tomate_frito", "Tomate frito o salsa de tomate", "verdura", "2 cucharadas (40 g)", 30, [
		"tomate frito",
		"salsa de tomate",
		"tomate triturado"
	]),
	A("cherry", "Tomates cherry", "verdura", "1 puñado (6 unidades)", 12, [
		"tomates cherry",
		"tomate cherry",
		"cherrys",
		"cherry"
	]),
	A("cebolla", "Cebolla", "verdura", "1/4 de cebolla (50 g)", 20, ["cebolla", "cebolleta"]),
	A("puerro", "Puerro", "verdura", "1 puerro (100 g)", 30, ["puerro"]),
	A("alcachofa", "Alcachofas", "verdura", "4 corazones (150 g)", 65, ["alcachofa", "alcachofas"]),
	A("esparragos", "Espárragos", "verdura", "6 espárragos (100 g)", 25, [
		"esparrago",
		"esparragos",
		"trigueros",
		"esparragos trigueros"
	]),
	A("setas", "Setas o champiñones", "verdura", "1 puñado (100 g)", 25, [
		"seta",
		"setas",
		"champiñon",
		"champiñones",
		"boletus",
		"shiitake"
	]),
	A("hojas", "Lechuga u hojas verdes", "verdura", "1 puñado (50 g)", 10, [
		"lechuga",
		"canonigos",
		"rucula",
		"escarola",
		"brotes",
		"hojas verdes",
		"berros",
		"endibia",
		"endibias"
	]),
	A("ensalada", "Ensalada", "verdura", "1 plato (150 g)", 30, [
		"ensalada",
		"ensalada verde",
		"ensalada mixta"
	]),
	A("pepino", "Pepino", "verdura", "1/2 pepino (80 g)", 12, ["pepino"]),
	A("apio", "Apio", "verdura", "1 rama (50 g)", 8, ["apio"]),
	A("remolacha", "Remolacha", "verdura", "1 ración (100 g)", 45, ["remolacha"]),
	A("hinojo", "Hinojo", "verdura", "1/2 bulbo (100 g)", 30, ["hinojo"]),
	A("verduras", "Verduras", "verdura", "1 ración (200 g)", 60, [
		"verdura",
		"verduras",
		"verduras al vapor",
		"verdura al vapor",
		"menestra"
	]),
	A("salteado", "Salteado de verduras", "verdura", "1 plato (200 g)", 110, [
		"salteado de verduras",
		"verduras salteadas",
		"wok de verduras"
	]),
	A("pisto", "Pisto", "verdura", "1 ración (200 g)", 140, ["pisto", "samfaina"]),
	A("pure", "Puré o crema de verduras", "verdura", "1 cuenco (300 ml)", 120, [
		"pure",
		"crema",
		"crema de verduras",
		"pure de verduras"
	]),
	A("sopa", "Sopa de verduras", "verdura", "1 cuenco (300 ml)", 80, ["sopa", "sopa de verduras"]),
	A("caldo", "Caldo", "bebida", "1 taza (250 ml)", 25, [
		"caldo",
		"caldo de verduras",
		"caldo de pollo",
		"caldo de huesos"
	])
];
/** «Puré de calabaza», «crema de calabacín»…: un solo puré, sin contar la verdura otra vez. */
const PURES = VERDURAS.filter((v) => v.grupo === "verdura" && ![
	"pure",
	"sopa",
	"ensalada",
	"verduras",
	"salteado",
	"pisto",
	"hojas",
	"cherry",
	"tomate_frito"
].includes(v.id)).flatMap((v) => v.s.map((w) => w));
const PROTEINAS = [
	A("pollo", "Pechuga de pollo", "proteina", "1 pechuga pequeña (130 g)", 145, [
		"pollo",
		"pechuga",
		"pechuga de pollo",
		"pollo a la plancha",
		"pollo desmigado",
		"pollo asado"
	]),
	A("pollo_muslo", "Muslos o contramuslos de pollo", "proteina", "2 contramuslos (150 g limpios)", 230, [
		"contramuslo",
		"contramuslos",
		"muslo de pollo",
		"muslos de pollo",
		"muslitos",
		"muslito",
		"alitas",
		"alitas de pollo"
	]),
	A("codorniz", "Codorniz", "proteina", "1 codorniz", 190, [
		"codorniz",
		"codornices",
		"alitas de codorniz"
	]),
	A("bacon", "Beicon o panceta", "proteina", "2 lonchas (30 g)", 120, [
		"bacon",
		"beicon",
		"beacon",
		"panceta",
		"chorizo",
		"salchichon",
		"fuet",
		"salchicha",
		"salchichas"
	]),
	A("pavo", "Pavo", "proteina", "1 filete (130 g)", 140, [
		"pavo",
		"filete de pavo",
		"pechuga de pavo",
		"secreto de pavo"
	]),
	A("pavo_fiambre", "Pavo cocido en lonchas", "proteina", "3-4 lonchas (50 g)", 55, [
		"pavo cocido",
		"fiambre de pavo",
		"lonchas de pavo",
		"pavo en lonchas",
		"jamon de pavo",
		"jamon pavo"
	]),
	A("jamon", "Jamón serrano", "proteina", "2 lonchas (30 g)", 75, [
		"jamon",
		"jamon serrano",
		"jamon iberico"
	]),
	A("jamon_york", "Jamón cocido", "proteina", "2 lonchas (30 g)", 35, ["jamon york", "jamon cocido"]),
	A("ternera", "Ternera", "proteina", "1 filete (140 g)", 200, [
		"ternera",
		"filete de ternera",
		"carne de ternera",
		"carne roja",
		"buey",
		"entrecot"
	]),
	A("carne_picada", "Carne picada o albóndigas", "proteina", "1 ración (130 g)", 250, [
		"carne picada",
		"albondiga",
		"albondigas"
	]),
	A("hamburguesa", "Hamburguesa (solo la carne)", "proteina", "1 hamburguesa (120 g)", 250, ["hamburguesa", "hamburguesas"]),
	A("cerdo", "Cerdo", "proteina", "1 ración (130 g)", 190, [
		"cerdo",
		"lomo",
		"solomillo",
		"solomillo de cerdo",
		"lomo de cerdo",
		"secreto",
		"costillas"
	]),
	A("cordero", "Cordero", "proteina", "1 ración (130 g)", 300, ["cordero"]),
	A("conejo", "Conejo", "proteina", "1 ración (150 g)", 200, ["conejo"]),
	A("salmon", "Salmón", "proteina", "1 lomo (150 g)", 300, ["salmon"]),
	A("salmon_ahumado", "Salmón ahumado", "proteina", "2 lonchas (40 g)", 70, ["salmon ahumado"]),
	A("atun", "Atún o bonito fresco", "proteina", "1 rodaja (150 g)", 200, [
		"atun",
		"bonito",
		"atun fresco",
		"tataki"
	]),
	A("atun_lata", "Atún en lata", "proteina", "1 lata pequeña (60 g escurrido)", 120, [
		"atun en lata",
		"lata de atun",
		"atun al natural",
		"atun en aceite"
	]),
	A("sardinas", "Sardinas", "proteina", "1 ración (150 g)", 210, [
		"sardina",
		"sardinas",
		"sardinillas"
	]),
	A("caballa", "Caballa", "proteina", "1 ración (150 g)", 285, ["caballa", "verdel"]),
	A("boquerones", "Boquerones", "proteina", "1 ración (150 g)", 170, [
		"boqueron",
		"boquerones",
		"anchoas frescas"
	]),
	A("anchoas", "Anchoas en lata", "proteina", "5 anchoas (20 g)", 40, ["anchoa", "anchoas"]),
	A("merluza", "Merluza o pescado blanco", "proteina", "1 lomo (150 g)", 120, [
		"merluza",
		"pescado",
		"pescado blanco",
		"bacalao",
		"gallo",
		"lenguado",
		"rape",
		"pescadilla",
		"abadejo",
		"panga"
	]),
	A("lubina", "Lubina", "proteina", "1 ración (150 g)", 170, ["lubina", "corvina"]),
	A("dorada", "Dorada", "proteina", "1 ración (150 g)", 240, ["dorada"]),
	A("trucha", "Trucha", "proteina", "1 ración (150 g)", 210, ["trucha"]),
	A("marisco", "Gambas o langostinos", "proteina", "1 ración (100 g pelados)", 90, [
		"gamba",
		"gambas",
		"langostino",
		"langostinos",
		"marisco"
	]),
	A("mejillones", "Mejillones", "proteina", "1 ración (150 g)", 130, [
		"mejillon",
		"mejillones",
		"almejas",
		"berberechos"
	]),
	A("calamar", "Calamar, sepia o pulpo", "proteina", "1 ración (150 g)", 120, [
		"calamar",
		"calamares",
		"sepia",
		"pulpo",
		"chipirones"
	]),
	A("huevo", "Huevo", "proteina", "1 huevo", 70, [
		"huevo",
		"huevo cocido",
		"huevo duro",
		"huevo a la plancha",
		"huevo frito",
		"huevo poche",
		"yema",
		"yemas"
	], 1, 2),
	A("huevos_revueltos", "Huevos revueltos", "proteina", "1 huevo", 85, [
		"revuelto",
		"huevos revueltos",
		"revuelto de huevo"
	], 2, 2),
	A("tortilla", "Tortilla francesa", "proteina", "1 tortilla (2 huevos)", 200, ["tortilla", "tortilla francesa"]),
	A("tofu", "Tofu", "proteina", "1 ración (125 g)", 150, ["tofu"]),
	A("tempeh", "Tempeh", "proteina", "1 ración (100 g)", 190, ["tempeh"]),
	A("proteina_polvo", "Proteína en polvo", "proteina", "1 cacito (25 g)", 95, [
		"proteina",
		"proteina en polvo",
		"proteina de guisante",
		"whey",
		"colageno"
	])
];
const LACTEOS = [
	A("yogur", "Yogur natural", "lacteo", "1 yogur (125 g)", 110, [
		"yogur",
		"yogurt",
		"iogurt",
		"yogur natural",
		"yogur de oveja",
		"yogur de cabra"
	]),
	A("yogur_coco", "Yogur de coco", "lacteo", "1 yogur (125 g)", 120, [
		"yogur de coco",
		"yogurt de coco",
		"iogurt de coco"
	]),
	A("yogur_griego", "Yogur griego", "lacteo", "1 yogur (125 g)", 150, ["yogur griego"]),
	A("kefir", "Kéfir", "lacteo", "1 vaso (200 ml)", 120, ["kefir"]),
	A("cuajada", "Cuajada", "lacteo", "1 cuajada (125 g)", 120, ["cuajada"]),
	A("queso", "Queso curado o semicurado", "lacteo", "1 cuña (30 g)", 120, [
		"queso",
		"queso curado",
		"queso semicurado",
		"queso de cabra",
		"queso de oveja",
		"manchego",
		"queso rallado"
	]),
	A("queso_fresco", "Queso fresco", "lacteo", "2 rodajas (60 g)", 110, [
		"queso fresco",
		"queso de burgos",
		"mozzarella",
		"burrata",
		"feta"
	]),
	A("queso_crema", "Queso crema", "lacteo", "1 cucharada colmada (30 g)", 75, [
		"queso crema",
		"queso untable",
		"philadelphia"
	]),
	A("requeson", "Requesón", "lacteo", "2 cucharadas (50 g)", 75, ["requeson", "ricotta"]),
	A("parmesano", "Parmesano", "lacteo", "1 cucharada (10 g)", 40, ["parmesano"]),
	A("leche", "Leche", "lacteo", "1 vaso (250 ml)", 160, [
		"leche",
		"leche de vaca",
		"leche sin lactosa"
	]),
	A("bebida_vegetal", "Bebida vegetal", "lacteo", "1 vaso (250 ml)", 50, [
		"bebida vegetal",
		"leche de coco",
		"leche de almendras",
		"leche de avena",
		"leche de arroz",
		"bebida de coco",
		"bebida de almendras",
		"bebida de avena"
	]),
	A("leche_coco_lata", "Leche de coco de lata", "grasa", "1/4 de lata (100 ml)", 190, [
		"leche de coco de lata",
		"crema de coco",
		"nata de coco"
	]),
	A("nata", "Nata", "grasa", "2 cucharadas (30 ml)", 100, ["nata"])
];
const HIDRATOS = [
	A("patata", "Patata", "hidrato", "1 mediana (150 g)", 115, [
		"patata",
		"patata cocida",
		"patata asada",
		"papa",
		"patatas al horno"
	], 1, 1),
	A("patatas_fritas", "Patatas fritas", "hidrato", "1 ración (100 g)", 300, ["patatas fritas", "patata frita"]),
	A("boniato", "Boniato", "hidrato", "1 mediano (150 g)", 135, [
		"boniato",
		"batata",
		"moniato"
	]),
	A("arroz", "Arroz", "hidrato", "1 plato pequeño (150 g cocido)", 195, [
		"arroz",
		"arroz blanco",
		"arroz integral",
		"arroz basmati",
		"risotto"
	]),
	A("quinoa", "Quinoa", "hidrato", "1 plato pequeño (150 g cocida)", 180, ["quinoa", "quinua"]),
	A("pasta", "Pasta", "hidrato", "1 plato (60 g en crudo)", 210, [
		"pasta",
		"macarrones",
		"espaguetis",
		"fideos",
		"pasta sin gluten",
		"tallarines",
		"noodles"
	]),
	A("cereal_cocido", "Trigo sarraceno, mijo o cuscús", "hidrato", "1 plato pequeño (150 g cocido)", 160, [
		"trigo sarraceno",
		"alforfon",
		"mijo",
		"cuscus",
		"bulgur",
		"amaranto"
	]),
	A("pan", "Pan", "hidrato", "1 rebanada (30 g)", 75, [
		"pan",
		"pan sin gluten",
		"pan de trigo sarraceno",
		"pan integral",
		"pan de molde",
		"bocadillo"
	], 2),
	A("tostada", "Tostada", "hidrato", "1 tostada (30 g)", 75, [
		"tostada",
		"tostada de pan",
		"tostadas de pan"
	], 1, 2),
	A("tortitas_arroz", "Tortitas de arroz o maíz", "hidrato", "1 tortita", 30, [
		"tortitas de arroz",
		"tortitas de maiz",
		"tortita de arroz"
	], 3),
	A("avena", "Copos de avena o cereales", "hidrato", "4 cucharadas (40 g)", 150, [
		"avena",
		"copos de avena",
		"cereales",
		"muesli",
		"granola",
		"porridge",
		"gachas"
	]),
	A("yuca", "Yuca o plátano macho", "hidrato", "1 ración (150 g)", 240, [
		"yuca",
		"mandioca",
		"platano macho",
		"patacones",
		"patacon",
		"tostones"
	]),
	A("crema_arroz", "Crema de arroz", "hidrato", "2 cucharadas (20 g)", 72, ["crema de arroz", "harina de arroz"]),
	A("crackers", "Crackers o picos", "hidrato", "1 puñado (30 g)", 130, [
		"cracker",
		"crackers",
		"picos",
		"regañas",
		"tostas"
	]),
	A("maiz", "Maíz", "hidrato", "1 ración (100 g)", 90, ["maiz", "mazorca"]),
	A("legumbres", "Legumbres cocidas", "hidrato", "1 plato (200 g cocidas)", 230, [
		"legumbres",
		"lentejas",
		"garbanzos",
		"alubias",
		"judias blancas",
		"guisantes",
		"habas",
		"azukis",
		"frijoles"
	]),
	A("harina", "Harina (castaña, almendra, coco)", "hidrato", "4 cucharadas (40 g)", 150, [
		"harina",
		"harina de castaña",
		"harina de trigo sarraceno"
	])
];
const FRUTAS = [
	A("manzana", "Manzana", "fruta", "1 manzana (150 g)", 80, [
		"manzana",
		"manzana asada",
		"compota"
	]),
	A("pera", "Pera", "fruta", "1 pera (150 g)", 85, ["pera"]),
	A("platano", "Plátano", "fruta", "1 plátano (120 g)", 105, ["platano", "banana"]),
	A("naranja", "Naranja", "fruta", "1 naranja (180 g)", 85, ["naranja", "pomelo"]),
	A("mandarina", "Mandarina", "fruta", "1 mandarina (70 g)", 35, ["mandarina", "clementina"], 1, 2),
	A("kiwi", "Kiwi", "fruta", "1 kiwi", 50, ["kiwi"], 1, 2),
	A("uvas", "Uvas", "fruta", "1 racimo pequeño (120 g)", 85, ["uva", "uvas"]),
	A("caqui", "Caqui", "fruta", "1 caqui", 105, [
		"caqui",
		"kaki",
		"persimon"
	]),
	A("granada", "Granada", "fruta", "1/2 granada", 75, ["granada"]),
	A("fresas", "Fresas", "fruta", "1 ración (150 g)", 50, [
		"fresa",
		"fresas",
		"freson",
		"fresones"
	]),
	A("frutos_rojos", "Frutos rojos", "fruta", "1 puñado (60 g)", 30, [
		"frutos rojos",
		"frutos del bosque",
		"arandanos",
		"arandano",
		"frambuesas",
		"frambuesa",
		"moras",
		"cerezas"
	]),
	A("melocoton", "Melocotón o nectarina", "fruta", "1 pieza", 60, [
		"melocoton",
		"nectarina",
		"paraguayo",
		"albaricoque",
		"albaricoques"
	]),
	A("ciruela", "Ciruelas", "fruta", "2 ciruelas", 50, ["ciruela", "ciruelas"]),
	A("pina", "Piña", "fruta", "2 rodajas (150 g)", 75, ["piña"]),
	A("mango", "Mango", "fruta", "1/2 mango", 100, ["mango", "papaya"]),
	A("melon", "Melón o sandía", "fruta", "1 tajada (200 g)", 65, ["melon", "sandia"]),
	A("higos", "Higos", "fruta", "2 higos", 75, ["higo", "higos"]),
	A("datiles", "Dátiles", "fruta", "2 dátiles", 130, ["datil", "datiles"]),
	A("pasas", "Pasas o fruta desecada", "fruta", "1 cucharada (15 g)", 45, [
		"pasas",
		"orejones",
		"fruta desecada",
		"ciruelas pasas"
	]),
	A("fruta", "Fruta", "fruta", "1 pieza", 75, ["fruta", "pieza de fruta"]),
	A("zumo", "Zumo", "bebida", "1 vaso (200 ml)", 90, ["zumo", "zumo de naranja"]),
	A("limon", "Limón", "fruta", "1 chorrito", 3, ["limon", "lima"])
];
const GRASAS = [
	A("aceite", "Aceite", "grasa", "1 cucharada (10 ml)", 90, [
		"aceite",
		"aceite de oliva",
		"aove",
		"aceite de coco",
		"aceite de sesamo"
	]),
	A("mct", "Aceite MCT", "grasa", "1 cucharada (15 ml)", 120, ["mct", "aceite mct"]),
	A("mantequilla", "Mantequilla o ghee", "grasa", "1 cucharadita (10 g)", 75, [
		"mantequilla",
		"ghee",
		"margarina"
	]),
	A("aguacate", "Aguacate", "grasa", "1/2 aguacate (80 g)", 130, ["aguacate", "guacamole"]),
	A("aceitunas", "Aceitunas", "grasa", "6-8 aceitunas", 40, [
		"aceituna",
		"aceitunas",
		"olivas"
	]),
	A("frutos_secos", "Frutos secos", "grasa", "1 puñado (20 g)", 125, [
		"frutos secos",
		"almendra",
		"almendras",
		"nuez",
		"nueces",
		"avellana",
		"avellanas",
		"anacardo",
		"anacardos",
		"pistacho",
		"pistachos",
		"macadamia",
		"macadamias",
		"piñones",
		"nueces de brasil"
	]),
	A("cacahuetes", "Cacahuetes", "grasa", "1 puñado (20 g)", 115, [
		"cacahuete",
		"cacahuetes",
		"mani"
	]),
	A("crema_fs", "Crema de frutos secos o tahini", "grasa", "1 cucharada (15 g)", 95, [
		"crema de almendras",
		"crema de avellanas",
		"crema de cacahuete",
		"mantequilla de cacahuete",
		"tahini",
		"tahin",
		"crema de frutos secos",
		"crema de anacardos"
	]),
	A("semillas", "Semillas", "grasa", "1 cucharada (10 g)", 50, [
		"semillas",
		"lino",
		"linaza",
		"chia",
		"sesamo",
		"pipas",
		"semillas de calabaza",
		"semillas de girasol",
		"semillas de lino",
		"semillas de chia",
		"cañamo"
	]),
	A("coco", "Coco rallado", "grasa", "1 cucharada (10 g)", 65, [
		"coco",
		"coco rallado",
		"coco seco",
		"coco deshidratado"
	]),
	A("mayonesa", "Mayonesa o alioli", "grasa", "1 cucharada (15 g)", 100, [
		"mayonesa",
		"alioli",
		"salsa"
	]),
	A("hummus", "Hummus", "grasa", "2 cucharadas (50 g)", 150, ["hummus", "humus"])
];
const DULCES = [
	A("miel", "Miel", "dulce", "1 cucharadita (10 g)", 30, [
		"miel",
		"sirope",
		"sirope de agave",
		"melaza"
	]),
	A("azucar", "Azúcar", "dulce", "1 cucharadita (8 g)", 32, ["azucar", "panela"]),
	A("mermelada", "Mermelada", "dulce", "1 cucharadita (15 g)", 35, ["mermelada", "confitura"]),
	A("chocolate", "Chocolate negro", "dulce", "2 onzas (20 g)", 115, [
		"chocolate",
		"chocolate negro",
		"onza",
		"onzas"
	]),
	A("nibs", "Nibs de cacao", "dulce", "1 cucharadita (5 g)", 30, [
		"nibs",
		"nibs de cacao",
		"nibs de chocolate",
		"cacao",
		"cacao puro"
	]),
	A("galletas", "Galletas", "dulce", "3 galletas (30 g)", 140, [
		"galleta",
		"galletas",
		"cookies"
	]),
	A("bizcocho", "Bizcocho o bizcochito", "dulce", "1 porción (60 g)", 230, [
		"bizcocho",
		"bizcochito",
		"bizcochitos",
		"brownie",
		"banana bread"
	]),
	A("muffin", "Muffin o magdalena", "dulce", "1 unidad", 250, [
		"muffin",
		"muffins",
		"magdalena",
		"magdalenas",
		"cupcake"
	]),
	A("bolleria", "Bollería", "dulce", "1 pieza", 260, [
		"croissant",
		"cruasan",
		"napolitana",
		"bolleria",
		"donut",
		"ensaimada"
	]),
	A("tarta", "Tarta", "dulce", "1 porción (100 g)", 300, ["tarta", "pastel"]),
	A("helado", "Helado", "dulce", "2 bolas (100 g)", 200, ["helado"]),
	A("pudding_chia", "Pudding de chía", "dulce", "1 vaso", 220, [
		"pudding de chia",
		"pudin de chia",
		"pudding",
		"pudding de chia con leche de coco",
		"pudding de chia con bebida vegetal",
		"pudding de chia con leche de almendras"
	]),
	A("natillas", "Natillas, flan o arroz con leche", "dulce", "1 unidad", 150, [
		"natillas",
		"flan",
		"arroz con leche",
		"crema catalana"
	]),
	A("tortitas", "Tortitas o crepes", "dulce", "3 tortitas", 250, [
		"tortitas",
		"tortita",
		"pancakes",
		"crepes",
		"crepe",
		"gofre",
		"gofres"
	]),
	A("barrita", "Barrita", "dulce", "1 barrita", 200, [
		"barrita",
		"barritas",
		"barrita energetica",
		"barrita de proteina"
	]),
	A("bunuelo", "Buñuelo", "dulce", "1 buñuelo", 110, [
		"buñuelo",
		"buñuelos",
		"buñuelo de crema",
		"buñuelos de crema",
		"profiterol",
		"profiteroles"
	]),
	A("rollito", "Rollito salado de horno", "dulce", "1 rollito", 330, ["rollito", "rollitos"])
];
const PLATOS = [
	A("tortilla_patata", "Tortilla de patata", "plato", "1 ración (150 g)", 230, [
		"tortilla de patata",
		"tortilla de patatas",
		"tortilla española"
	]),
	A("paella", "Paella o arroz con cosas", "plato", "1 plato (300 g)", 420, [
		"paella",
		"arroz con pollo",
		"arroz con verduras",
		"arroz meloso",
		"arroz caldoso"
	]),
	A("lentejas", "Lentejas o garbanzos guisados", "plato", "1 plato (300 g)", 330, [
		"lentejas estofadas",
		"cocido",
		"potaje",
		"fabada",
		"garbanzos con espinacas"
	]),
	A("croquetas", "Croquetas", "plato", "3 croquetas", 230, ["croqueta", "croquetas"]),
	A("empanadilla", "Empanadilla o empanada", "plato", "1 pieza", 200, [
		"empanadilla",
		"empanadillas",
		"empanada"
	]),
	A("pizza", "Pizza", "plato", "2 porciones", 500, ["pizza"]),
	A("sandwich", "Sándwich", "plato", "1 sándwich", 300, [
		"sandwich",
		"sandwiches",
		"mixto",
		"wrap",
		"wrap de yuca",
		"bocadillo de jamon",
		"bocadillo"
	]),
	A("ensaladilla", "Ensaladilla", "plato", "1 ración (200 g)", 300, ["ensaladilla", "ensaladilla rusa"]),
	A("gazpacho", "Gazpacho o salmorejo", "plato", "1 vaso (250 ml)", 120, ["gazpacho", "salmorejo"]),
	A("lasana", "Lasaña o canelones", "plato", "1 ración (250 g)", 400, [
		"lasaña",
		"canelones",
		"musaka",
		"moussaka"
	]),
	A("batido", "Batido", "plato", "1 vaso grande", 350, [
		"batido",
		"smoothie",
		"licuado"
	]),
	A("sushi", "Sushi", "plato", "8 piezas", 350, [
		"sushi",
		"maki",
		"poke"
	]),
	A("pan_tomate", "Pan con tomate", "plato", "1 tostada", 140, ["pan con tomate", "tostada con tomate"]),
	A("huevos_rotos", "Huevos rotos", "plato", "1 plato", 500, ["huevos rotos", "huevos con patatas"])
];
const BEBIDAS = [
	A("cafe_leche", "Café con leche", "bebida", "1 taza", 70, [
		"cafe con leche",
		"cortado",
		"capuchino",
		"latte"
	]),
	A("sin_kcal", "Agua, café solo o infusión", "bebida", "1 vaso o taza", 0, [
		"agua",
		"cafe",
		"cafe solo",
		"te",
		"infusion",
		"manzanilla",
		"tila",
		"poleo",
		"rooibos"
	]),
	A("refresco", "Refresco", "bebida", "1 lata", 140, [
		"refresco",
		"cola",
		"coca cola",
		"fanta",
		"tonica"
	]),
	A("alcohol", "Cerveza o vino", "bebida", "1 caña o copa", 100, [
		"cerveza",
		"vino",
		"cava",
		"sidra"
	])
];
const PURE = VERDURAS.find((v) => v.id === "pure");
/** Puré o crema de una verdura concreta: cuenta como el puré, no como la verdura. */
PURE.s = [...PURE.s, ...PURES.flatMap((w) => [`pure de ${w}`, `crema de ${w}`])];
const ALIMENTOS = [
	...VERDURAS,
	...PROTEINAS,
	...LACTEOS,
	...HIDRATOS,
	...FRUTAS,
	...GRASAS,
	...DULCES,
	...PLATOS,
	...BEBIDAS
];
/** Minúsculas y sin tildes (la ñ se queda). */
const normalizar = (t) => t.toLowerCase().replace(/(.)\1{2,}/g, "$1$1").replace(/ñ/g, "\0").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\u0000/g, "ñ");
const NUMEROS = {
	un: 1,
	una: 1,
	uno: 1,
	dos: 2,
	tres: 3,
	cuatro: 4,
	cinco: 5,
	seis: 6,
	medio: .5,
	media: .5,
	"un poco de": .5,
	poco: .5,
	"un par de": 2,
	par: 2
};
const UNIDADES = "rebanadas?|lonchas?|cucharadas?|cucharaditas?|cdas?|cdtas?|pu(?:ñ|n)ados?|vasos?|tazas?|piezas?|filetes?|trozos?|latas?|unidades?|uds?|raci(?:on|ones)|platos?|cuencos?|bolas?|onzas?|lomos?|rodajas?|tajadas?|porci(?:on|ones)|corazon(?:es)?|cacitos?|chorritos?|hojas?";
const RE_CANT = new RegExp(`(?:^|\\s)(\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|un par de|un poco de|un|una|uno|dos|tres|cuatro|cinco|seis|medio|media|poco|par)\\s+(?:(${UNIDADES})\\s+)?(?:de\\s+)?$`);
const RE_UNIDAD = new RegExp(`^(?:${UNIDADES})$`);
/** Palabras que no son alimentos y no hace falta reconocer. */
const RELLENO = new Set("un una uno unos unas dos tres cuatro cinco seis medio media poco mucho algo par de del con sin y e o al a la el los las lo en para por mas menos tambien solo sola plancha horno vapor asado asada asados asadas cocido cocida cocidos cocidas hervido hervida frito frita fritos fritas salteado salteada guisado guisada estofado estofada casero casera natural integral grande pequeño pequeña mediano mediana buen buena trocitos troceado microondas papillote rebozado rebozada gratinado gratinada crudo cruda tibio tibia caliente frio fria resto mitad entero entera mio mia albahaca perejil oregano tomillo romero cilantro eneldo especias especia sal pimienta pimenton curcuma comino canela jengibre vinagre suravitasan".split(" "));
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATRONES = ALIMENTOS.flatMap((a) => a.s.map((s) => {
	const w = normalizar(s).split(/\s+/);
	const cuerpo = w.map((x) => escapar(x) + "(?:es|s)?").join("\\s+");
	return {
		re: new RegExp(`(?<![a-zñ0-9])${cuerpo}(?![a-zñ])`, "g"),
		a,
		largo: w.join(" ").length
	};
})).sort((x, y) => y.largo - x.largo);
const sinPlural = (w) => w.replace(/(?:es|s)$/, "");
/**
* Raciones caseras de varias piezas («2 dátiles», «2 lonchas (30 g)», «4 cucharadas (40 g)»): cuántas piezas
* tiene la ración y cómo se llama la pieza. Un número escrito con esa pieza («2 lonchas de jamón») o con el
* propio alimento cuando es la pieza («1 dátil», «3 croquetas») cuenta piezas, no raciones.
*/
function piezasDe(a, unidad) {
	const m = /^(\d+)\s+([^\s(]+)/.exec(a.u);
	if (!m || Number(m[1]) <= 1) return null;
	const pieza = sinPlural(normalizar(m[2]));
	return (unidad ? sinPlural(unidad) === pieza : a.s.some((x) => sinPlural(normalizar(x).split(" ").pop() ?? "") === pieza)) ? {
		n: Number(m[1]),
		nombre: m[2]
	} : null;
}
/** «dátiles» → «dátil», «lonchas» → «loncha», «corazones» → «corazón». */
const singular = (w) => /ones$/.test(w) ? w.replace(/ones$/, "ón") : /[^aeiou]es$/.test(w) && !/[rnl]es$/.test(w) ? w.slice(0, -1) : /(?:les|res|nes)$/.test(w) ? w.slice(0, -2) : w.replace(/s$/, "");
const fmtN = (n) => Number.isInteger(n) ? String(n) : n === .5 ? "½" : n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
/**
* Plato de Harvard: parte del plato que ocupa una ración casera de cada grupo (verdura y fruta, la mitad;
* proteína e hidratos, un cuarto; un plato combinado, el plato entero). En las tomas con plato dibujado,
* una fracción escrita («1/3 calabacín», «1/2 yuca») es la parte del plato, no de la pieza.
*/
const PARTE_PLATO = {
	verdura: .5,
	fruta: .5,
	proteina: .25,
	hidrato: .25,
	plato: 1
};
const FRAC = {
	"1/2": "½",
	"1/3": "⅓",
	"2/3": "⅔",
	"1/4": "¼",
	"3/4": "¾",
	"1/5": "⅕",
	"1/6": "⅙",
	"1/8": "⅛"
};
/** Lee los alimentos de un texto libre. Devuelve lo reconocido y los trozos que no se han reconocido.
*  `plato`: la toma lleva plato dibujado (comida y cena), y las fracciones son partes del plato. */
function leerAlimentos(texto, opciones = {}) {
	const original = normalizar(texto ?? "").replace(/(\d)([a-zñ])/g, "$1 $2");
	let resto = original;
	const hallados = [];
	for (const p of PATRONES) {
		p.re.lastIndex = 0;
		let m;
		while (m = p.re.exec(resto)) {
			hallados.push({
				ini: m.index,
				fin: m.index + m[0].length,
				a: p.a,
				txt: m[0]
			});
			resto = resto.slice(0, m.index) + " ".repeat(m[0].length) + resto.slice(m.index + m[0].length);
		}
	}
	hallados.sort((x, y) => x.ini - y.ini);
	const leidos = hallados.map((h) => {
		const antes = original.slice(0, h.ini).split(/[,;+\-]|\.(?!\d)|\s(?:y|con|e)\s/).pop() ?? "";
		const c = RE_CANT.exec(antes);
		let unidades, conNumero = false, piezas;
		if (c) {
			const v = c[1].replace(",", ".");
			const fr = /^(\d+)\/(\d+)$/.exec(v);
			unidades = fr ? Number(fr[1]) / Math.max(1, Number(fr[2])) : NUMEROS[v] ?? Number(v);
			conNumero = true;
			const pz = piezasDe(h.a, c[2]);
			const delPlato = opciones.plato && fr && !c[2] && unidades <= 1 ? PARTE_PLATO[h.a.grupo] : void 0;
			if (delPlato) {
				piezas = `${FRAC[v] ?? v} del plato`;
				unidades = unidades / delPlato;
			} else if (pz) {
				piezas = `${fmtN(unidades)} ${unidades <= 1 ? singular(pz.nombre) : pz.nombre}`;
				unidades = unidades / pz.n;
			}
		} else unidades = /s$/.test(h.txt) && !h.a.s.some((s) => normalizar(s) === h.txt) && h.a.np ? h.a.np : h.a.n ?? 1;
		return {
			alimento: h.a,
			texto: h.txt,
			unidades,
			conNumero,
			piezas,
			kcal: Math.round(h.a.k * unidades),
			ini: h.ini,
			fin: h.fin
		};
	});
	for (let i = leidos.length - 1; i > 0; i--) {
		const a = leidos[i - 1], b = leidos[i], entre = original.slice(a.fin, b.ini).trim();
		if (b.alimento.id === "huevo" && (a.alimento.id === "tortilla" || a.alimento.id === "huevos_revueltos") && /^(?:de)?(?:\s*\S+)?$/.test(entre) && (entre === "" || entre === "de" || b.conNumero)) {
			const n = b.conNumero ? b.unidades : 2;
			a.unidades = a.alimento.id === "tortilla" ? n / 2 : n;
			a.conNumero = true;
			a.kcal = Math.round(a.alimento.k * a.unidades);
			leidos.splice(i, 1);
		} else if (a.alimento.id === "fruta" && b.alimento.grupo === "fruta" && entre === "") leidos.splice(i - 1, 1);
		else if (a.alimento.id === b.alimento.id && (entre === "" || entre === "de")) leidos.splice(i, 1);
	}
	return {
		leidos,
		sinReconocer: resto.split(/[,;+.\n\-\/]|\s(?:y|con|e)\s/).map((x) => x.trim().replace(/\s+/g, " ")).filter((x) => x && !x.split(" ").every((w) => RELLENO.has(w) || RELLENO.has(w.replace(/e?s$/, "")) || RELLENO.has(w.replace(/s$/, "")) || /^\d+(?:[.,/]\d+)?$/.test(w) || RE_UNIDAD.test(w)))
	};
}
//#endregion
//#region src/modules/nutricion/logica.ts
/** Nutrición: forma de los datos y cálculos. Sin datos personales: menús, platos, horarios y
*  objetivos de cada usuaria viven en sus ajustes (base de datos), no en el código. */
const MENUS = {
	folicular: "Menú folicular",
	luteo: "Menú lúteo"
};
/** ¿Tiene la toma alguna parte del plato marcada? */
const platoMarcado = (x) => !!x?.plato && [
	"veg",
	"prot",
	"hid"
].some((k) => x.plato[k] != null);
/**
* Plato con el que se marcó una toma. Una toma ya marcada se queda con su plato aunque luego se cambie el que se
* sigue (las marcadas antes de poder elegir eran del plato de ½ verduras): cambiar el botón no cambia lo comido.
* Si aún no se ha marcado, el que se sigue ahora.
*/
const modeloDe = (cfg, x) => x?.plato?.modelo ?? (platoMarcado(x) ? "verdura" : cfg?.plato_modelo ?? "verdura");
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
			porque = `Día ${info.dia} del ciclo: la ovulación fue ${c.ovuConfirmada ? "el" : "hacia el"} ${fmtDate(c.ovulacion)}${c.ovuConfirmada ? " (Oura)" : ""}. Toca el menú lúteo hasta que venga la regla (${c.siguientePrevisto ? "prevista el " : ""}${fmtDate(c.siguiente)}).`;
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
const hecha = (t) => t?.estado === "entera" || t?.estado === "tres_cuartos" || t?.estado === "media" || t?.estado === "hecha" || anotada(t);
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
	hecha: 1,
	no: 0
};
/** Cantidad de cada parte del plato dibujado: nada, poca, la que toca y (hidratos) más de la que toca. */
const FACTOR_PLATO = {
	veg: [
		0,
		.5,
		1
	],
	prot: [
		0,
		.5,
		1
	],
	hid: [
		0,
		.5,
		1,
		1.5
	]
};
const PARTE_DEL_PLATO = {
	verdura: "veg",
	proteina: "prot",
	hidrato: "hid"
};
/**
* Con el plato de ½ hidratos, la parte de hidratos que toca es el doble que en el plato clásico y la de verdura,
* la mitad. Las kilocalorías de los platos del menú están calculadas con sus recetas (plato clásico), así que lo
* marcado se multiplica por estas proporciones.
*/
const ESCALA_MODELO = {
	verdura: {
		veg: 1,
		prot: 1,
		hid: 1
	},
	hidratos: {
		veg: .5,
		prot: 1,
		hid: 2
	}
};
/** Parte que se tomó de cada zona del plato dibujado (1 si no se ha marcado), según el plato que se sigue. */
function factoresPlato(x, modelo = "verdura") {
	const esc = ESCALA_MODELO[modelo];
	const f = (k) => {
		const n = x?.plato?.[k];
		return n == null ? null : (FACTOR_PLATO[k][n] ?? 1) * esc[k];
	};
	const veg = f("veg"), prot = f("prot"), hid = f("hid");
	const marcados = [
		veg,
		prot,
		hid
	].filter((v) => v != null);
	const resto = marcados.length ? marcados.reduce((s, v) => s + v, 0) / marcados.length : 1;
	return {
		veg: veg ?? 1,
		prot: prot ?? 1,
		hid: hid ?? 1,
		resto
	};
}
/** Kilocalorías del plato principal de una toma con plato dibujado, según lo marcado en el plato. */
function kcalConPlato(cfg, id, x) {
	const p = cfg.platos?.[id];
	if (p?.kcal == null) return null;
	const f = factoresPlato(x, modeloDe(cfg, x));
	if (!p.partes) return p.kcal * f.resto;
	const veg = p.partes.veg ?? 0, prot = p.partes.prot ?? 0, hid = p.partes.hid ?? 0;
	const resto = Math.max(0, 1 - veg - prot - hid);
	return p.kcal * (veg * f.veg + prot * f.prot + hid * f.hid + resto * f.resto);
}
/** Kilocalorías de lo escrito en «Otro»: cada alimento por su ración casera (o por el número escrito) y por la
*  cantidad marcada en el plato dibujado (verdura, proteína, hidratos) o, si no, en Entera, ¾ o Media. */
function kcalOtro(t, x, modelo = "verdura") {
	const { leidos, sinReconocer } = leerAlimentos(x?.otro ?? "", { plato: !!t.plato });
	const deToma = x?.estado && x.estado !== "no" ? PARTE[x.estado] : 1;
	const items = leidos.map((l) => {
		if (l.conNumero) return {
			...l,
			factor: 1,
			segun: "numero",
			kcalContadas: l.kcal
		};
		const parte = t.plato ? PARTE_DEL_PLATO[l.alimento.grupo] : void 0;
		const nivel = parte ? x?.plato?.[parte] : null;
		const factor = parte && nivel != null ? (FACTOR_PLATO[parte][nivel] ?? 1) * ESCALA_MODELO[modelo][parte] : deToma;
		const segun = parte && nivel != null ? "plato" : deToma !== 1 ? "toma" : null;
		return {
			...l,
			factor,
			segun,
			kcalContadas: Math.round(l.kcal * factor)
		};
	});
	return {
		items,
		sinReconocer,
		total: items.reduce((s, i) => s + i.kcalContadas, 0)
	};
}
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
	const sinDato = [], enParte = [];
	for (const t of tomasDe(cfg)) {
		const x = d.tomas?.[t.id];
		const delMenu = kcalDePlatos(cfg, platosDe(cfg, menu, t.id).map((p) => p.id));
		previsto = previsto == null || delMenu == null ? null : previsto + delMenu;
		if (hecha(x) || x?.estado === "no" || ahoraMin == null || limite(t) != null && ahoraMin >= limite(t) + 30) hasta = hasta == null || delMenu == null ? null : hasta + delMenu;
		if (!x || x.estado === "no" || !hecha(x)) continue;
		if (x.otro?.trim()) {
			const o = kcalOtro(t, x, modeloDe(cfg, x));
			if (!o.items.length) {
				sinDato.push(t.nombre);
				fuera += delMenu ?? 0;
				continue;
			}
			if (o.sinReconocer.length) enParte.push(t.nombre);
			comido += o.total;
			continue;
		}
		if (!x.estado) {
			sinDato.push(t.nombre);
			fuera += delMenu ?? 0;
			continue;
		}
		const todos = x.platos?.length ? x.platos : platosDe(cfg, menu, t.id).map((p) => p.id);
		if (x.estado === "hecha") {
			let k = 0;
			todos.forEach((id, i) => {
				if (k == null) return;
				const esPostre = !!t.postre && i > 0;
				if (esPostre && x.postre?.[id] === "no") return;
				const v = esPostre ? cfg.platos?.[id]?.kcal ?? null : kcalConPlato(cfg, id, x);
				k = v == null ? null : k + v;
			});
			if (k == null) {
				sinDato.push(t.nombre);
				fuera += delMenu ?? 0;
				continue;
			}
			comido += k;
			continue;
		}
		const k = kcalDePlatos(cfg, todos.filter((id) => x.postre?.[id] !== "no"));
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
		enParte,
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
			const nota = u.ayer && cenaId != null && !hecha(x.nutriAyer?.tomas?.[cenaId]) ? " (La cena de ayer no está anotada.)" : "";
			const primera = (defs[0]?.nombre ?? "primera toma").toLowerCase();
			if (dentro(u.minutos, max - 30, 30)) out.push({
				clave: "ayuno-antes",
				id: "ayuno",
				titulo: "Ayuno",
				ruta: "nutricion",
				cuerpo: algunaHoy ? `A las ${aHora(m + max - u.minutos)} se cumplen ${max / 60} horas desde tu última comida. Buen momento para preparar algo rico 🌿${nota}` : `A las ${aHora(m + max - u.minutos)} se cumplen tus ${max / 60} horas de descanso digestivo. Buen momento para preparar tu ${primera} 🌿${nota}`
			});
			else if (u.minutos >= max) {
				const h = Math.floor(u.minutos / 60);
				if (u.minutos - h * 60 < 30 && h <= 20) out.push({
					clave: "ayuno-" + h,
					id: "ayuno",
					titulo: "Ayuno",
					ruta: "nutricion",
					cuerpo: (h * 60 === max ? algunaHoy ? `¡${h} horas desde tu última comida! Ahora toca nutrirte.` : `¡${h} horas de descanso cumplidas! Ahora toca nutrirte: tu ${primera} te espera.` : `Han pasado ${h} horas desde tu última comida. Tu cuerpo agradecerá un poco de alimento ahora; date ese cuidado.`) + nota
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
			cuerpo: `Buenos días ☀️ Hace una hora que te levantaste: tu primera toma es el primer gesto de cuidado del día.`
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
			cuerpo: `Mediodía: llevas ${t} ml. ${min - t <= 250 ? "Un vaso más" : `Unos ${min - t} ml más`} y llegas a los ${min} 💧`
		});
	}
	if (activo(cfg, "kcal")) {
		const rango = (cfg.rango_pct ?? 90) / 100;
		const sin = (s) => s.length ? ` (Sin contar: ${s.join(", ").toLowerCase()}.)` : "";
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
					cuerpo: ok ? `¡Vas genial! Unas ${fmtKcal(k.comido)} kcal de las ${fmtKcal(k.referenciaHasta)} previstas hasta ahora. Sigue así 💪${sin(k.sinDato)}` : `Llevas unas ${fmtKcal(k.comido)} kcal. Con el snack y la cena entera te acercas a lo previsto: cada bocado suma.${sin(k.sinDato)}`
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
				k.deMenu;
				out.push({
					clave: "kcal-dia",
					id: "kcal",
					titulo: "Kilocalorías del día",
					ruta: "nutricion",
					cuerpo: (k.comido >= ref * rango ? `¡Día cumplido! Unas ${fmtKcal(k.comido)} kcal (${pct} %). Gracias por cuidarte hoy 🌸` : `Hoy has llegado a unas ${fmtKcal(k.comido)} kcal (${pct} %). Mañana es otra oportunidad para nutrirte un poquito más.`) + (finCena == null ? " Si ya has cenado, anótalo en la app 😊" : "") + sin(k.sinDato)
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
			cuerpo: `Ya han pasado ${tras % 60 ? `${Math.floor(tras / 60)} h ${tras % 60} min` : `${tras / 60} horas`} desde la cena. Buen momento para irte a descansar. Que duermas bien 🌙`
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
				cuerpo: `¿Qué tal ${t.nombre.toLowerCase() === "comida" ? "la comida" : t.nombre.toLowerCase() === "cena" ? "la cena" : "el " + t.nombre.toLowerCase()}? Cuando puedas, anótalo en la app 😊`
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
			cuerpo: `Son las ${aHora(max - 30)}: buen momento para empezar a cenar con calma y terminar antes de las ${aHora(max)}.`
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
		critica: cfg.critica_dias ?? 7,
		ovus: Object.keys(m).filter((k) => m[k]?.ovulacion).sort()
	};
}
/** Ovulación confirmada entre `desde` (incluido) y `hasta` (sin incluir); la última si hay varias. */
function ovuEntre(mo, desde, hasta) {
	const xs = mo.ovus.filter((d) => d >= desde && (!hasta || d < hasta));
	return xs[xs.length - 1];
}
/** Regla siguiente esperada para el último ciclo registrado: con la ovulación confirmada,
*  ovulación + fase lútea; sin ella, inicio + duración media. */
function siguienteEsperada(mo, r) {
	const ov = ovuEntre(mo, r.inicio);
	return ov ? addDays(ov, mo.lutea) : addDays(r.inicio, mo.media);
}
/** Ciclo al que pertenece una fecha. `null` si es anterior a la primera regla registrada. */
function cicloDe(mo, date) {
	const { reglas, media, mediaRegla, lutea, hoy } = mo;
	if (!reglas.length || date < reglas[0].inicio) return null;
	let i = reglas.length - 1;
	while (reglas[i].inicio > date) i--;
	const r = reglas[i];
	const con = (c) => {
		const ov = c.previsto ? void 0 : ovuEntre(mo, c.inicio, c.siguientePrevisto ? void 0 : c.siguiente);
		return {
			...c,
			ovulacion: ov ?? addDays(c.siguiente, -lutea),
			ovuConfirmada: !!ov
		};
	};
	if (i < reglas.length - 1) return con({
		inicio: r.inicio,
		siguiente: reglas[i + 1].inicio,
		finRegla: r.fin,
		previsto: false,
		siguientePrevisto: false
	});
	let sig = siguienteEsperada(mo, r);
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
