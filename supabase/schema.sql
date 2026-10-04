-- =====================================================================
--  New Version — esquema de base de datos (PostgreSQL / Supabase)
--  Ejecutar completo en: Supabase → SQL Editor → New query → Run
--
--  Principios:
--   · Cada fila pertenece a una usuaria (user_id) y solo ella la ve (RLS).
--   · Modelo flexible en dos tablas: `definitions` (QUÉ se registra: un
--     suplemento, un hábito, una comida, un marcador…) y `entries`
--     (CADA registro, con su día). Un módulo nuevo es un valor nuevo de
--     `module`, no una tabla nueva.
--   · Los detalles de cada módulo van en JSONB (`config`, `value`) para
--     ampliar sin migraciones.
--   · Borrado lógico (deleted_at): nada se pierde de verdad.
-- =====================================================================

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Perfil ---------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea el perfil al registrarse la usuaria.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Ajustes (un documento por usuaria) -----------------------
create table if not exists settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Definiciones: QUÉ se registra ----------------------------
create table if not exists definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module text not null,                 -- 'suplementos', 'habitos', 'comidas', 'analiticas'…
  kind text not null default 'item',    -- subtipo dentro del módulo
  label text not null,
  config jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists definitions_user_module on definitions(user_id, module);

-- ---------- Registros: CADA anotación --------------------------------
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module text not null,
  definition_id uuid references definitions(id) on delete set null,
  kind text not null default 'registro',  -- 'dia' = documento diario del módulo (uno por día)
  day date not null,                    -- día al que pertenece el registro
  at timestamptz,                       -- momento exacto, si importa
  value jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists entries_user_day on entries(user_id, day);
create index if not exists entries_user_module_day on entries(user_id, module, day);
create unique index if not exists entries_un_dia_por_modulo
  on entries(user_id, module, day) where kind = 'dia' and deleted_at is null;

-- ---------- updated_at automático ------------------------------------
do $$ declare t text; begin
  foreach t in array array['profiles','settings','definitions','entries'] loop
    execute format('drop trigger if exists %I_updated on %I', t, t);
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Seguridad: cada usuaria solo ve lo suyo -------------------
alter table profiles    enable row level security;
alter table settings    enable row level security;
alter table definitions enable row level security;
alter table entries     enable row level security;

drop policy if exists own_profile on profiles;
create policy own_profile on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists own_settings on settings;
create policy own_settings on settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_definitions on definitions;
create policy own_definitions on definitions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_entries on entries;
create policy own_entries on entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Quien no ha iniciado sesión no accede a nada.
revoke all on profiles, settings, definitions, entries from anon;
grant select, insert, update, delete on profiles, settings, definitions, entries to authenticated;

-- ---------- Conexiones con servicios externos (esquema v3) -----------
-- Permisos de Google Calendar, Oura… Solo la lee la pieza de servidor (Edge Functions):
-- seguridad por fila activada y ninguna regla; desde la app no se puede leer.
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
