-- New Version — sincronización automática con Oura.
-- Llama a la función `oura` cada 30 minutos desde la base de datos (pg_cron + pg_net). Sin cambios de tablas.
-- La función decide por la hora de cada usuaria: sincroniza cada media hora de 7:30 a 23:30, y mientras falte histórico.
-- Ejecutar una vez en Supabase → SQL Editor. Se puede repetir: sustituye la tarea si ya existe.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'oura-new-version';

select cron.schedule(
  'oura-new-version',
  '0,30 * * * *',
  $$
  select net.http_post(
    url := 'https://dyvztjrbnovuoblbtgmo.supabase.co/functions/v1/oura',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"accion": "auto"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- Para comprobarlo: select * from cron.job_run_details where command like '%oura%' order by start_time desc limit 5;
