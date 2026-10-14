// Lógica pura del juego (sin DOM): reto diario, equipos de los rivales (Red, Cynthia), IA y combate.
// Todo es determinista: misma fecha + mismas elecciones = mismo combate.
import {Battle, Dex} from '@pkmn/sim';
import {TeamGenerators} from '@pkmn/randoms';

export const FORMAT = 'gen9customgame';
export const POOL_SIZE = 6;
export const TEAM_SIZE = 6;
const EPOCH = Date.UTC(2026, 9, 12); // día 1 de Redle
const dex = Dex.forGen(9);
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

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

// Modo Liga Pokémon: equipo aleatorio de Gen 1-9 y 5 rivales seguidos (4 del Alto Mando y el Campeón)
// elegidos cada día entre los de Redle. Entre combate y combate tu equipo se cura.
export const LEAGUE = {id: 'liga', gens: [1, 9], maxEVs: 508, team: [], rounds: 5, gimmicks: ['tera', 'mega', 'dynamax']};
export function leagueLineup(date) {
  const r = rng(`liga:${date}`), ids = Object.keys(BOSSES);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.slice(0, LEAGUE.rounds);
}
export const leaguePool = date => pool(`liga:${date}`, LEAGUE);

// Reglas del día: el mismo giro para todos los combates de ese día (o ninguno). Si el rival trae su
// propio clima (granizo de Red), las reglas de clima no se aplican contra él.
export const RULES = ['inverse', 'trickroom', 'gravity', 'sun', 'rain', 'sand', 'snow'];
const RULE_WEATHER = {sun: 'sunnyday', rain: 'raindance', sand: 'sandstorm', snow: 'snowscape'};
export function ruleFor(date, boss) {
  const r = rng(`regla:${date}`)();
  const rule = r < 0.4 ? 'none' : RULES[Math.floor((r - 0.4) / 0.6 * RULES.length)];
  return RULE_WEATHER[rule] && BOSSES[boss]?.weather ? 'none' : rule;
}
// Combate inverso: la tabla de tipos al revés (regla oficial de Showdown, que @pkmn/sim no trae).
const INVERSE = {name: 'Inverse Battle', effectType: 'Condition',
  onFieldStart() { this.add('-fieldstart', 'move: Inverse Battle'); },
  onNegateImmunity: false, onEffectivenessPriority: 1,
  onEffectiveness(typeMod, target, type, move) {
    if (move && move.id === 'freezedry' && type === 'Water') return;
    if (move && !this.dex.getImmunity(move, type)) return 1;
    return -typeMod;
  }};
function applyRule(battle, rule) {
  const holder = battle.p2.pokemon[0];
  if (RULE_WEATHER[rule]) {
    battle.field.setWeather(RULE_WEATHER[rule], holder);
    battle.field.weatherState.duration = 0;
  } else if (rule !== 'none') {
    if (rule === 'inverse') battle.dex.data.Conditions.inversebattle ||= INVERSE;
    const id = rule === 'inverse' ? 'inversebattle' : rule;
    battle.field.addPseudoWeather(id, holder);
    battle.field.pseudoWeather[id].duration = 0; // 0 = no se acaba
  }
}

const NOT_ALLOWED = new Set(['Restricted Legendary', 'Sub-Legendary', 'Mythical', 'Ultra Beast']);

// Los 6 Pokémon del día contra `boss`: sets de Random Battle Gen 9 de Showdown, sin legendarios,
// solo de las generaciones del rival (Red: Gen 1-2; Cynthia: Gen 1-4), a nivel 100.
export const dailyPool = (date, boss = 'red') => pool(`${boss}:${date}`, {...BOSSES[boss], team: teamOf(boss, date)});

function pool(key, {gens: [lo, hi], team, maxEVs, maxIVs = 31, format = 9, gimmicks = []}) {
  const gen = TeamGenerators.getTeamGenerator(`gen${format}randombattle`, seedFor(`pool:${key}`));
  const dex = Dex.forGen(format);
  const taken = new Set(team.map(s => dex.species.get(s.species).baseSpecies));
  // ponytail: corte por stats base; afinar con datos de partidas reales
  const candidates = Object.keys(gen.randomSets).map(id => dex.species.get(id))
    .filter(sp => sp.gen >= lo && sp.gen <= hi && sp.bst >= 420 && !sp.tags.some(t => NOT_ALLOWED.has(t)) && !taken.has(sp.baseSpecies));
  const r = rng(`pick:${key}`), out = [], seen = new Set();
  while (out.length < POOL_SIZE) {
    const sp = candidates[Math.floor(r() * candidates.length)];
    if (seen.has(sp.baseSpecies)) continue;
    seen.add(sp.baseSpecies);
    const set = gen.randomSet(sp.name, {}, out.length === 0);
    if (!gimmicks.includes('tera')) noTeraBlast(set, gen.randomSets[sp.id], key);
    out.push({...set, level: 100, gigantamax: false, ...wildTraining(set, key, maxEVs, maxIVs)});
  }
  luckyGimmick(out, key, gimmicks, dex);
  return out;
}

