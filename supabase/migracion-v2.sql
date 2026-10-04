-- New Version — migración a la versión 2 del esquema (app 0.2.0)
-- Añade el tipo de registro: 'dia' es el documento diario de un módulo (uno por día y módulo);
-- 'registro' es una anotación suelta. Ejecutar una vez en Supabase → SQL Editor.
alter table entries add column if not exists kind text not null default 'registro';
create unique index if not exists entries_un_dia_por_modulo
  on entries(user_id, module, day) where kind = 'dia' and deleted_at is null;
