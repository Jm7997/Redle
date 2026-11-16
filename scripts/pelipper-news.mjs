// Pelipper anuncia en Discord las novedades nuevas de src/news.js. Lo lanza .github/workflows/pelipper-news.yml en
// cada push que cambia news.js: publica las entradas con un `id` mayor que las que había antes del push (BEFORE; si
// se suben varios commits a la vez, cuentan todos).
//   node scripts/pelipper-news.mjs [--id N]   (--id: publica esa entrada, para repetirla a mano)
import {execSync} from 'node:child_process';
import {NEWS} from '../src/news.js';
import {FOOTER, md, post} from './discord.mjs';

const arg = process.argv.indexOf('--id');
let entries;
if (arg > 0) entries = NEWS.filter(n => n.id === +process.argv[arg + 1]);
else {
  let before;
  try { before = Math.max(0, ...[...execSync(`git show ${process.env.BEFORE || 'HEAD~1'}:src/news.js`, {stdio: ['ignore', 'pipe', 'ignore']}).toString().matchAll(/\bid: (\d+)/g)].map(m => +m[1])); }
  catch { console.log('Sin el commit anterior: no se sabe qué es nuevo, nada que publicar.'); process.exit(); }
  entries = NEWS.filter(n => n.id > before).sort((a, b) => a.id - b.id);
}
if (!entries.length) { console.log('Ninguna novedad nueva.'); process.exit(); }

for (const n of entries) {
  const list = items => items.map(x => `• ${md(x)}`).join('\n\n');
  const day = new Date(n.date + 'T12:00:00Z').toLocaleDateString('es', {day: 'numeric', month: 'long', timeZone: 'UTC'});
  await post({
    thread: `📰 Novedades · ${day}`,
    embeds: [{
      title: `📰 ¡Novedades en Redle! · ${day}`,
      url: 'https://redle.pages.dev/',
      description: `${list(n.es)}\n\n🇬🇧 ${list(n.en)}`.slice(0, 4000),
      color: 0xdc0a2d,
      footer: {text: `Muchas salen de vuestras cartas: escribidme desde el Correo de Pelipper en la web · ${FOOTER}`},
    }],
  });
  console.log(`Publicada la novedad ${n.id}.`);
}