// Sin Teracristalización, Teraexplosión es un Ataque Normal de 80 sin más: se cambia por otro ataque del mismo
// Pokémon en Random Battle. Solo desde el 14-10-2026, para que los combates guardados y repeticiones anteriores cuadren.
const NO_TERA_BLAST_FROM = '2026-10-14';
function noTeraBlast(set, data, key) {
  const date = key.split(':')[1];
  if (/^\d{4}-\d\d-\d\d$/.test(date) && date < NO_TERA_BLAST_FROM) return;
  const i = set.moves.findIndex(m => toID(m) === 'terablast');
  if (i < 0) return;
  const has = new Set(set.moves.map(toID));
  const other = (data?.sets || []).flatMap(s => s.movepool).find(m => !has.has(toID(m)) && toID(m) !== 'terablast');
  if (other) set.moves[i] = other;
}

// Un 5 % de que a uno de tus Pokémon le toque su megapiedra o su forma Gigamax (según lo que permita el
// combate). Como mucho un Pokémon así por equipo.
export const GIMMICK_CHANCE = 0.05;
function luckyGimmick(team, key, gimmicks, dex) {
  const r = rng(`gimmick:${key}`);
  if (r() >= GIMMICK_CHANCE) return;
  const megaOf = set => dex.species.get(set.species).otherFormes?.map(f => dex.species.get(f)).find(f => f.isMega && f.requiredItem);
  const gmaxOf = set => dex.species.get(`${set.species}-Gmax`).exists;
  const options = [
    ...(gimmicks.includes('mega') ? team.filter(megaOf).map(set => () => { set.item = megaOf(set).requiredItem; }) : []),
    ...(gimmicks.includes('dynamax') ? team.filter(gmaxOf).map(set => () => { set.gigantamax = true; }) : []),
  ];
  if (options.length) options[Math.floor(r() * options.length)]();
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
export function wildTraining(set, date, maxEVs = 508, maxIVs = 31) {
  const r = rng(`training:${date}:${set.species}`);
  const ivs = Object.fromEntries(STATS.map(s => [s, Math.floor(r() * (maxIVs + 1))]));
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

// Equipos de los rivales tal cual en los juegos (especie, habilidad y ataques: de las decompilaciones
// de pret para Gen 2-4 y de Serebii para Iris y Leon). Para que sean más duros: nivel 100,
// IVs 31, EVs y naturaleza acordes a su set (en el juego llevan IVs 30, sin EVs y a nivel 58-88), y un
// objeto equipado cada uno (en el juego solo Pikachu lleva Bola Luminosa y Garchomp Baya Zidra; se mantienen).
// `weather`: clima fijo del escenario
// (en la cima del Monte Plateado de HGSS graniza siempre: daña a los que no son Hielo y Ventisca no falla).
export const BOSSES = {
  blue: {
    // HGSS, líder de Ciudad Verde (pret/pokeheartgold). Antiguo Campeón de Kanto.
    id: 'blue', name: 'Blue', gens: [1, 1], maxEVs: 252,
    team: [
      mon('Pidgeot', 'Sitrus Berry', 'Keen Eye', 'Naive', ev('atk', 'spe', 'spa'), ['Return', 'Whirlwind', 'Air Slash', 'Mirror Move']),
      mon('Exeggutor', 'Leftovers', 'Chlorophyll', 'Modest', ev('hp', 'spa', 'spd'), ['Leaf Storm', 'Psychic', 'Hypnosis', 'Trick Room']),
      mon('Arcanine', 'Life Orb', 'Intimidate', 'Adamant', ev('atk', 'spe'), ['Roar', 'Dragon Pulse', 'Flare Blitz', 'Extreme Speed']),
      mon('Rhydon', 'Eviolite', 'Rock Head', 'Adamant', ev('hp', 'atk', 'def'), ['Megahorn', 'Stone Edge', 'Thunder Fang', 'Earthquake']),
      mon('Gyarados', 'Leftovers', 'Intimidate', 'Adamant', ev('atk', 'spe'), ['Ice Fang', 'Waterfall', 'Dragon Dance', 'Return']),
      mon('Machamp', 'Choice Band', 'No Guard', 'Adamant', ev('hp', 'atk'), ['Dynamic Punch', 'Earthquake', 'Stone Edge', 'Thunder Punch']),
    ],
  },
  red: {
    // maxEVs / maxIVs: topes de EVs e IVs al azar de tu equipo, las palancas de dificultad por rival.
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
  lance: {
    // HGSS, primer combate contra el Campeón (pret/pokeheartgold): el clásico, con sus tres Dragonite.
    id: 'lance', name: 'Lance', gens: [1, 2], maxEVs: 100, maxIVs: 24,
    team: [
      mon('Gyarados', 'Leftovers', 'Intimidate', 'Adamant', ev('atk', 'spe'), ['Flail', 'Dragon Pulse', 'Waterfall', 'Ice Fang']),
      mon('Dragonite', 'Life Orb', 'Inner Focus', 'Naive', ev('atk', 'spe', 'spa'), ['Thunder Wave', 'Dragon Rush', 'Thunder', 'Hyper Beam']),
      mon('Dragonite', 'Expert Belt', 'Inner Focus', 'Naive', ev('atk', 'spe', 'spa'), ['Thunder Wave', 'Dragon Rush', 'Blizzard', 'Hyper Beam']),
      mon('Aerodactyl', 'Life Orb', 'Pressure', 'Jolly', ev('atk', 'spe'), ['Aerial Ace', 'Crunch', 'Rock Slide', 'Thunder Fang']),
      mon('Charizard', 'Expert Belt', 'Blaze', 'Naive', ev('atk', 'spe', 'spa'), ['Shadow Claw', 'Air Slash', 'Dragon Claw', 'Fire Fang']),
      mon('Dragonite', 'Sitrus Berry', 'Inner Focus', 'Naive', ev('atk', 'spa', 'spe'), ['Fire Blast', 'Safeguard', 'Outrage', 'Hyper Beam']),
    ],
    // Hasta el 14-10-2026 se jugó con su equipo de revancha: se conserva para que los combates guardados y las
    // repeticiones de esos días cuadren.
    oldTeam: {until: '2026-10-15', team: [
      mon('Gyarados', 'Leftovers', 'Intimidate', 'Adamant', ev('atk', 'spe'), ['Thunder Wave', 'Ice Fang', 'Waterfall', 'Dragon Dance']),
      mon('Salamence', 'Lum Berry', 'Intimidate', 'Naive', ev('atk', 'spe', 'spa'), ['Flamethrower', 'Shadow Claw', 'Dragon Claw', 'Rest']),
      mon('Garchomp', 'Life Orb', 'Sand Veil', 'Jolly', ev('atk', 'spe'), ['Swords Dance', 'Outrage', 'Earthquake', 'Roar']),
      mon('Altaria', 'Leftovers', 'Natural Cure', 'Modest', ev('hp', 'spa', 'def'), ['Perish Song', 'Dragon Breath', 'Double Team', 'Hyper Beam']),
      mon('Charizard', 'Expert Belt', 'Blaze', 'Naive', ev('spa', 'spe', 'atk'), ['Flamethrower', 'Air Slash', 'Dragon Claw', 'Hyper Beam']),
      mon('Dragonite', 'Sitrus Berry', 'Inner Focus', 'Modest', ev('spa', 'spe', 'hp'), ['Fire Blast', 'Safeguard', 'Draco Meteor', 'Hyper Beam']),
    ]},
  },
  steven: {
    // Rubí y Zafiro, Campeón de Hoenn (pret/pokeruby).
    id: 'steven', name: 'Steven', gens: [1, 3], maxEVs: 0, maxIVs: 15,
    team: [
      mon('Skarmory', 'Leftovers', 'Keen Eye', 'Impish', ev('hp', 'def', 'atk'), ['Toxic', 'Aerial Ace', 'Spikes', 'Steel Wing']),
      mon('Claydol', 'Light Clay', 'Levitate', 'Relaxed', ev('hp', 'def', 'atk'), ['Reflect', 'Light Screen', 'Ancient Power', 'Earthquake']),
      mon('Aggron', 'Expert Belt', 'Sturdy', 'Quiet', ev('hp', 'atk', 'spa'), ['Thunder', 'Earthquake', 'Solar Beam', 'Dragon Claw']),
      mon('Cradily', 'Leftovers', 'Suction Cups', 'Modest', ev('hp', 'spa', 'spd'), ['Giga Drain', 'Ancient Power', 'Sludge Bomb', 'Confuse Ray']),
      mon('Armaldo', 'Life Orb', 'Battle Armor', 'Naive', ev('atk', 'spe', 'spa'), ['Water Pulse', 'Ancient Power', 'Aerial Ace', 'Slash']),
      mon('Metagross', 'Sitrus Berry', 'Clear Body', 'Adamant', ev('hp', 'atk', 'spd'), ['Earthquake', 'Psychic', 'Meteor Mash', 'Hyper Beam']),
    ],
  },
  wallace: {
    // Esmeralda, Campeón de Hoenn (pret/pokeemerald).
    id: 'wallace', name: 'Wallace', gens: [1, 3], maxEVs: 100,
    team: [
      mon('Wailord', 'Leftovers', 'Water Veil', 'Modest', ev('hp', 'spa', 'def'), ['Rain Dance', 'Water Spout', 'Double-Edge', 'Blizzard']),
      mon('Tentacruel', 'Black Sludge', 'Clear Body', 'Timid', ev('spa', 'spe'), ['Toxic', 'Hydro Pump', 'Sludge Bomb', 'Ice Beam']),
      mon('Ludicolo', 'Leftovers', 'Swift Swim', 'Modest', ev('spa', 'spe'), ['Giga Drain', 'Surf', 'Leech Seed', 'Double Team']),
      mon('Whiscash', 'Leftovers', 'Oblivious', 'Rash', ev('hp', 'atk', 'spa'), ['Earthquake', 'Surf', 'Amnesia', 'Hyper Beam']),
      mon('Gyarados', 'Life Orb', 'Intimidate', 'Adamant', ev('atk', 'spe'), ['Dragon Dance', 'Earthquake', 'Hyper Beam', 'Surf']),
      mon('Milotic', 'Sitrus Berry', 'Marvel Scale', 'Bold', ev('hp', 'def', 'spa'), ['Recover', 'Surf', 'Ice Beam', 'Toxic']),
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
  iris: {
    // Negro 2 y Blanco 2, Campeona de Teselia (Serebii; habilidades y objetos del juego).
    id: 'iris', name: 'Iris', gens: [1, 5], maxEVs: 200,
    team: [
      mon('Hydreigon', 'Expert Belt', 'Levitate', 'Modest', ev('spa', 'spe'), ['Flamethrower', 'Charge Beam', 'Dragon Pulse', 'Surf']),
      mon('Druddigon', 'Life Orb', 'Sheer Force', 'Brave', ev('hp', 'atk', 'spa'), ['Rock Slide', 'Flamethrower', 'Dragon Tail', 'Focus Blast']),
      // Sin objeto a propósito: Acróbata dobla su potencia si no lleva nada.
      mon('Archeops', '', 'Defeatist', 'Jolly', ev('atk', 'spe'), ['Acrobatics', 'Rock Slide', 'Dragon Claw', 'Endeavor']),
      mon('Aggron', 'Leftovers', 'Rock Head', 'Adamant', ev('hp', 'atk', 'spd'), ['Earthquake', 'Double-Edge', 'Rock Slide', 'Autotomize']),
      mon('Lapras', 'Leftovers', 'Water Absorb', 'Modest', ev('hp', 'spa', 'spd'), ['Surf', 'Ice Beam', 'Thunderbolt', 'Sing']),
      mon('Haxorus', 'Focus Sash', 'Mold Breaker', 'Jolly', ev('atk', 'spe'), ['Earthquake', 'X-Scissor', 'Dual Chop', 'Dragon Dance']),
    ],
  },
  leon: {
    // Espada y Escudo, Campeón de Galar (Serebii; variante con Seismitoad y Cinderace).
    // format: reglas del combate (Gen 8 = con Dinamax). gimmicks: lo que se puede usar en sus combates.
    id: 'leon', name: 'Leon', gens: [1, 8], maxEVs: 508, format: 8, gimmicks: ['dynamax'],
    team: [
      mon('Aegislash', 'Leftovers', 'Stance Change', 'Quiet', ev('hp', 'spa', 'atk'), ["King's Shield", 'Shadow Ball', 'Sacred Sword', 'Flash Cannon']),
      mon('Dragapult', 'Choice Specs', 'Clear Body', 'Timid', ev('spa', 'spe'), ['Shadow Ball', 'Flamethrower', 'Thunderbolt', 'Dragon Breath']),
      mon('Haxorus', 'Life Orb', 'Mold Breaker', 'Jolly', ev('atk', 'spe'), ['Poison Jab', 'Iron Tail', 'Outrage', 'Earthquake']),
      mon('Seismitoad', 'Leftovers', 'Swift Swim', 'Adamant', ev('hp', 'atk', 'spd'), ['Toxic', 'Drain Punch', 'Liquidation', 'Earthquake']),
      mon('Cinderace', 'Life Orb', 'Blaze', 'Jolly', ev('atk', 'spe'), ['Pyro Ball', 'Feint', 'Acrobatics', 'Quick Attack']),
      mon('Charizard', 'Power Herb', 'Blaze', 'Timid', ev('spa', 'spe'), ['Fire Blast', 'Air Slash', 'Solar Beam', 'Ancient Power']),
    ],
  },
};
export const RED_TEAM = BOSSES.red.team;

// Equipo del rival para un combate o día (`key` lleva la fecha): el antiguo si el rival lo cambió después.
const dateOf = key => String(key).match(/\d{4}-\d\d-\d\d/)?.[0];
export function teamOf(boss, key) {
  const b = BOSSES[boss], d = dateOf(key);
  return b.oldTeam && d && d < b.oldTeam.until ? b.oldTeam.team : b.team;
}

// `key` identifica el combate (fecha, práctica o ronda de Liga) y da la semilla; `rule` es la regla del día.
// Plan de mecanismo del rival: un solo mecanismo por combate.
// - Leon siempre gigamaxiza a su as, Charizard (como en Espada/Escudo), también en la Liga.
// - En la Liga, el resto tiene un 10 % de usar uno: Mega (si alguno de su equipo puede), Dinamax o Tera.
//   Mega y Dinamax van reservados a un Pokémon concreto; si cae antes de usarlo, puede teracristalizar a otro.
export const BOSS_GIMMICK_CHANCE = 0.1;
export function bossPlan(key, boss) {
  if (boss === 'leon') return {kind: 'dynamax', species: 'Charizard'};
  if (!String(key).startsWith('liga')) return null;
  const r = rng(`plan:${boss}:${key}`);
  if (r() >= BOSS_GIMMICK_CHANCE) return null;
  const team = teamOf(boss, key);
  const megas = team.flatMap(s => (dex.species.get(s.species).otherFormes || []).map(f => dex.species.get(f))
    .filter(f => f.isMega && f.requiredItem).map(f => ({kind: 'mega', species: s.species, item: f.requiredItem})));
  const kinds = [...(megas.length ? ['mega'] : []), 'dynamax', 'tera'];
  const kind = kinds[Math.floor(r() * kinds.length)];
  if (kind === 'mega') return megas[Math.floor(r() * megas.length)];
  if (kind === 'dynamax') return {kind, species: team[Math.floor(r() * team.length)].species};
  return {kind};
}
// El equipo del rival con lo que necesita su plan: la megapiedra o la marca de Dinamax (y Gigamax si existe).
function bossTeam(boss, plan, key) {
  return teamOf(boss, key).map(s => {
    if (!plan || s.species !== plan.species) return s;
    if (plan.kind === 'mega') return {...s, item: plan.item};
    return {...s, dynamax: true, gigantamax: dex.species.get(`${s.species}-Gmax`).exists};
  });
}

// Mecanismos por combate: en la Liga, todos (Tera, Mega y Dinamax); contra un rival, los de su generación.
// Las rondas de la Liga se reconocen porque su clave empieza por "liga".
export function battleGimmicks(key, boss) {
  return String(key).startsWith('liga') ? LEAGUE.gimmicks : BOSSES[boss].gimmicks || [];
}
export function newBattle(key, team, boss = 'red', rule = ruleFor(key, boss)) {
  const gimmicks = battleGimmicks(key, boss), league = String(key).startsWith('liga');
  const format = league ? 9 : BOSSES[boss].format || 9;
  const formatid = `gen${format}customgame${format === 9 && !gimmicks.includes('tera') ? '@@@Terastal Clause' : ''}`;
  const battle = new Battle({formatid, seed: seedFor(`battle:${boss}:${key}`)});
  battle.setPlayer('p1', {name: 'Tú', team});
  battle.bossPlan = bossPlan(key, boss);
  battle.aiLegacy = (String(key).match(/\d{4}-\d\d-\d\d/)?.[0] || '9') < '2026-10-15'; // IA anterior (ver abilityBlocks)
  battle.setPlayer('p2', {name: BOSSES[boss].name, team: bossTeam(boss, battle.bossPlan, key)});
  // Dinamax en un combate de Gen 9 (solo la Liga): Showdown lo da por gastado desde el inicio fuera de Gen 8.
  if (format !== 8 && gimmicks.includes('dynamax')) {
    for (const side of battle.sides) { side.dynamaxUsed = false; side.canDynamaxNow = function () { return !this.dynamaxUsed; }; }
  }
  const weather = BOSSES[boss].weather;
  if (weather) {
    battle.field.setWeather(weather, battle.p2.pokemon[0]);
    battle.field.weatherState.duration = 0; // 0 = no se acaba
  }
  applyRule(battle, rule);
  return battle;
}

// ---------- IA del rival ----------

const IMMUNE_ABILITY = {Levitate: 'Ground', 'Earth Eater': 'Ground', 'Flash Fire': 'Fire', 'Well-Baked Body': 'Fire', 'Water Absorb': 'Water', 'Storm Drain': 'Water',
  'Dry Skin': 'Water', 'Volt Absorb': 'Electric', 'Lightning Rod': 'Electric', 'Motor Drive': 'Electric', 'Sap Sipper': 'Grass'};
// Habilidades que anulan ataques por su forma, no por su tipo: Surcavientos (viento: Ventisca, Vendaval…),
// Insonorizar (sonido), Antibalas (bombas y balas), Funda (polvos), Cuerpo Áureo (estado) y las que paran la prioridad.
const FLAG_BLOCK = {windrider: 'wind', soundproof: 'sound', bulletproof: 'bullet', overcoat: 'powder'};
const MOLD_BREAKER = ['moldbreaker', 'teravolt', 'turboblaze'];
// ¿La habilidad del objetivo anula este ataque? (Rompemoldes y similares las ignoran.)
// Las anulaciones por forma se tienen en cuenta desde el 15-10-2026: antes la IA no las veía y así se reproducen
// igual los combates guardados de esos días.
function abilityBlocks(user, target, move) {
  const ab = target.ability;
  if (!ab) return false;
  if (target.battle.aiLegacy) return IMMUNE_ABILITY[dex.abilities.get(ab).name] === move.type && move.category !== 'Status';
  if (MOLD_BREAKER.includes(user.ability)) return false;
  if (IMMUNE_ABILITY[dex.abilities.get(ab).name] === move.type && move.category !== 'Status') return true;
  if (move.flags?.[FLAG_BLOCK[ab]]) return true;
  if (ab === 'goodasgold' && move.category === 'Status' && move.target !== 'self' && !move.sideCondition) return true;
  return ['dazzling', 'queenlymajesty', 'armortail'].includes(ab) && move.priority > 0;
}

// Daño esperado aproximado (fracción de la vida del objetivo). No consume PRNG.
export function estimate(user, target, moveId) {
  const move = dex.moves.get(moveId);
  if (move.category === 'Status' || !target || target.fainted) return 0;
  const type = move.type;
  const grav = !target.battle.aiLegacy && type === 'Ground' && target.battle.field.pseudoWeather.gravity;
  if (!grav && (!inverse(target) && !dex.getImmunity(type, target.getTypes()) || abilityBlocks(user, target, move))) return 0;
  const eff = typeEff(type, target);
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
  let acc = move.accuracy === true ? 100 : move.accuracy;
  if (!target.battle.aiLegacy) ({mod, acc, def} = fieldMods(user, target, move, mod, acc, def, physical));
  const dmg = ((42 * bp * atk / def) / 50 + 2) * mod * eff * 0.92 * (Math.min(100, acc) / 100);
  return dmg / target.maxhp;
}

// Clima y campos en el daño esperado (desde el 15-10-2026, ver aiLegacy). effectiveWeather ya tiene en cuenta
// Aclimatación y Bucle Aire.
function fieldMods(user, target, move, mod, acc, def, physical) {
  const field = target.battle.field, weather = field.effectiveWeather(), terrain = field.terrain, type = move.type;
  if (weather === 'sunnyday') { if (type === 'Fire') mod *= 1.5; if (type === 'Water') mod *= 0.5; }
  if (weather === 'raindance') { if (type === 'Water') mod *= 1.5; if (type === 'Fire') mod *= 0.5; }
  if (weather === 'sandstorm' && !physical && target.hasType('Rock')) def *= 1.5;
  if ((weather === 'snow' || weather === 'snowscape') && physical && target.hasType('Ice')) def *= 1.5;
  // Precisión según el clima: Trueno y Vendaval no fallan con lluvia (50 % con sol); Ventisca no falla con granizo/nieve.
  if (['thunder', 'hurricane'].includes(move.id)) acc = weather === 'raindance' ? 100 : weather === 'sunnyday' ? 50 : acc;
  if (move.id === 'blizzard' && ['hail', 'snow', 'snowscape'].includes(weather)) acc = 100;
  // Rayo Solar / Cuchilla Solar tardan dos turnos sin sol (y pegan la mitad con lluvia, arena o nieve).
  if (['solarbeam', 'solarblade'].includes(move.id) && weather !== 'sunnyday') mod *= weather ? 0.25 : 0.5;
  if (move.id === 'weatherball' && weather) mod *= 2;
  // Campos: solo afectan a quien toca el suelo.
  const userGround = user.isGrounded(), targetGround = target.isGrounded();
  if (userGround && (terrain === 'electricterrain' && type === 'Electric' || terrain === 'grassyterrain' && type === 'Grass' || terrain === 'psychicterrain' && type === 'Psychic')) mod *= 1.3;
  if (targetGround && terrain === 'mistyterrain' && type === 'Dragon') mod *= 0.5;
  if (targetGround && terrain === 'grassyterrain' && ['earthquake', 'bulldoze', 'magnitude'].includes(move.id)) mod *= 0.5;
  if (targetGround && terrain === 'psychicterrain' && move.priority > 0) mod = 0; // el Campo Psíquico para la prioridad
  return {mod, acc, def};
}

const inverse = target => !!target.battle.field.pseudoWeather.inversebattle;
// Multiplicador por tipos, teniendo en cuenta el combate inverso (inmunes pasan a recibir el doble).
function typeEff(type, target) {
  const types = target.getTypes();
  if (!inverse(target)) return dex.getImmunity(type, types) ? 2 ** dex.getEffectiveness(type, types) : 0;
  return types.reduce((m, t) => m * (dex.getImmunity(type, [t]) ? 2 ** -dex.getEffectiveness(type, t) : 2), 1);
}

// Multiplicador de tipo para las pistas de la interfaz (null = movimiento de estado).
export function typeMultiplier(user, target, moveId) {
  const move = dex.moves.get(moveId);
  if (move.category === 'Status' || !target) return null;
  return typeEff(move.type, target);
}

// Bajo Espacio Raro el más lento mueve primero: para la IA, "más rápido" es al revés.
const speed = p => p.getStat('spe', false, true) * (p.battle.field.pseudoWeather.trickroom ? -1 : 1);
// Lo máximo que `user` puede quitarle a `target` (fracción de su vida máxima).
const bestDamage = (user, target) => Math.max(0, ...user.moveSlots.map(m => estimate(user, target, m.id)));

// Frenar al que se mejora (desde el 15-10-2026): la IA ve los ataques del rival, como en la vista previa de equipos.
// Con +2 o más: Rugido / Remolino / Cola Dragón / Llave Giro para echarlo, Niebla o Niebla Clara para borrar las
// mejoras, Canto Mortal si va muy subido. Antes de que se mejore: Mofa. Si acaba de usar un movimiento de estado: Otra Vez.
const SELF_BOOSTS = ['atk', 'def', 'spa', 'spd', 'spe'];
function setsUp(slot) {
  const m = dex.moves.get(slot.id), b = m.target === 'self' ? m.boosts : m.self?.boosts;
  return m.category === 'Status' && !!b && Object.values(b).some(v => v > 0);
}
function counterSetup(target, move, dmg) {
  const boosted = SELF_BOOSTS.reduce((a, k) => a + Math.max(0, target.boosts[k] || 0), 0);
  const bench = target.side.pokemon.some(p => !p.fainted && !p.isActive);
  const damaging = move.category !== 'Status';
  if (damaging && dmg === 0) return null; // no le afecta (inmune)
  if (move.forceSwitch && boosted >= 2 && bench && !target.volatiles.ingrain && target.ability !== 'suctioncups' && !target.volatiles.dynamax) return 1.6 + dmg * 0.1;
  if (move.id === 'haze') return boosted >= 2 ? 1.6 : 0;
  if (move.id === 'clearsmog' && boosted >= 2) return 1.5 + dmg;
  if (move.id === 'perishsong') return boosted >= 3 && !target.volatiles.perishsong ? 1.1 : 0;
  if (move.id === 'taunt') return target.volatiles.taunt || !target.moveSlots.some(setsUp) ? 0 : boosted >= 2 ? 0.5 : 0.8;
  if (move.id === 'encore') {
    const last = target.lastMove && dex.moves.get(target.lastMove.id);
    return last?.category === 'Status' && !target.volatiles.encore ? 1.2 : 0;
  }
  return null;
}

function scoreMove(user, target, slot, threat) {
  const move = dex.moves.get(slot.id);
  const hp = user.hp / user.maxhp, foeHp = target.hp / target.maxhp;
  const dmg = estimate(user, target, slot.id);
  if (!user.battle.aiLegacy && !(move.category === 'Status' && move.target !== 'self' && abilityBlocks(user, target, move))) {
    const counter = counterSetup(target, move, dmg);
    if (counter !== null) return counter;
  }
  if (move.category !== 'Status') {
    // Los que obligan a recargar (Anillo Ígneo, Gigaimpacto…) solo compensan si rematan.
    if (dmg < foeHp) return move.self?.volatileStatus === 'mustrecharge' ? dmg * 0.6 : dmg;
    // Puede dejarle K.O.: prioridad si el rival es más rápido y también nos deja K.O.
    const outsped = speed(target) >= speed(user) && threat >= hp;
    return 2 + (move.priority > 0 && outsped ? 2 : 0) + dmg * 0.01;
  }
  // Movimientos de estado.
  if (move.target !== 'self' && abilityBlocks(user, target, move)) return 0;
  const types = target.getTypes();
  if (move.status) {
    if (target.status || !dex.getImmunity(move.type, types)) return 0;
    if (!user.battle.aiLegacy && target.isGrounded() && (user.battle.field.terrain === 'mistyterrain'
      || move.status === 'slp' && user.battle.field.terrain === 'electricterrain')) return 0;
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
  // Pantallas y trampas (Reflejo, Pantalla Luz, Púas, Trampa Rocas…): si no están puestas y hay tiempo.
  if (move.sideCondition) {
    const side = move.target === 'foeSide' ? target.side : user.side;
    if (side.sideConditions[toID(move.sideCondition)]) return 0;
    const physicalFoe = target.getStat('atk', true, true) >= target.getStat('spa', true, true);
    if (move.id === 'reflect' && !physicalFoe || move.id === 'lightscreen' && physicalFoe) return 0.1;
    return threat < 0.6 && hp > 0.5 ? 0.55 : 0.05;
  }
  if (!user.battle.aiLegacy) {
    const field = user.battle.field;
    if (move.weather) return field.weather === toID(move.weather) ? 0 : 0.4; // poner su clima si no está
    if (move.terrain) return field.terrain === toID(move.terrain) ? 0 : 0.4;
    if (move.pseudoWeather) return field.pseudoWeather[toID(move.pseudoWeather)] ? 0 : 0.35;
  }
  // Confusión, Tóxico ya cubierto por `status`: confundir al rival si aún no lo está.
  if (move.volatileStatus === 'confusion') return target.volatiles.confusion ? 0 : 0.3;
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
  if (best < 0) return 'default';
  const r = req.active[0];
  const gimmick = r.canMegaEvo ? ' mega' : r.canDynamax && me.set.dynamax ? ' dynamax'
    : r.canTerastallize && sideId === 'p2' && teraNow(battle, side, me, foe) ? ' terastallize' : '';
  return 'move ' + (best + 1) + gimmick;
}

// ¿Teracristaliza ahora el rival? Solo si su plan es Tera, o si el Pokémon reservado para Mega/Dinamax
// cayó sin llegar a usarlo. Lo hace cuando el tipo Tera le protege del mejor ataque del rival o si es el último.
function teraNow(battle, side, me, foe) {
  const plan = battle.bossPlan;
  if (!plan) return false;
  if (plan.kind !== 'tera') {
    const ace = side.pokemon.find(p => p.set.species === plan.species);
    const used = battle.log.some(l => l.startsWith('|-mega|p2a') || /^\|-start\|p2a: [^|]+\|Dynamax/.test(l));
    if (!ace?.fainted || used) return false;
  }
  const last = side.pokemon.filter(p => !p.fainted).length === 1;
  const worst = foe.moveSlots.map(m => dex.moves.get(m.id)).filter(m => m.category !== 'Status')
    .sort((a, b) => estimate(foe, me, b.id) - estimate(foe, me, a.id))[0];
  if (!worst) return last;
  const types = me.getTypes(), tera = [me.teraType];
  const eff = t => dex.getImmunity(worst.type, t) ? 2 ** dex.getEffectiveness(worst.type, t) : 0;
  return last || eff(tera) < eff(types);
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
  // Rendirse: el combate acaba como derrota (queda en las elecciones, así que también se reproduce).
  if (choice === 'forfeit') { if (!battle.ended) battle.lose('p1'); return true; }
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
export function replay(key, team, choices, boss = 'red', rule) {
  const battle = newBattle(key, team, boss, rule);
  play(battle, null);
  for (const c of choices) play(battle, c);
  return battle;
}
