-- Repeticiones de las victorias del día: al ganar se guarda la repetición (solo las elecciones del combate, codificadas
-- como en los enlaces #r=). Tras jugar tu intento, la web enseña las de los demás. Nada personal: apodo o anónimo.
-- (Postgres no admite repeticiones de más de 255 en una expresión regular: la longitud se comprueba aparte.)
alter table public.results add column replay text constraint results_replay_check
  check (replay ~ '^[A-Za-z0-9_-]+$' and char_length(replay) <= 6000);
grant insert (replay) on public.results to anon, authenticated;

create function public.daily_wins(p_day date, p_mode text)
returns table (nickname text, turns smallint, replay text)
language sql stable security definer set search_path = '' as $$
  select n.nickname, r.turns, r.replay
  from public.results r left join public.nicknames n on n.player = r.player
  where r.day = p_day and r.mode = p_mode and r.won and r.replay is not null
  order by r.turns asc nulls last, r.created_at
  limit 10
$$;
revoke execute on function public.daily_wins(date, text) from public;
grant execute on function public.daily_wins(date, text) to anon, authenticated;
