-- Sugerencias, copia del progreso con el código de entrenador, apodos para el ranking del día y borrado de datos.
-- El "código de entrenador" es el identificador aleatorio del navegador (uuid, 122 bits): quien lo tiene es el dueño.
-- Las tablas no se pueden leer ni editar desde la web (RLS sin políticas de lectura); todo pasa por estas funciones.

-- ---------- sugerencias ----------
create table public.feedback (
  id bigint generated always as identity primary key,
  player uuid not null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 3 and 1000),
  contact text check (char_length(contact) <= 80),
  context jsonb check (pg_column_size(context) < 2000),
  created_at timestamptz not null default now()
);
create index feedback_player_time on public.feedback (player, created_at);
alter table public.feedback enable row level security;
create policy "enviar sugerencia" on public.feedback for insert to anon, authenticated with check (true);
revoke all on public.feedback from anon, authenticated;
grant insert (player, kind, message, contact, context) on public.feedback to anon, authenticated;

-- Contra el spam: como mucho 5 sugerencias por jugador y día.
create function public.feedback_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.feedback f where f.player = new.player and f.created_at > now() - interval '1 day') >= 5 then
    raise exception 'feedback limit';
  end if;
  return new;
end $$;
create trigger feedback_limit before insert on public.feedback for each row execute function public.feedback_limit();
revoke execute on function public.feedback_limit() from public, anon, authenticated;

-- ---------- copia del progreso ----------
create table public.saves (
  player uuid primary key,
  data jsonb not null check (pg_column_size(data) < 200000),
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
revoke all on public.saves from anon, authenticated;

create function public.save_progress(p_player uuid, p_data jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.saves (player, data, updated_at) values (p_player, p_data, now())
  on conflict (player) do update set data = excluded.data, updated_at = now();
$$;
create function public.load_progress(p_player uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select s.data from public.saves s where s.player = p_player;
$$;

-- ---------- apodos y ranking del día ----------
create table public.nicknames (
  player uuid primary key,
  nickname text not null check (nickname ~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]{3,16}$'),
  updated_at timestamptz not null default now()
);
alter table public.nicknames enable row level security;
revoke all on public.nicknames from anon, authenticated;

-- Apodo nulo o vacío = quitarlo. Filtro básico de insultos (el resto, a mano si alguien lo reporta).
create function public.set_nickname(p_player uuid, p_nickname text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_nickname is null or btrim(p_nickname) = '' then
    delete from public.nicknames where player = p_player;
    return true;
  end if;
  if p_nickname ~* '(puta|puto|mierda|polla|coño|maric|nazi|hitler|fuck|shit|nigg|fag|cunt|bitch|whore|retard)' then
    return false;
  end if;
  insert into public.nicknames (player, nickname, updated_at) values (p_player, btrim(p_nickname), now())
  on conflict (player) do update set nickname = excluded.nickname, updated_at = now();
  return true;
end $$;

-- Los 10 mejores del día en un modo, con el mismo orden que daily_rank. Sin identificadores: solo el apodo
-- (o nulo = anónimo) y si eres tú.
create function public.daily_top(p_day date, p_mode text, p_player uuid)
returns table (nickname text, won boolean, turns smallint, kos smallint, reached smallint, me boolean)
language sql stable security definer set search_path = '' as $$
  select n.nickname, r.won, r.turns, r.kos, r.reached, r.player = p_player
  from public.results r left join public.nicknames n on n.player = r.player
  where r.day = p_day and r.mode = p_mode
  order by r.reached desc nulls last, r.won desc, case when r.won then r.turns end asc, r.kos desc nulls last, r.turns desc, r.created_at
  limit 10
$$;

-- ---------- borrar todo lo de un jugador ----------
create function public.delete_my_data(p_player uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.results where player = p_player;
  delete from public.feedback where player = p_player;
  delete from public.saves where player = p_player;
  delete from public.nicknames where player = p_player;
$$;

revoke execute on function public.save_progress(uuid, jsonb), public.load_progress(uuid), public.set_nickname(uuid, text),
  public.daily_top(date, text, uuid), public.delete_my_data(uuid) from public;
grant execute on function public.save_progress(uuid, jsonb), public.load_progress(uuid), public.set_nickname(uuid, text),
  public.daily_top(date, text, uuid), public.delete_my_data(uuid) to anon, authenticated;
