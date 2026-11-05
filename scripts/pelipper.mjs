// Pelipper: cada día, nada más cambiar el reto (00:00 en España), abre en el foro ⭐-reto-del-día de Discord un hilo con
// el reto del día. Lo lanza .github/workflows/pelipper.yml; la URL del webhook va en el secreto DISCORD_WEBHOOK.
//   DISCORD_WEBHOOK=... node scripts/pelipper.mjs [--force]   (--force: publica aunque sea por la noche)
import {today, dayNumber, retoOpen, retoBoss, ruleFor, BOSSES, doublesOpen, duoOf} from '../src/game.js';

const SD = 'https://play.pokemonshowdown.com/';
// Retrato de Pelipper de Mundo Misterioso (PMD SpriteCollab, CC BY-NC 4.0: uso sin ánimo de lucro y con crédito).
const AVATAR = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/0279/Happy.png';
const ROLE_RETO = '1567593447614062702', ROLE_DOBLES = '1567593641860399124'; // 🔔 Reto del día, 🔔 Dobles del domingo
const RULES = {inverse: 'Combate inverso', trickroom: 'Espacio Raro', gravity: 'Gravedad', sun: 'Sol', rain: 'Lluvia', sand: 'Tormenta de arena', snow: 'Nieve'};
const RULES_EN = {inverse: 'Inverse Battle', trickroom: 'Trick Room', gravity: 'Gravity', sun: 'Sun', rain: 'Rain', sand: 'Sandstorm', snow: 'Snow'};

const hook = process.env.DISCORD_WEBHOOK;
if (!hook) throw new Error('Falta el secreto DISCORD_WEBHOOK');
// Una sola ejecución al día, justo después de medianoche, pero GitHub puede retrasarla horas (el 5-11 llegó 3 h tarde):
// publica el reto del día que sea, salvo que de algún modo se lance aún la víspera por la noche.
const hour = +new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23'}).format(new Date());
if (hour >= 20 && !process.argv.includes('--force')) { console.log(`Son las ${hour}:xx en Madrid: es la víspera, nada que publicar.`); process.exit(); }

const date = today();
if (!retoOpen(date)) { console.log(`${date}: el reto del día aún no ha empezado.`); process.exit(); }
const n = dayNumber(date), boss = BOSSES[retoBoss(date)], rule = ruleFor(date, boss.id), sunday = doublesOpen(date);
const him = ['cynthia', 'iris'].includes(boss.id) ? 'ella' : 'él', them = him === 'ella' ? 'her' : 'him';
const fields = [];
if (RULES[rule]) fields.push({name: '📜 Regla del día · Rule of the day', value: `${RULES[rule]} · ${RULES_EN[rule]}`, inline: true});
if (sunday) fields.push({name: '🌀 ¡Es domingo! · It\'s Sunday!', value: `Combate Doble contra **${duoOf(date).name}** · Double Battle`, inline: true});

const res = await fetch(`${hook}?wait=true`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: 'Pelipper',
    avatar_url: AVATAR,
    thread_name: `⭐ #${n} · ${boss.name}`,
    content: `<@&${ROLE_RETO}>${sunday ? ` <@&${ROLE_DOBLES}>` : ''} ¡Correo urgente! ✉️`,
    allowed_mentions: {roles: [ROLE_RETO, ...(sunday ? [ROLE_DOBLES] : [])]},
    embeds: [{
      title: `⭐ Reto del día #${n}: ${boss.name} te espera`,
      url: 'https://redle.pages.dev/?vs=reto',
      description: `**${boss.name}** te espera con su equipo de los juegos. Mismo equipo y mismo combate para todo el mundo: elige quién empieza y a por ${him}, tienes 3 intentos. Comenta aquí cómo te ha ido (las estrategias ganadoras, entre ||spoilers||).\n\n🇬🇧 **${boss.name}** awaits with ${them === 'her' ? 'her' : 'his'} real in-game team. Same team, same battle for everyone: choose your lead and take ${them} on!`,
      color: 0xffcb05,
      thumbnail: {url: `${SD}sprites/trainers/${boss.id}.png`},
      fields,
      footer: {text: 'Pelipper reparte el correo de Redle · Retrato: PMD SpriteCollab (CC BY-NC 4.0)'},
    }],
  }),
});
if (!res.ok) throw new Error(`Discord respondió ${res.status}: ${await res.text()}`);
console.log(`Publicado el reto #${n} (${boss.name}).`);
