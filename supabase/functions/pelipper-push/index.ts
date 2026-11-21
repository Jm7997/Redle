// Pelipper reparte los avisos del reto del día (Web Push). La llama pg_cron cada hora con la contraseña de
// private.push_cron (ver supabase/migrations/20261121_push.sql); sin ella no hace nada.
// Se despliega con verify_jwt desactivado porque se autentica sola con esa contraseña.
import {vapidKeys, sendPush} from './webpush.js';

const API = 'https://abliyzbjjkkbabmihfey.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_yQVaB_Xh4fCx8iJS6EJfhQ_bEkehbY1'; // pública por diseño: las funciones exigen la contraseña
const rpc = async (name: string, body: Record<string, unknown>) => {
  const res = await fetch(API + name, {method: 'POST', headers: {apikey: KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// El reto de hoy, igual que src/game.js (today, dayNumber, retoBoss, doublesOpen). Si cambia allí, cambiarlo aquí.
const RETO_ORDER = ['red', 'cynthia', 'lance', 'wallace', 'leon', 'blue', 'steven', 'iris'];
const NAMES: Record<string, string> = {red: 'Red', cynthia: 'Cynthia', lance: 'Lance', wallace: 'Wallace', leon: 'Leon', blue: 'Blue', steven: 'Steven', iris: 'Iris'};
const dayNumber = (d: string) => Math.round((Date.parse(d + 'T00:00:00Z') - Date.UTC(2026, 9, 12)) / 864e5) + 1;
function todayMessage(lang: string) {
  const date = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Madrid'}).format(new Date());
  const n = dayNumber(date), id = RETO_ORDER[((n - dayNumber('2026-11-05')) % 8 + 8) % 8], name = NAMES[id];
  const her = id === 'cynthia' || id === 'iris', sunday = new Date(date + 'T12:00:00Z').getUTCDay() === 0;
  return lang === 'es'
    ? {title: '✉️ ¡Correo urgente de Pelipper!', body: `Reto del día #${n}: ${name} te espera. Mismo combate para todo el mundo, ¿podrás con ${her ? 'ella' : 'él'}?${sunday ? ' ¡Y hoy hay Combate Doble!' : ''}`}
    : {title: '✉️ Urgent mail from Pelipper!', body: `Daily challenge #${n}: ${name} awaits. Same battle for everyone. Can you beat ${her ? 'her' : 'him'}?${sunday ? ' And it\'s Double Battle day!' : ''}`};
}

Deno.serve(async req => {
  const token = req.headers.get('x-pelipper') || '';
  try {
    let [vapid] = await rpc('push_vapid', {p_token: token});
    if (!vapid) {
      // Primera vez: Pelipper crea sus claves (si la contraseña no vale, no se guarda nada y no devuelve nada).
      const k = await vapidKeys();
      [vapid] = await rpc('push_vapid', {p_token: token, p_public: k.publicKey, p_jwk: k.privateJwk});
      if (!vapid) return new Response('no', {status: 401});
    }
    const keys = {publicKey: vapid.public_key, privateJwk: vapid.private_jwk};
    const due = await rpc('push_due', {p_token: token}) || [];
    const sent: string[] = [], gone: string[] = [], failed: number[] = [];
    for (let i = 0; i < due.length; i += 25) {
      await Promise.all(due.slice(i, i + 25).map(async (s: {endpoint: string; p256dh: string; auth: string; lang: string}) => {
        const msg = todayMessage(s.lang);
        try {
          const status = await sendPush(s, JSON.stringify({...msg, url: 'https://redle.pages.dev/?vs=reto', tag: 'redle-reto'}), keys);
          if (status === 404 || status === 410) gone.push(s.endpoint);
          else if (status < 300) sent.push(s.endpoint);
          else failed.push(status);
        } catch { failed.push(0); }
      }));
    }
    if (sent.length || gone.length) await rpc('push_done', {p_token: token, p_sent: sent, p_gone: gone});
    return Response.json({due: due.length, sent: sent.length, gone: gone.length, failed});
  } catch (e) {
    return new Response(String(e), {status: 500});
  }
});
