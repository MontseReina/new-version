-- New Version — migración a la versión 3 del esquema (app 0.3.3)
-- Conexiones con servicios externos (Google Calendar; más adelante, Oura).
-- Guarda los permisos que da la usuaria. Solo la lee la pieza de servidor (Edge Functions):
-- tiene la seguridad por fila activada y ninguna regla, así que desde la app no se puede leer.
-- Ejecutar una vez en Supabase → SQL Editor.
create table if not exists integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,                     -- 'google_calendar', 'oura'…
  secret jsonb not null default '{}'::jsonb,  -- permisos (tokens); nunca salen del servidor
  state jsonb not null default '{}'::jsonb,   -- estado de la sincronización
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
drop trigger if exists integrations_updated on integrations;
create trigger integrations_updated before update on integrations for each row execute function set_updated_at();
alter table integrations enable row level security;
revoke all on integrations from anon, authenticated;
