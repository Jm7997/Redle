// Lógica pura del juego (sin DOM): reto diario, equipos de los rivales (Red, Cynthia), IA y combate.
// Todo es determinista: misma fecha + mismas elecciones = mismo combate.
import {Battle, Dex} from '@pkmn/sim';
import {TeamGenerators} from '@pkmn/randoms';

export const FORMAT = 'gen9customgame';
export const POOL_SIZE = 6;
export const TEAM_SIZE = 6;
const EPOCH = Date.UTC(2026, 9, 12); // día 1 de Redle
const dex = Dex.forGen(9);

// El reto cambia para todo el mundo a la vez: a medianoche (00:00) hora de España.
export const RESET_HOUR = 0;
const madrid = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
const madridParts = d => Object.fromEntries(madrid.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));

// Fecha del reto vigente en el instante `d`.
export function today(d = new Date()) {
  const p = madridParts(new Date(d.getTime() - RESET_HOUR * 36e5));
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// Milisegundos hasta el próximo reto.
// ponytail: ignora el día del cambio de hora (el contador se desvía 1 h ese día).
export function msToNext(d = new Date()) {
  const p = madridParts(d);
  const since = (((p.hour - RESET_HOUR) % 24 + 24) % 24) * 3600 + p.minute * 60 + p.second;
  return (86400 - since) * 1000 - d.getMilliseconds();
}

export function dayNumber(date) {
  return Math.round((Date.parse(date + 'T00:00:00Z') - EPOCH) / 864e5) + 1;
}

// FNV-1a → 4 palabras de 16 bits, formato de semilla de Showdown.
export function seedFor(text) {
  const out = [];
  for (let k = 0; k < 4; k++) {
    let h = 0x811c9dc5;
    for (const c of `${text}#${k}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
    out.push((h >>> 0) & 0xffff);
  }
  return out;
}

const NOT_ALLOWED = new Set(['Restricted Legendary', 'Sub-Legendary', 'Mythical', 'Ultra Beast']);

// Los 6 Pokémon del día contra `boss`: sets de Random Battle Gen 9 de Showdown, sin legendarios,
// solo de las generaciones del rival (Red: Gen 1-2; Cynthia: Gen 1-4), a nivel 100.
export function dailyPool(date, boss = 'red') {
  const {gens: [lo, hi], team} = BOSSES[boss];
  const gen = TeamGenerators.getTeamGenerator('gen9randombattle', seedFor(`pool:${boss}:${date}`));
  const taken = new Set(team.map(s => dex.species.get(s.species).baseSpecies));
  // ponytail: corte por stats base; afinar con datos de partidas reales
  const candidates = Object.keys(gen.randomSets).map(id => dex.species.get(id))
    .filter(sp => sp.gen >= lo && sp.gen <= hi && sp.bst >= 420 && !sp.tags.some(t => NOT_ALLOWED.has(t)) && !taken.has(sp.baseSpecies));
  const r = rng(`pick:${boss}:${date}`), pool = [], seen = new Set();
  while (pool.length < POOL_SIZE) {
    const sp = candidates[Math.floor(r() * candidates.length)];
    if (seen.has(sp.baseSpecies)) continue;
    seen.add(sp.baseSpecies);
    const set = gen.randomSet(sp.name, {}, pool.length === 0);
    pool.push({...set, level: 100, ...wildTraining(set, `${boss}:${date}`, BOSSES[boss].maxEVs)});
  }
  return pool;
}

// Generador pseudoaleatorio pequeño y determinista (mulberry32) a partir de un texto.
function rng(text) {
  let t = seedFor(text).reduce((h, x) => Math.imul(h ^ x, 0x01000193) >>> 0, 0x811c9dc5);
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const NATURES = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious',
  'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];

// Tus Pokémon van "sin entrenar a conciencia": IVs al azar (0-31), entre 0 y 508 EVs repartidos al azar
// en bloques de 4 (máx. 252 por stat) y naturaleza al azar. Red los tiene perfectos y bien colocados:
// esa es la desventaja, no el nivel. Determinista por día y especie.
export function wildTraining(set, date, maxEVs = 508) {
  const r = rng(`training:${date}:${set.species}`);
  const ivs = Object.fromEntries(STATS.map(s => [s, Math.floor(r() * 32)]));
  const evs = Object.fromEntries(STATS.map(s => [s, 0]));
  for (let left = Math.floor(r() * (maxEVs / 4 + 1)); left > 0;) {
    const s = STATS[Math.floor(r() * 6)];
    if (evs[s] < 252) { evs[s] += 4; left--; }
  }
  return {ivs, evs, nature: NATURES[Math.floor(r() * NATURES.length)]};
}

const ev = (a, b, c = 'hp') => ({hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, [a]: 252, [b]: 252, [c]: 4});
const IV31 = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
const mon = (species, item, ability, nature, evs, moves) => ({name: species, species, item, ability, nature, evs, ivs: IV31, moves, level: 100, gender: ''});

// Equipos de los rivales tal cual en los juegos (especie, habilidad y ataques, sacados de las
// decompilaciones pret/pokeheartgold y pret/pokeplatinum). Para que sean más duros: nivel 100,
// IVs 31, EVs y naturaleza acordes a su set (en el juego llevan IVs 30, sin EVs y a nivel 58-88), y un
// objeto equipado cada uno (en el juego solo Pikachu lleva Bola Luminosa y Garchomp Baya Zidra; se mantienen).
// `weather`: clima fijo del escenario
// (en la cima del Monte Plateado de HGSS graniza siempre: daña a los que no son Hielo y Ventisca no falla).
export const BOSSES = {
  red: {
    // maxEVs: tope de EVs al azar de tu equipo, la palanca de dificultad por rival.
    id: 'red', name: 'Red', gens: [1, 2], maxEVs: 252, weather: 'hail',
    team: [
      mon('Pikachu', 'Light Ball', 'Static', 'Hasty', ev('atk', 'spe', 'spa'), ['Volt Tackle', 'Iron Tail', 'Quick Attack', 'Thunderbolt']),
      mon('Lapras', 'Leftovers', 'Shell Armor', 'Modest', ev('hp', 'spa', 'spd'), ['Blizzard', 'Brine', 'Psychic', 'Body Slam']),
      mon('Snorlax', 'Leftovers', 'Thick Fat', 'Brave', ev('hp', 'atk', 'spd'), ['Shadow Ball', 'Crunch', 'Blizzard', 'Giga Impact']),
      mon('Venusaur', 'Black Sludge', 'Overgrow', 'Modest', ev('hp', 'spa', 'spd'), ['Sludge Bomb', 'Giga Drain', 'Sleep Powder', 'Frenzy Plant']),
      mon('Charizard', 'Life Orb', 'Blaze', 'Naive', ev('spa', 'spe', 'atk'), ['Flare Blitz', 'Air Slash', 'Blast Burn', 'Dragon Pulse']),
      mon('Blastoise', 'Assault Vest', 'Torrent', 'Modest', ev('hp', 'spa', 'spd'), ['Focus Blast', 'Hydro Cannon', 'Blizzard', 'Flash Cannon']),
    ],
  },
  cynthia: {
    id: 'cynthia', name: 'Cynthia', gens: [1, 4], maxEVs: 508,
    team: [
      mon('Spiritomb', 'Leftovers', 'Pressure', 'Modest', ev('hp', 'spa', 'spd'), ['Dark Pulse', 'Psychic', 'Silver Wind', 'Shadow Ball']),
      mon('Roserade', 'Life Orb', 'Natural Cure', 'Timid', ev('spa', 'spe'), ['Energy Ball', 'Sludge Bomb', 'Toxic', 'Extrasensory']),
      mon('Togekiss', 'Expert Belt', 'Hustle', 'Modest', ev('hp', 'spa', 'spe'), ['Air Slash', 'Aura Sphere', 'Water Pulse', 'Shock Wave']),
      mon('Lucario', 'Life Orb', 'Steadfast', 'Naive', ev('spa', 'spe', 'atk'), ['Aura Sphere', 'Extreme Speed', 'Shadow Ball', 'Stone Edge']),
      mon('Milotic', 'Leftovers', 'Marvel Scale', 'Modest', ev('hp', 'spa', 'spd'), ['Surf', 'Ice Beam', 'Mirror Coat', 'Dragon Pulse']),
      mon('Garchomp', 'Sitrus Berry', 'Sand Veil', 'Jolly', ev('atk', 'spe'), ['Dragon Rush', 'Earthquake', 'Flamethrower', 'Giga Impact']),
    ],
  },
};
export const RED_TEAM = BOSSES.red.team;

export function newBattle(date, team, boss = 'red') {
  const battle = new Battle({formatid: FORMAT, seed: seedFor(`battle:${boss}:${date}`)});
  battle.setPlayer('p1', {name: 'Tú', team});
  battle.setPlayer('p2', {name: BOSSES[boss].name, team: BOSSES[boss].team});
  const weather = BOSSES[boss].weather;
  if (weather) {
    battle.field.setWeather(weather, battle.p2.pokemon[0]);
    battle.field.weatherState.duration = 0; // 0 = no se acaba
  }
  return battle;
}

// ---------- IA del rival ----------

const IMMUNE_ABILITY = {Levitate: 'Ground', 'Earth Eater': 'Ground', 'Flash Fire': 'Fire', 'Well-Baked Body': 'Fire', 'Water Absorb': 'Water', 'Storm Drain': 'Water',
  'Dry Skin': 'Water', 'Volt Absorb': 'Electric', 'Lightning Rod': 'Electric', 'Motor Drive': 'Electric', 'Sap Sipper': 'Grass'};

// Daño esperado aproximado (fracción de la vida del objetivo). No consume PRNG.
export function estimate(user, target, moveId) {
  const move = dex.moves.get(moveId);
  if (move.category === 'Status' || !target || target.fainted) return 0;
  const type = move.type;
  if (!dex.getImmunity(type, target.getTypes()) || IMMUNE_ABILITY[target.ability && dex.abilities.get(target.ability).name] === type) return 0;
  const eff = 2 ** dex.getEffectiveness(type, target.getTypes());
  if (target.ability === 'wonderguard' && eff <= 1) return 0;
  const physical = move.category === 'Physical';
  // Stats con mejoras de combate (sin disparar eventos) y los modificadores más comunes a mano.
  let atk = user.getStat(physical ? 'atk' : 'spa', false, true);
  let def = target.getStat(physical || move.overrideDefensiveStat === 'def' ? 'def' : 'spd', false, true);
  if (user.item === 'lightball' && user.species.name === 'Pikachu') atk *= 2;
  if (physical && ['hugepower', 'purepower'].includes(user.ability)) atk *= 2;
  if (user.item === (physical ? 'choiceband' : 'choicespecs')) atk *= 1.5;
  if (physical && user.status === 'brn' && user.ability !== 'guts') atk /= 2;
  if (target.item === 'eviolite' || !physical && target.item === 'assaultvest') def *= 1.5;
  if (physical && target.ability === 'furcoat') def *= 2;
  let bp = move.basePower || 60;
  if (user.ability === 'technician' && bp <= 60) bp *= 1.5;
  let mod = user.hasType(type) ? (user.ability === 'adaptability' ? 2 : 1.5) : 1;
  if (user.item === 'lifeorb') mod *= 1.3;
  if (user.item === 'expertbelt' && eff > 1) mod *= 1.2;
  if (target.ability === 'thickfat' && (type === 'Fire' || type === 'Ice')) mod /= 2;
  if (['multiscale', 'shadowshield'].includes(target.ability) && target.hp === target.maxhp) mod /= 2;
  if (move.multihit) bp *= Array.isArray(move.multihit) ? 3 : move.multihit;
  const dmg = ((42 * bp * atk / def) / 50 + 2) * mod * eff * 0.92 * ((move.accuracy === true ? 100 : move.accuracy) / 100);
  return dmg / target.maxhp;
}

// Multiplicador de tipo para las pistas de la interfaz (null = movimiento de estado).
export function typeMultiplier(user, target, moveId) {
  const move = dex.moves.get(moveId);
  if (move.category === 'Status' || !target) return null;
  if (!dex.getImmunity(move.type, target.getTypes())) return 0;
  return 2 ** dex.getEffectiveness(move.type, target.getTypes());
}

const speed = p => p.getStat('spe', false, true);
// Lo máximo que `user` puede quitarle a `target` (fracción de su vida máxima).
const bestDamage = (user, target) => Math.max(0, ...user.moveSlots.map(m => estimate(user, target, m.id)));

function scoreMove(user, target, slot, threat) {
  const move = dex.moves.get(slot.id);
  const hp = user.hp / user.maxhp, foeHp = target.hp / target.maxhp;
  const dmg = estimate(user, target, slot.id);
  if (move.category !== 'Status') {
    // Los que obligan a recargar (Anillo Ígneo, Gigaimpacto…) solo compensan si rematan.
    if (dmg < foeHp) return move.self?.volatileStatus === 'mustrecharge' ? dmg * 0.6 : dmg;
    // Puede dejarle K.O.: prioridad si el rival es más rápido y también nos deja K.O.
    const outsped = speed(target) >= speed(user) && threat >= hp;
    return 2 + (move.priority > 0 && outsped ? 2 : 0) + dmg * 0.01;
  }
  // Movimientos de estado.
  const types = target.getTypes();
  if (move.status) {
    if (target.status || !dex.getImmunity(move.type, types)) return 0;
    if (move.status === 'par' && (target.hasType('Electric') || target.hasType('Ground') && move.id === 'thunderwave')) return 0;
    if ((move.status === 'tox' || move.status === 'psn') && (target.hasType('Poison') || target.hasType('Steel'))) return 0;
    if (move.flags?.powder && target.hasType('Grass')) return 0;
    return move.status === 'slp' ? 0.75 : move.status === 'par' && speed(target) > speed(user) ? 0.5 : 0.3;
  }
  if (move.id === 'rest') return hp < 0.4 && user.status !== 'slp' ? 0.85 : 0;
  if (move.heal || ['morningsun', 'synthesis', 'moonlight', 'roost', 'recover', 'slackoff'].includes(move.id)) return hp < 0.5 ? 0.9 : 0;
  const boosts = move.boosts || move.self?.boosts;
  if (boosts && move.target === 'self') {
    const raised = Object.keys(boosts).filter(k => boosts[k] > 0);
    const already = Math.max(...raised.map(k => user.boosts[k] || 0));
    // Mejorar solo si el rival no nos puede hacer mucho daño este turno.
    return already < 2 && hp > 0.6 && threat < 0.45 ? 0.9 : 0;
  }
  return 0.05;
}

// Elección del jugador `side` dada la petición actual. Determinista.
export function aiChoice(battle, sideId = 'p2') {
  const side = battle[sideId];
  const req = side.activeRequest;
  if (!req || req.wait) return null;
  if (req.teamPreview) return 'default'; // el orden ya viene dado: el primero sale a combatir
  const foe = side.foe.active[0];
  if (req.forceSwitch) return 'switch ' + bestSwitch(side, foe);
  const me = side.active[0];
  const threat = bestDamage(foe, me);
  const moves = req.active[0].moves;
  let best = -1, bestScore = -1;
  moves.forEach((m, i) => {
    if (m.disabled || m.pp === 0) return;
    const s = scoreMove(me, foe, m, threat);
    if (s > bestScore) [best, bestScore] = [i, s];
  });
  // Cambiar si: está bloqueado (objeto Elección) en algo inútil, o apenas hace daño y el rival le pega fuerte,
  // o va a caer antes de actuar sin poder dejar K.O. — siempre que haya alguien que aguante mejor.
  const hp = me.hp / me.maxhp, foeFaster = speed(foe) >= speed(me);
  const lockedUseless = moves.filter(m => !m.disabled).length === 1 && bestScore < 0.15;
  const doomed = threat >= hp && foeFaster && bestScore < 2;
  if (!req.active[0].trapped && (lockedUseless || bestScore < 0.3 && threat >= 0.5 || doomed && hp > 0.3)) {
    const i = bestSwitch(side, foe) - 1, p = side.pokemon[i];
    if (p && !p.isActive && !p.fainted && bestDamage(foe, p) <= Math.min(threat * 0.6, 0.5 * p.hp / p.maxhp) && bestDamage(p, foe) >= 0.25) return 'switch ' + (i + 1);
  }
  return best < 0 ? 'default' : 'move ' + (best + 1);
}

function bestSwitch(side, foe) {
  let best = 0, bestScore = -Infinity;
  side.pokemon.forEach((p, i) => {
    if (p.fainted || p.isActive) return;
    let s = p.hp / p.maxhp * 0.2;
    if (foe && !foe.fainted) { // si caen los dos a la vez, el rival aún no ha salido: elegir solo por vida
      // Quién gana el intercambio: daño hecho y recibido, y quién deja K.O. primero según la Velocidad.
      const hp = p.hp / p.maxhp, foeHp = foe.hp / foe.maxhp, off = bestDamage(p, foe), def = bestDamage(foe, p);
      const faster = speed(p) > speed(foe);
      s += Math.min(off, foeHp) / foeHp - Math.min(def, hp) / hp;
      if (off >= foeHp && (faster || def < hp)) s += 1.5;
      if (def >= hp && !faster) s -= 1.5;
    }
    if (s > bestScore) [best, bestScore] = [i, s];
  });
  return best + 1;
}

// Aplica una elección del jugador y deja que Red responda hasta que vuelva a tocarle al jugador.
export function play(battle, choice) {
  if (!choice && battle.p1.activeRequest?.teamPreview) battle.choose('p1', 'default');
  if (choice && !battle.choose('p1', choice)) return false;
  for (let guard = 0; guard < 10 && !battle.ended; guard++) {
    const c = aiChoice(battle, 'p2');
    if (!c || battle.p2.isChoiceDone()) break;
    // Red de seguridad: si la IA eligiera algo inválido, el combate no puede quedarse parado.
    if (!battle.choose('p2', c)) battle.choose('p2', 'default');
  }
  return true;
}

// Reconstruye el combate de hoy a partir de las elecciones guardadas.
export function replay(date, team, choices, boss = 'red') {
  const battle = newBattle(date, team, boss);
  play(battle, null);
  for (const c of choices) play(battle, c);
  return battle;
}
