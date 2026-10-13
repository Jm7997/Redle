-- Puesto del día (sin nombres): cuántos jugadores lo hicieron mejor que tú en el mismo modo.
-- kos = Pokémon del rival derribados (para ordenar a los que pierden).
alter table public.results add column kos smallint check (kos between 0 and 6);
grant insert (kos) on public.results to anon, authenticated;

-- Orden: en la Liga, más rivales vencidos. Contra un rival: ganar antes que perder; ganando, menos turnos;
-- perdiendo, más Pokémon derribados y, a igualdad, aguantar más turnos. Los empates comparten puesto.
create function public.daily_rank(p_day date, p_mode text, p_won boolean, p_turns int, p_kos int, p_reached int)
returns table (better bigint, total bigint)
language sql stable security definer set search_path = ''
as $$
  select count(*) filter (where case
           when p_mode = 'liga' then r.reached > p_reached
           when p_won then r.won and r.turns < p_turns
           else r.won or r.kos > p_kos or (r.kos = p_kos and r.turns > p_turns)
         end),
         count(*)
  from public.results r
  where r.day = p_day and r.mode = p_mode
$$;
revoke execute on function public.daily_rank(date, text, boolean, int, int, int) from public;
grant execute on function public.daily_rank(date, text, boolean, int, int, int) to anon, authenticated;
