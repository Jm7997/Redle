-- Hasta 3 intentos al día contra un rival: se guarda en qué intento acabó el día (ganando o perdiendo los 3).
-- En el puesto y el top cuenta antes ganar en menos intentos y luego en menos turnos. Sin intento = 1 (días anteriores).
alter table public.results add column tries smallint check (tries between 1 and 3);
grant insert (tries) on public.results to anon, authenticated;

drop function public.daily_rank(date, text, boolean, int, int, int);
create function public.daily_rank(p_day date, p_mode text, p_won boolean, p_turns int, p_kos int, p_reached int, p_tries int default 1)
returns table (better bigint, total bigint)
language sql stable security definer set search_path = '' as $$
  select count(*) filter (where case
           when p_mode = 'liga' then r.reached > p_reached
           when p_won then r.won and (coalesce(r.tries, 1) < p_tries or coalesce(r.tries, 1) = p_tries and r.turns < p_turns)
           else r.won or r.kos > p_kos or (r.kos = p_kos and r.turns > p_turns)
         end),
         count(*)
  from public.results r
  where r.day = p_day and r.mode = p_mode
$$;

drop function public.daily_top(date, text, uuid);
create function public.daily_top(p_day date, p_mode text, p_player uuid)
returns table (nickname text, won boolean, turns smallint, kos smallint, reached smallint, tries smallint, me boolean)
language sql stable security definer set search_path = '' as $$
  select n.nickname, r.won, r.turns, r.kos, r.reached, coalesce(r.tries, 1)::smallint, r.player = p_player
  from public.results r left join public.nicknames n on n.player = r.player
  where r.day = p_day and r.mode = p_mode
  order by r.reached desc nulls last, r.won desc, case when r.won then coalesce(r.tries, 1) end asc,
           case when r.won then r.turns end asc, r.kos desc nulls last, r.turns desc, r.created_at
  limit 10
$$;

drop function public.daily_wins(date, text);
create function public.daily_wins(p_day date, p_mode text)
returns table (nickname text, turns smallint, tries smallint, replay text)
language sql stable security definer set search_path = '' as $$
  select n.nickname, r.turns, coalesce(r.tries, 1)::smallint, r.replay
  from public.results r left join public.nicknames n on n.player = r.player
  where r.day = p_day and r.mode = p_mode and r.won and r.replay is not null
  order by coalesce(r.tries, 1), r.turns asc nulls last, r.created_at
  limit 10
$$;

revoke execute on function public.daily_rank(date, text, boolean, int, int, int, int), public.daily_top(date, text, uuid),
  public.daily_wins(date, text) from public;
grant execute on function public.daily_rank(date, text, boolean, int, int, int, int), public.daily_top(date, text, uuid),
  public.daily_wins(date, text) to anon, authenticated;
