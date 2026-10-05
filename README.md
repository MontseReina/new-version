# New Version

App personal de salud y hábitos. Web instalable en el móvil (PWA), con los datos en la nube.

## Estado: v0.4.0 — Ciclo dentro de Signos y síntomas

Diseño según el manual de marca SADHAKA (el mismo de Huma). Navegación por áreas, Inicio con los
objetivos de hoy y primer módulo: Hidratación. Incluye además:

- Entrada sin contraseña: enlace por correo (o pegando el enlace, con la app instalada).
- Conexión a la base de datos (Supabase, servidor en Irlanda).
- Navegación base: Inicio, Datos, Ajustes.
- Descarga de una copia completa de los datos (JSON).
- Instalable en el móvil y aviso de versión (`version.json`).

## Arquitectura

| Pieza | Tecnología |
|---|---|
| Web | React + TypeScript + Vite, PWA |
| Datos y usuarios | Supabase (PostgreSQL + Auth) |
| Publicación | GitHub Actions (`.github/workflows/deploy.yml`) |

### Modelo de datos (`supabase/schema.sql`)

- `definitions`: **qué** se registra (un suplemento, un hábito, una comida, un marcador).
- `entries`: **cada** registro, ligado a un día.
- `settings`: ajustes de la usuaria. `profiles`: perfil.

Un módulo nuevo es un valor nuevo de `module`, no una tabla nueva. Todas las tablas tienen
seguridad por fila: cada usuaria solo ve lo suyo.

### Código

- `src/store/repo.ts`: única puerta a los datos. Los módulos no llaman a Supabase directamente.
- `src/modules/index.ts`: registro de módulos. Cada módulo vive en `src/modules/<nombre>/` y se da de alta con una línea.
- `src/styles/tokens.css`: colores, tipografía y medidas. Los componentes solo usan estas variables.

## Reglas

- Ningún dato personal o de salud en el código, ni como ejemplo.
- La contraseña de la base de datos y la clave `service_role` no van en ningún fichero.
- Cada versión: demostración, visto bueno, subir `APP_VERSION` y publicar.

## Desarrollo

```bash
npm install
cp .env.example .env   # rellenar con la dirección y la clave pública de Supabase
npm run dev
npm run build:demo   # demostración en un solo fichero, sin cuenta ni base de datos
```
