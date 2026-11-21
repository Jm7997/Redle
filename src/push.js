// Avisos de Pelipper: una notificación al día cuando sale el reto (Web Push, sin cuentas ni correo).
// El navegador da una "suscripción" (dirección de su servicio de avisos + dos claves) que se guarda en Supabase con el
// idioma, la zona horaria y la hora elegida; la función pelipper-push manda el aviso a esa hora, salvo si ya jugaste.
// En iPhone solo funciona con Redle añadido a la pantalla de inicio (iOS 16.4+).
import {pushPublicKey, pushSubscribe, pushUnsubscribe} from './stats.js';

const ls = {get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }};
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };

export const PUSH_HOURS = [8, 10, 13, 18, 21];
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushHour = () => { const h = +ls.get('redle:push-hour'); return PUSH_HOURS.includes(h) ? h : 10; };
// Activado = el jugador lo pidió y el navegador sigue dando permiso.
export const pushIsOn = () => pushSupported() && ls.get('redle:push') === '1' && Notification.permission === 'granted';

async function subscription(create) {
  const reg = await navigator.serviceWorker.register('sw.js'); // relativo: Redle puede vivir en cualquier carpeta
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub || !create) return sub;
  const key = await pushPublicKey();
  if (!key) throw new Error('sin clave');
  return reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: unb64u(key)});
}

// Activar (o cambiar la hora). Devuelve 'on', 'denied' (el navegador no deja) o 'error'.
export async function pushOn(lang, hour = pushHour()) {
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
    const sub = await subscription(true);
    if (!(await pushSubscribe(sub.toJSON(), lang, tz(), hour))) return 'error';
    ls.set('redle:push', '1');
    ls.set('redle:push-hour', String(hour));
    ls.set('redle:push-sync', new Date().toDateString());
    ls.set('redle:push-lang', lang);
    return 'on';
  } catch { return 'error'; }
}

export async function pushOff() {
  ls.set('redle:push', '0');
  try {
    const sub = pushSupported() && await subscription(false);
    if (sub) { await pushUnsubscribe(sub.endpoint); await sub.unsubscribe(); }
  } catch {}
}

// Una vez al día, al abrir Redle: vuelve a apuntar la suscripción (el navegador puede renovarla, o cambiaste de idioma
// o de zona horaria). No pregunta nada: solo si ya estaba activado.
export function pushRefresh(lang) {
  if (!pushIsOn() || ls.get('redle:push-sync') === new Date().toDateString() && ls.get('redle:push-lang') === lang) return;
  pushOn(lang).catch(() => {});
}
