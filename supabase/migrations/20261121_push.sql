-- Avisos de Pelipper: una notificación al día con el reto (Web Push, sin cuentas ni correo).
-- La web guarda aquí la suscripción que da el navegador (una dirección de su servicio de avisos y dos claves), con el
-- idioma, la zona horaria y la hora que elige el jugador. Cada hora, pg_cron llama a la función pelipper-push
-- (supabase/functions/pelipper-push), que manda el aviso a quien le toque y aún no haya jugado el reto de hoy.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Lo privado (claves VAPID y la contraseña que usa la tarea programada) no se puede leer desde la web.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.push_cron (token text not null);
insert into private.push_cron select encode(extensions.gen_random_bytes(24), 'hex');
-- Las claves VAPID las crea la propia función la primera vez (la privada nunca sale de Supabase).
create table private.vapid (id int primary key default 1 check (id = 1), public_key text not null, private_jwk jsonb not null);

create table public.push_subs (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  player uuid not null,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  lang text not null default 'en' check (lang in ('es', 'en')),
  tz text not null default 'UTC' check (char_length(tz) <= 64),
  hour smallint not null default 10 check (hour between 0 and 23),
  last_sent timestamptz,
  created_at timestamptz not null default now()
);
create index push_subs_player on public.push_subs (player);
alter table public.push_subs enable row level security;
revoke all on public.push_subs from anon, authenticated;

-- ---------- desde la web ----------
create function public.push_public_key() returns text
language sql stable security definer set search_path = '' as $$ select public_key from private.vapid $$;

-- Activar o cambiar la hora. Al activarlo no llega nada hasta la hora elegida del día siguiente (o de hoy, si aún no ha
-- llegado). Como mucho 5 dispositivos por código de entrenador.
create function public.push_subscribe(p_player uuid, p_endpoint text, p_p256dh text, p_auth text, p_lang text, p_tz text, p_hour int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_tz text := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then p_tz else 'UTC' end;
begin
  if p_endpoint !~ '^https://' or p_hour not between 0 and 23 then return false; end if;
  insert into public.push_subs (endpoint, player, p256dh, auth, lang, tz, hour, last_sent)
  values (p_endpoint, p_player, p_p256dh, p_auth, case when p_lang = 'es' then 'es' else 'en' end, v_tz, p_hour,
    case when extract(hour from now() at time zone v_tz) >= p_hour then now() end)
  on conflict (endpoint) do update set player = excluded.player, p256dh = excluded.p256dh, auth = excluded.auth,
    lang = excluded.lang, tz = excluded.tz, hour = excluded.hour;
  delete from public.push_subs where player = p_player and endpoint not in
    (select s.endpoint from public.push_subs s where s.player = p_player order by s.created_at desc limit 5);
  return true;
end $$;

create function public.push_unsubscribe(p_player uuid, p_endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subs where player = p_player and endpoint = p_endpoint
$$;

revoke execute on function public.push_public_key(), public.push_subscribe(uuid, text, text, text, text, text, int),
  public.push_unsubscribe(uuid, text) from public;
grant execute on function public.push_public_key(), public.push_subscribe(uuid, text, text, text, text, text, int),
  public.push_unsubscribe(uuid, text) to anon, authenticated;

-- ---------- para la función pelipper-push (solo con la contraseña de la tarea programada) ----------
create function private.push_ok(p_token text) returns boolean
language sql stable security definer set search_path = '' as $$ select exists (select 1 from private.push_cron where token = p_token) $$;

create function public.push_vapid(p_token text, p_public text default null, p_jwk jsonb default null)
returns table(public_key text, private_jwk jsonb) language plpgsql security definer set search_path = '' as $$
begin
  if not private.push_ok(p_token) then return; end if;
  if p_public is not null then insert into private.vapid (public_key, private_jwk) values (p_public, p_jwk) on conflict do nothing; end if;
  return query select v.public_key, v.private_jwk from private.vapid v;
end $$;

-- A quién toca: ya pasó su hora de hoy (en su zona), aún no se le avisó desde entonces y no ha jugado el reto de hoy.
create function public.push_due(p_token text)
returns table(endpoint text, p256dh text, auth text, lang text) language sql stable security definer set search_path = '' as $$
  select s.endpoint, s.p256dh, s.auth, s.lang from public.push_subs s
  where private.push_ok(p_token)
    and extract(hour from now() at time zone s.tz) >= s.hour
    and (s.last_sent is null or s.last_sent < (date_trunc('day', now() at time zone s.tz) + make_interval(hours => s.hour)) at time zone s.tz)
    and not exists (select 1 from public.results r where r.player = s.player and r.mode = 'reto'
                    and r.day = (now() at time zone 'Europe/Madrid')::date)
  limit 1000
$$;

create function public.push_done(p_token text, p_sent text[], p_gone text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.push_ok(p_token) then return; end if;
  update public.push_subs set last_sent = now() where endpoint = any(p_sent);
  delete from public.push_subs where endpoint = any(p_gone);
end $$;

revoke execute on function private.push_ok(text) from public, anon, authenticated;
revoke execute on function public.push_vapid(text, text, jsonb), public.push_due(text), public.push_done(text, text[], text[]) from public;
grant execute on function public.push_vapid(text, text, jsonb), public.push_due(text), public.push_done(text, text[], text[]) to anon, authenticated;

-- "Borrar mis datos" también quita los avisos.
create or replace function public.delete_my_data(p_player uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.results where player = p_player;
  delete from public.feedback where player = p_player;
  delete from public.saves where player = p_player;
  delete from public.nicknames where player = p_player;
  delete from public.push_subs where player = p_player;
$$;

-- Cada hora (al minuto 5), Pelipper sale a repartir.
select cron.schedule('pelipper-push', '5 * * * *', $$
  select net.http_post(
    url := 'https://abliyzbjjkkbabmihfey.supabase.co/functions/v1/pelipper-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-pelipper', (select token from private.push_cron)),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);
