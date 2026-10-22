// Genera src/balance.js: para cada rival y día futuro, simula combates con el equipo sorteado y, si cae fuera del
// rango "muy difícil pero ganable", prueba sorteos alternativos hasta encontrar uno que sí.
//   node scripts/build-balance.mjs [días=180] [desde=AAAA-MM-DD]
// Calibrado con los datos reales del 13 al 21-10-2026: la media de K.O. simulados predice la de la gente (r = 0,71).
//   < 2,5 K.O. simulados → la gente gana ~5 % (casi siempre 0 %)     3,25-4 → ~23 %
//   2,5-3,25 → ~8 %                                                   4-4,75 → ~31 %      > 4,75 → ~83 %
// Rango aceptado: 2,75-4,5. Nunca cambia días ya jugados: empieza mañana y conserva lo anterior.
import {writeFileSync} from 'node:fs';
import {newBattle, play, aiChoice, poolFor, ruleFor, today, BOSSES} from '../src/game.js';
import {BALANCE} from '../src/balance.js';

const DAYS = +(process.argv[2] || 180), K = 12, EPS = 0.15, LO = 2.75, HI = 4.5, MID = 3.6, TRIES = 8;
const FIRST = '2026-10-24'; // primer día con equilibrio (y con la IA v3, con la que se calibra)

// Un combate simulado: el jugador elige como la IA salvo un 15 % de las veces (al azar) y con un líder al azar.
function sim(date, boss, team, seed) {
  let s = seed; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const lead = Math.floor(rnd() * 6);
  const order = [lead, ...[0, 1, 2, 3, 4, 5].filter(i => i !== lead)].map(i => team[i]);
  const b = newBattle(date, order, boss, ruleFor(date, boss));
  play(b, null);
  for (let t = 0; t < 300 && !b.ended; t++) {
    let c = aiChoice(b, 'p1') || 'default';
    const req = b.p1.activeRequest;
    if (rnd() < EPS && req && !req.wait && !req.forceSwitch && req.active) {
      const moves = req.active[0].moves.map((m, i) => !m.disabled && m.pp !== 0 ? 'move ' + (i + 1) : null).filter(Boolean);
      if (moves.length) c = moves[Math.floor(rnd() * moves.length)];
    }
    if (!play(b, c)) play(b, 'default');
  }
  return b.p2.pokemon.filter(p => p.fainted).length;
}
const score = (date, boss, i) => { const team = poolFor(boss, date, i); let k = 0; for (let n = 0; n < K; n++) k += sim(date, boss, team, 1000 + n * 7919); return k / K; };

const tomorrow = new Date(Date.parse(today() + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10);
// Inicio opcional (3.º argumento) para generar por tramos; nunca antes de mañana ni del primer día con equilibrio.
const start = [tomorrow, FIRST, process.argv[3] || ''].sort().at(-1);
const out = Object.fromEntries(Object.entries(BALANCE).filter(([k]) => k.split(':')[1] < start)); // lo ya jugado no se toca
let rerolled = 0, total = 0;
const t0 = Date.now();
for (let d = 0; d < DAYS; d++) {
  const date = new Date(Date.parse(start + 'T12:00:00Z') + d * 864e5).toISOString().slice(0, 10);
  for (const boss of Object.keys(BOSSES)) {
    total++;
    let best = 0, bestGap = Infinity;
    for (let i = 0; i < TRIES; i++) {
      const v = score(date, boss, i);
      if (v >= LO && v <= HI) { best = i; bestGap = 0; break; }
      const gap = Math.abs(v - MID);
      if (gap < bestGap) [best, bestGap] = [i, gap];
    }
    if (best) { out[`${boss}:${date}`] = best; rerolled++; }
  }
  if (d % 10 === 9) console.log(`${d + 1}/${DAYS} días · ${rerolled}/${total} cambiados · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
const body = Object.entries(out).sort().map(([k, v]) => `  '${k}': ${v},`).join('\n');
writeFileSync(new URL('../src/balance.js', import.meta.url), `// Tabla de equilibrio generada por scripts/build-balance.mjs: "rival:día" -> sorteo alternativo a usar ese día.
// Solo aparecen los días en que el sorteo normal era casi imposible o demasiado fácil. No editar a mano.
// Cubre hasta el ${new Date(Date.parse(start + 'T12:00:00Z') + (DAYS - 1) * 864e5).toISOString().slice(0, 10)}; después, sorteo normal hasta que se vuelva a generar.
export const BALANCE = {
${body}
};
`);
console.log(`listo: ${rerolled} de ${total} equipos cambiados (desde ${start}, ${DAYS} días)`);
