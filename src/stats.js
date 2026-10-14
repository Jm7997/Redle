// Servidor (Supabase): estadísticas globales del día, puesto y top, sugerencias, copia del progreso y apodo.
// Cada navegador tiene un identificador aleatorio anónimo (el "código de entrenador"); no hay cuentas ni datos
// personales. Las tablas no se pueden leer ni editar desde la web (RLS): todo pasa por funciones que solo devuelven
// totales o lo de tu propio código. La clave es la "publishable" de Supabase: es pública por diseño.
const URL = 'https://abliyzbjjkkbabmihfey.supabase.co';
const KEY = 'sb_publishable_yQVaB_Xh4fCx8iJS6EJfhQ_bEkehbY1';
const headers = {apikey: KEY, 'Content-Type': 'application/json'};

// crypto.randomUUID no existe en Safari < 15.4: uuid v4 a mano con getRandomValues.
const uuid = () => crypto.randomUUID?.() ?? '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
  (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function playerId() {
  try {
    let id = localStorage.getItem('redle:player');
    if (!id || !UUID_RE.test(id)) localStorage.setItem('redle:player', id = uuid());
    return id;
  } catch { return uuid(); }
}

// Llamada a una función del servidor: {ok, data}; ok = false si no hay conexión o falla. Nunca rompe el juego.
async function call(name, body) {
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {method: 'POST', headers, body: JSON.stringify(body)});
    const text = res.ok ? await res.text() : '';
    return {ok: res.ok, data: text ? JSON.parse(text) : null};
  } catch { return {ok: false, data: null}; }
}
const rpc = async (name, body) => (await call(name, body)).data;

// Envía el resultado (si ya se envió, Supabase responde 409 y no pasa nada).
export async function sendResult({day, mode, won, turns, reached, kos}) {
  try {
    await fetch(`${URL}/rest/v1/results`, {
      method: 'POST', headers: {...headers, Prefer: 'return=minimal'},
      body: JSON.stringify({day, mode, player: playerId(), won, turns: turns || null, reached: reached ?? null, kos: kos ?? null}),
    });
  } catch {}
}

// Tu puesto del día en ese modo: {pos, total} o null.
export async function dailyRank({day, mode, won, turns, reached, kos}) {
  const r = (await rpc('daily_rank', {p_day: day, p_mode: mode, p_won: won, p_turns: turns || 0, p_kos: kos ?? 0, p_reached: reached ?? 0}))?.[0];
  return r?.total ? {pos: r.better + 1, total: r.total} : null;
}

// Los 10 mejores del día en ese modo: [{nickname, won, turns, kos, reached, me}] o null.
export const dailyTop = (day, mode) => rpc('daily_top', {p_day: day, p_mode: mode, p_player: playerId()});

// Totales del día por modo: {red: {players, wins, avgTurns, reached: [n0..n5]}, …} o null.
export async function dailyStats(day) {
  const rows = await rpc('daily_stats', {p_day: day});
  return Array.isArray(rows) ? Object.fromEntries(rows.map(r => [r.mode, {players: r.players, wins: r.wins, avgTurns: r.avg_turns, reached: r.reached}])) : null;
}

// Sugerencia o fallo desde la web. true si llegó (el servidor limita a 5 por jugador y día).
export async function sendFeedback({kind, message, contact, context}) {
  try {
    const res = await fetch(`${URL}/rest/v1/feedback`, {
      method: 'POST', headers: {...headers, Prefer: 'return=minimal'},
      body: JSON.stringify({player: playerId(), kind, message, contact: contact || null, context}),
    });
    return res.ok;
  } catch { return false; }
}

// Copia del progreso ligada al código de entrenador, para seguir en otro dispositivo.
export const saveProgress = async data => (await call('save_progress', {p_player: playerId(), p_data: data})).ok;
// {ok, data}: data null = ese código no tiene copia.
export const loadProgress = code => call('load_progress', {p_player: code});
// Apodo para el top del día: true si se guardó, false si no se acepta, null sin conexión.
export const setNickname = async nick => { const r = await call('set_nickname', {p_player: playerId(), p_nickname: nick}); return r.ok ? r.data : null; };
// Borra del servidor todo lo de este código (resultados, sugerencias, copia y apodo).
export const deleteMyData = async () => (await call('delete_my_data', {p_player: playerId()})).ok;
