// Pelipper: cada día, nada más cambiar el reto (00:00 en España), abre en el foro ⭐-reto-del-día de Discord un hilo con
// el reto del día; y los lunes, además, el resumen de la semana. Lo lanza .github/workflows/pelipper.yml; las URL de
// los webhooks van en los secretos DISCORD_WEBHOOK (foro) y DISCORD_NEWS_WEBHOOK (novedades, opcional).
//   DISCORD_WEBHOOK=... node scripts/pelipper.mjs [--force] [--weekly]
//   --force: publica aunque sea por la noche · --weekly: publica también el resumen semanal aunque no sea lunes
import {today, dayNumber, retoOpen, retoBoss, ruleFor, BOSSES, doublesOpen, duoOf} from '../src/game.js';
import {dailyStats, dailyTop, weeklyReto} from '../src/stats.js';
import {SD, FOOTER, post, madridHour} from './discord.mjs';

const ROLE_RETO = '1567593447614062702', ROLE_DOBLES = '1567593641860399124'; // 🔔 Reto del día, 🔔 Dobles del domingo
const RULES = {inverse: 'Combate inverso', trickroom: 'Espacio Raro', gravity: 'Gravedad', sun: 'Sol', rain: 'Lluvia', sand: 'Tormenta de arena', snow: 'Nieve'};
const RULES_EN = {inverse: 'Inverse Battle', trickroom: 'Trick Room', gravity: 'Gravity', sun: 'Sun', rain: 'Rain', sand: 'Sandstorm', snow: 'Snow'};

// Una sola ejecución al día, justo después de medianoche, pero GitHub puede retrasarla horas (el 5-11 llegó 3 h tarde):
// publica el reto del día que sea, salvo que de algún modo se lance aún la víspera por la noche.
const hour = madridHour();
if (hour >= 20 && !process.argv.includes('--force')) { console.log(`Son las ${hour}:xx en Madrid: es la víspera, nada que publicar.`); process.exit(); }

const date = today();
if (!retoOpen(date)) { console.log(`${date}: el reto del día aún no ha empezado.`); process.exit(); }
const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const pct = (w, p) => Math.round(100 * w / p);

// ---------- el reto del día ----------
const n = dayNumber(date), boss = BOSSES[retoBoss(date)], rule = ruleFor(date, boss.id), sunday = doublesOpen(date);
const him = ['cynthia', 'iris'].includes(boss.id) ? 'ella' : 'él', them = him === 'ella' ? 'her' : 'him';
const fields = [];
if (RULES[rule]) fields.push({name: '📜 Regla del día · Rule of the day', value: `${RULES[rule]} · ${RULES_EN[rule]}`, inline: true});
if (sunday) fields.push({name: '🌀 ¡Es domingo! · It\'s Sunday!', value: `Combate Doble contra **${duoOf(date).name}** · Double Battle`, inline: true});
// Cómo fue el reto de ayer: cuántos jugaron, qué % ganó y el más rápido (con su apodo, el mismo que sale en el top del
// juego). Si las estadísticas no responden, se publica igual sin el resumen.
const prev = shift(date, -1);
try {
  const g = retoOpen(prev) && (await dailyStats(prev))?.reto;
  if (g?.players) {
    const best = (await dailyTop(prev, 'reto'))?.find(r => r.won);
    fields.push({name: '📊 Ayer · Yesterday', value: `**${BOSSES[retoBoss(prev)].name}**: ${g.players} entrenadores · ganó el ${pct(g.wins, g.players)} %`
      + (best ? `\n⚡ Más rápido · Fastest: **${best.nickname || 'Anónimo'}** (${best.turns} turnos)` : '')});
  }
} catch (e) { console.log('Sin resumen de ayer:', e.message); }

await post({
  forum: true,
  thread: `⭐ #${n} · ${boss.name}`,
  content: `<@&${ROLE_RETO}>${sunday ? ` <@&${ROLE_DOBLES}>` : ''} ¡Correo urgente! ✉️`,
  allowed_mentions: {roles: [ROLE_RETO, ...(sunday ? [ROLE_DOBLES] : [])]},
  embeds: [{
    title: `⭐ Reto del día #${n}: ${boss.name} te espera`,
    url: 'https://redle.pages.dev/?vs=reto',
    description: `**${boss.name}** te espera con su equipo de los juegos. Mismo equipo y mismo combate para todo el mundo: elige quién empieza y a por ${him}, tienes 3 intentos. Comenta aquí cómo te ha ido (las estrategias ganadoras, entre ||spoilers||).\n\n🇬🇧 **${boss.name}** awaits with ${them === 'her' ? 'her' : 'his'} real in-game team. Same team, same battle for everyone: choose your lead and take ${them} on!`,
    color: 0xffcb05,
    thumbnail: {url: `${SD}sprites/trainers/${boss.id}.png`},
    fields,
    footer: {text: FOOTER},
  }],
});
console.log(`Publicado el reto #${n} (${boss.name}).`);

// ---------- los lunes, el resumen de la semana (de lunes a domingo) ----------
const monday = new Date(Date.parse(date + 'T12:00:00Z')).getUTCDay() === 1;
if (monday || process.argv.includes('--weekly')) {
  try {
    const from = shift(date, -7), to = shift(date, -1), w = await weeklyReto(from, to);
    const days = (w?.days || []).filter(d => d.players);
    if (days.length) {
      const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      const dow = d => DOW[new Date(Date.parse(d + 'T12:00:00Z')).getUTCDay()];
      const players = days.reduce((a, d) => a + d.players, 0), wins = days.reduce((a, d) => a + d.wins, 0);
      const hardest = days.reduce((a, d) => (pct(d.wins, d.players) < pct(a.wins, a.players) ? d : a));
      const medals = ['🥇', '🥈', '🥉'], champs = (w.champs || []).slice(0, 3);
      await post({
        thread: `🏆 Resumen de la semana · ${from.slice(8)}/${from.slice(5, 7)} – ${to.slice(8)}/${to.slice(5, 7)}`,
        embeds: [{
          title: '🏆 Así fue la semana en Redle · Weekly recap',
          url: 'https://redle.pages.dev/',
          description: days.map(d => `**${dow(d.day)} ${+d.day.slice(8)}** · ${BOSSES[retoBoss(d.day)].name}: ${d.players} entrenadores, ganó el ${pct(d.wins, d.players)} %`).join('\n'),
          color: 0x2a75bb,
          fields: [
            {name: '📊 La semana · The week', value: `${players} combates en el reto del día · ${wins} victorias (${pct(wins, players)} %)`},
            {name: '🧊 El más duro · The toughest', value: `**${BOSSES[retoBoss(hardest.day)].name}** el ${dow(hardest.day)} ${+hardest.day.slice(8)}: solo ganó el ${pct(hardest.wins, hardest.players)} %`},
            ...(champs.length ? [{name: '👑 Más retos ganados · Most wins', value: champs.map((c, i) => `${medals[i]} **${c.nickname}**: ${c.wins} ${c.wins === 1 ? 'reto' : 'retos'}`).join('\n')
              + '\n_Ponte un apodo en tu tarjeta de entrenador para salir aquí._'}] : []),
          ],
          footer: {text: FOOTER},
        }],
      });
      console.log(`Publicado el resumen de la semana ${from} – ${to}.`);
    }
  } catch (e) { console.log('Sin resumen semanal:', e.message); }
}
