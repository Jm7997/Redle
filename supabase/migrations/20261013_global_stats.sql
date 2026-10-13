-- Estadísticas globales de Redle (proyecto Supabase "redle", eu-west-1).
-- Resultados anónimos de cada partida diaria: un registro por navegador, día y modo.
create table public.results (
  id bigint generated always as identity primary key,
  day date not null,
  mode text not null check (mode in ('blue', 'red', 'lance', 'steven', 'wallace', 'cynthia', 'iris', 'leon', 'liga')),
  player uuid not null,
  won boolean not null,
  turns smallint check (turns between 1 and 1000),
  reached smallint check (reached between 0 and 5),
  created_at timestamptz not null default now(),
  unique (day, mode, player)
);
create index results_day_mode on public.results (day, mode);

alter table public.results enable row level security;

-- Los visitantes solo pueden apuntar resultados de hoy o ayer (hora de España); nunca leer, editar ni borrar.
create policy "insertar resultado del dia" on public.results
  for insert to anon, authenticated
  with check (day between (now() at time zone 'Europe/Madrid')::date - 1 and (now() at time zone 'Europe/Madrid')::date);

revoke all on public.results from anon, authenticated;
grant insert (day, mode, player, won, turns, reached) on public.results to anon, authenticated;

-- Estadísticas agregadas del día por modo (sin datos individuales). SECURITY DEFINER a propósito:
-- los visitantes no pueden leer la tabla, solo estos totales.
create function public.daily_stats(p_day date)
returns table (mode text, players bigint, wins bigint, avg_turns numeric, reached int[])
language sql stable security definer set search_path = ''
as $$
  select r.mode,
         count(*),
         count(*) filter (where r.won),
         round(avg(r.turns) filter (where r.won), 1),
         array[
           count(*) filter (where r.reached = 0), count(*) filter (where r.reached = 1), count(*) filter (where r.reached = 2),
           count(*) filter (where r.reached = 3), count(*) filter (where r.reached = 4), count(*) filter (where r.reached = 5)
         ]::int[]
  from public.results r
  where r.day = p_day
  group by r.mode
$$;
revoke execute on function public.daily_stats(date) from public;
grant execute on function public.daily_stats(date) to anon, authenticated;
