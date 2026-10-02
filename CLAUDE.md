# New Version — notas para Claude

- App personal de salud de la propietaria del repositorio. Una sola usuaria; preparada para más.
- Mismo método que el repositorio `Cuaderno` (Huma): demostración → visto bueno → versión numerada. No publicar sin aprobación.
- Idioma de la interfaz y de los comentarios: español de España.
- Nunca incluir datos personales o de salud en el código, tampoco como datos de ejemplo.
- Acceso a datos solo a través de `src/store/repo.ts`. Módulos en `src/modules/<nombre>/`, dados de alta en `src/modules/index.ts`.
- Estilos solo con las variables de `src/styles/tokens.css`.
- Cambios de tablas: editar `supabase/schema.sql`, subir `SCHEMA_VERSION` y añadir la migración en `supabase/`.
- Subir `APP_VERSION` (`src/lib/version.ts`) y `version` de `package.json` en cada publicación.
- Comidas: sin calorías ni gramos. Sin ayunos ni restricción calórica como marco.
