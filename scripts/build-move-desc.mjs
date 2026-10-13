// Genera src/move-desc-es.json y src/move-desc-en.json: la descripción oficial de cada ataque tal y como sale
// en los juegos (la versión más reciente disponible), a partir de los CSV de PokéAPI (BSD-3).
//   node scripts/build-move-desc.mjs
import {writeFileSync} from 'node:fs';

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

const ids = new Map((await get('moves.csv')).map(r => [r[0], toID(r[1])]));
const best = new Map();
for (const [move, vg, lang, text] of await get('move_flavor_text.csv')) {
  if (!LANGS[lang] || !ids.has(move)) continue;
  const key = `${move}:${lang}`;
  if (!best.has(key) || +vg > best.get(key).vg) best.set(key, {vg: +vg, text});
}
const out = {es: {}, en: {}};
for (const [key, {text}] of best) {
  const [move, lang] = key.split(':');
  out[LANGS[lang]][ids.get(move)] = text.replace(/­\n?/g, '').replace(/-\n/g, '').replace(/\s+/g, ' ').trim();
}
for (const lang of ['es', 'en']) writeFileSync(new URL(`../src/move-desc-${lang}.json`, import.meta.url), JSON.stringify(out[lang]));
console.log(Object.keys(out.es).length, 'en español,', Object.keys(out.en).length, 'en inglés');
