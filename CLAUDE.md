# New Version — notas para Claude

- App personal de salud de la propietaria del repositorio. Una sola usuaria; preparada para más.
- Mismo método que el repositorio `Cuaderno` (Huma): demostración → visto bueno → versión numerada. No publicar sin aprobación.
- Idioma de la interfaz y de los comentarios: español de España.
- Nunca incluir datos personales o de salud en el código, tampoco como datos de ejemplo.
- Acceso a datos solo a través de `src/store/repo.ts`. Módulos en `src/modules/<nombre>/`, dados de alta en `src/modules/index.ts`.
- Estilos solo con las variables de `src/styles/tokens.css`.
- Cambios de tablas: editar `supabase/schema.sql`, subir `SCHEMA_VERSION` y añadir la migración en `supabase/`.
- Subir `APP_VERSION` (`src/lib/version.ts`) y `version` de `package.json` en cada publicación.
- Comidas: sin gramos. Las kilocalorías (estimadas por plato) solo como suelo que alcanzar, nunca como tope ni con avisos por pasarse. La referencia es la cifra diaria pautada por nutrición clínica (`kcal_min`) o, sin ella, lo previsto en su propio menú del día; nunca una cifra puesta por Claude. Sin ayunos ni restricción calórica como marco.
- Kilocalorías de lo escrito en «Otro»: catálogo genérico en `src/modules/nutricion/alimentos.ts` (raciones caseras, sin datos personales). En comida y cena (plato dibujado) los estados son «Hecha» y «No»: la cantidad sale del plato, con el reparto `partes` de cada plato (proporciones de verdura, proteína e hidratos) guardado en los ajustes de la usuaria.
- Avisos al móvil: reglas en `src/modules/avisos/reglas.ts`; la función `supabase/functions/avisos/index.ts` se genera con `npm run build:avisos` y se pega en Supabase (Verify JWT desactivado). No necesita secretos: crea sus claves VAPID por usuaria. Volver a generarla y desplegarla cuando cambien las reglas o la lógica de Nutrición, Hidratación o Ciclo.
