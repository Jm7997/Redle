// Estadísticas globales del día (Supabase): cada navegador envía su resultado una vez por día y modo, con un
// identificador aleatorio anónimo, y lee solo totales agregados (función `daily_stats`). La tabla no se puede leer
// ni editar desde la web (RLS). La clave es la "publishable" de Supabase: es pública por diseño.
const URL = 'https://abliyzbjjkkbabmihfey.supabase.co';
const KEY = 'sb_publishable_yQVaB_Xh4fCx8iJS6EJfhQ_bEkehbY1';
const headers = {apikey: KEY, 'Content-Type': 'application/json'};

function playerId() {
  try {
    let id = localStorage.getItem('redle:player');
    if (!id) localStorage.setItem('redle:player', id = crypto.randomUUID());
    return id;
  } catch { return crypto.randomUUID(); }
}

// Envía el resultado (si ya se envió, Supabase responde 409 y no pasa nada). Nunca rompe el juego si falla.
export async function sendResult({day, mode, won, turns, reached, kos}) {
  try {
    await fetch(`${URL}/rest/v1/results`, {
      method: 'POST', headers: {...headers, Prefer: 'return=minimal'},
      body: JSON.stringify({day, mode, player: playerId(), won, turns: turns || null, reached: reached ?? null, kos: kos ?? null}),
    });
  } catch {}
}

// Tu puesto del día en ese modo (sin nombres): {pos, total} o null si no hay conexión.
export async function dailyRank({day, mode, won, turns, reached, kos}) {
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/daily_rank`, {method: 'POST', headers,
      body: JSON.stringify({p_day: day, p_mode: mode, p_won: won, p_turns: turns || 0, p_kos: kos ?? 0, p_reached: reached ?? 0})});
    if (!res.ok) return null;
    const [r] = await res.json();
    return r?.total ? {pos: r.better + 1, total: r.total} : null;
  } catch { return null; }
}

// Totales del día por modo: {red: {players, wins, avgTurns, reached: [n0..n5]}, …} o null si no hay conexión.
export async function dailyStats(day) {
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/daily_stats`, {method: 'POST', headers, body: JSON.stringify({p_day: day})});
    if (!res.ok) return null;
    return Object.fromEntries((await res.json()).map(r => [r.mode, {players: r.players, wins: r.wins, avgTurns: r.avg_turns, reached: r.reached}]));
  } catch { return null; }
}
