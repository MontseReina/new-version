-- New Version — revisión de los avisos al móvil cada cinco minutos.
-- Llama a la función `avisos` desde la base de datos (pg_cron + pg_net). Sin cambios de tablas.
-- Ejecutar una vez en Supabase → SQL Editor. Se puede repetir: sustituye la tarea si ya existe.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'avisos-new-version';

select cron.schedule(
  'avisos-new-version',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://dyvztjrbnovuoblbtgmo.supabase.co/functions/v1/avisos',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"accion": "revisar"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Para comprobarlo: select * from cron.job_run_details order by start_time desc limit 5;
-- y las respuestas de la función: select id, status_code, content, created from net._http_response order by created desc limit 5;
