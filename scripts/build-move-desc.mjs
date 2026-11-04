// Genera las descripciones oficiales tal y como salen en los juegos (la versión más reciente disponible), a partir
// de los CSV de PokéAPI (BSD-3):
//   src/move-desc-es.json y src/move-desc-en.json: ataques.
//   src/info-desc-es.json y src/info-desc-en.json: habilidades (`a`) y objetos (`i`), solo los que existen en Gen 9.
//   node scripts/build-move-desc.mjs
import {writeFileSync} from 'node:fs';
import {Dex} from '@pkmn/sim';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const LANGS = {7: 'es', 9: 'en'};
const toID = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// CSV con comillas y saltos de línea dentro de los campos (los textos de descripción los tienen).
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.slice(1);
}
const get = async f => parseCsv(await (await fetch(BASE + f)).text());

// {es: {id: texto}, en: {...}} con el texto de la versión de juego más reciente de cada uno.
async function flavor(kind, wanted = null, list = `${kind}s.csv`) {
  const ids = new Map((await get(list)).map(r => [r[0], toID(r[1])]));
  const best = new Map();
  for (const [id, vg, lang, text] of await get(`${kind}_flavor_text.csv`)) {
    if (!LANGS[lang] || !ids.has(id) || wanted && !wanted.has(ids.get(id))) continue;
    const key = `${id}:${lang}`;
    if (!best.has(key) || +vg > best.get(key).vg) best.set(key, {vg: +vg, text});
  }
  const out = {es: {}, en: {}};
  for (const [key, {text}] of best) {
    const [id, lang] = key.split(':');
    out[LANGS[lang]][ids.get(id)] = text.replace(/­\n?/g, '').replace(/-\n/g, '').replace(/\s+/g, ' ').trim();
  }
  return out;
}

// Lo que PokéAPI aún no trae (habilidades de Gen 9 en español y objetos nuevos), escrito a mano al estilo de los juegos.
const EXTRA = {
  es: {
    a: {
      goodasgold: 'Su cuerpo de oro puro no se oxida y le protege de los movimientos de estado de otros Pokémon.',
      protosynthesis: 'Si hace sol o lleva Energía Potenciadora, aumenta su característica más alta.',
      quarkdrive: 'Si hay Campo Eléctrico o lleva Energía Potenciadora, aumenta su característica más alta.',
      electromorphosis: 'Al recibir un golpe se carga de electricidad y su siguiente movimiento de tipo Eléctrico es más potente.',
      seedsower: 'Al recibir un golpe, esparce semillas y crea un Campo de Hierba.',
      angershell: 'Si un golpe le deja con menos de la mitad de PS, se enfurece: sube su Ataque, Ataque Especial y Velocidad, pero baja su Defensa y Defensa Especial.',
      windrider: 'Si sopla Viento Afín o le alcanza un movimiento de viento, sube su Ataque sin recibir daño.',
      supremeoverlord: 'Sus ataques son más potentes por cada Pokémon de su equipo que haya sido derrotado.',
      sharpness: 'Aumenta la potencia de los movimientos cortantes.',
      wellbakedbody: 'Los movimientos de tipo Fuego no le hacen daño; en su lugar, su Defensa aumenta mucho.',
      myceliummight: 'Sus movimientos de estado actúan los últimos, pero ignoran la habilidad del objetivo.',
      mindseye: 'Puede alcanzar a los Pokémon de tipo Fantasma con movimientos de tipo Normal y Lucha, y su precisión no se ve afectada.',
      thermalexchange: 'Al recibir un movimiento de tipo Fuego, sube su Ataque. No puede sufrir quemaduras.',
      zerotohero: 'Al retirarse del combate, adopta su Forma Heroica.',
      eartheater: 'Si le alcanza un movimiento de tipo Tierra, recupera PS en lugar de recibir daño.',
      purifyingsalt: 'Su sal pura le protege de los problemas de estado y reduce a la mitad el daño de los movimientos de tipo Fantasma.',
      toxicdebris: 'Al recibir un ataque físico, esparce Púas Tóxicas a los pies del rival.',
      cudchew: 'Una vez por turno, si se come una baya, la vuelve a rumiar al final del turno siguiente.',
    },
    i: {
      loadeddice: 'Debe llevarlo un Pokémon. Hace que los movimientos que golpean varias veces seguidas acierten más veces.',
      leek: "Debe llevarlo Farfetch'd o Sirfetch'd. Aumenta la probabilidad de asestar un golpe crítico.",
      boosterenergy: 'Debe llevarlo un Pokémon con Paleosíntesis o Carga Cuark. Aumenta su característica más alta.',
      clearamulet: 'Debe llevarlo un Pokémon. Impide que los movimientos o habilidades de otros Pokémon le bajen las características.',
    },
  },
  en: {
    a: {},
    i: {
      loadeddice: 'An item to be held by a Pokémon. Multistrike moves used by the holder are more likely to hit more times.',
      leek: "An item to be held by Farfetch'd or Sirfetch'd. It boosts the critical-hit ratio of the holder's moves.",
      boosterenergy: 'An item to be held by a Pokémon with Protosynthesis or Quark Drive. It boosts its most proficient stat.',
      clearamulet: "An item to be held by a Pokémon. It protects the holder from having its stats lowered by other Pokémon's moves or Abilities.",
    },
  },
};
// Megapiedras sin texto (las nuevas de Leyendas Z-A): el texto de siempre con su Pokémon.
const MEGA = {es: sp => `Una de las variedades de la misteriosa megapiedra. Si la lleva ${sp}, le permite megaevolucionar en combate.`,
  en: sp => `One variety of the mysterious Mega Stones. Have ${sp} hold it, and this stone will enable it to Mega Evolve during battle.`};

const dex = Dex.forGen(9);
const gen9 = list => new Set(list.filter(x => x.exists && x.num > 0).map(x => x.id));
const moves = await flavor('move');
const abilities = await flavor('ability', gen9(dex.abilities.all()), 'abilities.csv');
const items = await flavor('item', gen9(dex.items.all()));
for (const lang of ['es', 'en']) {
  abilities[lang] = {...EXTRA[lang].a, ...abilities[lang]};
  items[lang] = {...EXTRA[lang].i, ...items[lang]};
  for (const it of dex.items.all()) if (it.megaStone && !items[lang][it.id]) items[lang][it.id] = MEGA[lang](Object.keys(it.megaStone)[0]);
}
for (const lang of ['es', 'en']) {
  writeFileSync(new URL(`../src/move-desc-${lang}.json`, import.meta.url), JSON.stringify(moves[lang]));
  writeFileSync(new URL(`../src/info-desc-${lang}.json`, import.meta.url), JSON.stringify({a: abilities[lang], i: items[lang]}));
}
console.log(Object.keys(moves.es).length, 'ataques,', Object.keys(abilities.es).length, 'habilidades y', Object.keys(items.es).length, 'objetos en español;',
  Object.keys(abilities.en).length, 'y', Object.keys(items.en).length, 'en inglés');
