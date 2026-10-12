// Genera src/names-es.json (movimientos, habilidades y objetos en español) a partir de los CSV
// de PokéAPI (BSD-3). Solo hace falta volver a ejecutarlo si se amplía a otras generaciones.
//   node scripts/build-names.mjs
import {writeFileSync} from 'node:fs';
import {Dex} from '@pkmn/sim';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const ES = '7';
const toID = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const csv = async f => (await (await fetch(BASE + f)).text()).trim().split('\n').slice(1).map(l => l.split(','));

async function names(kind, wanted) {
  const ids = new Map((await csv(`${kind}.csv`)).map(r => [r[0], toID(r[1])]));
  const out = {};
  for (const [id, lang, name] of await csv(`${{moves: 'move', abilities: 'ability', items: 'item'}[kind]}_names.csv`)) {
    const key = ids.get(id);
    if (lang === ES && wanted.has(key)) out[key] = name;
  }
  return out;
}

const dex = Dex.forGen(9);
const pick = list => new Set(list.filter(x => x.exists && x.num > 0).map(x => x.id));
const data = {
  moves: await names('moves', pick(dex.moves.all())),
  abilities: await names('abilities', pick(dex.abilities.all())),
  items: await names('items', pick(dex.items.all())),
};
writeFileSync(new URL('../src/names-es.json', import.meta.url), JSON.stringify(data));
console.log(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Object.keys(v).length])));
