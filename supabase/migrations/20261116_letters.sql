-- Respuestas de Pelipper: cada carta del buzón tiene un estado y una respuesta, que el jugador ve en el Correo de
-- Pelipper (solo las suyas, con su código de entrenador). Se contestan desde el panel de Supabase (tabla feedback).
--   status: received (recibida) · working (en ello) · done (¡hecho!) · answered (respondida, no hacía falta cambiar nada)
alter table public.feedback
  add column status text not null default 'received' check (status in ('received', 'working', 'done', 'answered')),
  add column reply text check (char_length(reply) <= 1000),
  add column replied_at timestamptz;

-- replied_at se pone solo al cambiar la respuesta o el estado: es lo que avisa al jugador de que tiene correo.
create function public.feedback_replied() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reply is distinct from old.reply or new.status is distinct from old.status then new.replied_at := now(); end if;
  return new;
end $$;
create trigger feedback_replied before update on public.feedback for each row execute function public.feedback_replied();
revoke execute on function public.feedback_replied() from public, anon, authenticated;

-- Tus cartas (las 20 últimas), con su estado y la respuesta.
create function public.my_letters(p_player uuid)
returns table(id bigint, kind text, message text, status text, reply text, created_at timestamptz, replied_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, f.kind, f.message, f.status, f.reply, f.created_at, f.replied_at
  from public.feedback f where f.player = p_player
  order by f.created_at desc limit 20
$$;
revoke execute on function public.my_letters(uuid) from public;
grant execute on function public.my_letters(uuid) to anon, authenticated;

-- Resumen semanal del reto del día para Pelipper en Discord: cada día (jugadores y victorias) y quién ganó más retos.
-- Solo salen los entrenadores con apodo (los mismos que ya salen en el top del día).
create function public.weekly_reto(p_from date, p_to date)
returns table(day date, players bigint, wins bigint, nickname text, nick_wins bigint)
language sql stable security definer set search_path = '' as $$
  select r.day, count(*), count(*) filter (where r.won), null::text, null::bigint
  from public.results r where r.mode = 'reto' and r.day between p_from and p_to group by r.day
  union all
  select null::date, null::bigint, null::bigint, n.nickname, count(*)
  from public.results r join public.nicknames n on n.player = r.player
  where r.mode = 'reto' and r.won and r.day between p_from and p_to
  group by n.nickname
$$;
revoke execute on function public.weekly_reto(date, date) from public;
grant execute on function public.weekly_reto(date, date) to anon, authenticated;
