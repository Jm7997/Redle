// Comprueba que el recorte de datos de vite.config.js no rompe nada: compila src/game.js con ese
// mismo plugin (como en la web) y juega combates completos contra cada rival con el resultado.
//   npm run test:bundle
import {build} from 'vite';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripUnusedData} from '../vite.config.js';

const out = mkdtempSync(join(tmpdir(), 'redle-bundle-'));
try {
  await build({
    configFile: false, logLevel: 'warn', plugins: [stripUnusedData],
    ssr: {noExternal: true},
    build: {ssr: 'src/game.js', outDir: out, emptyOutDir: true, rollupOptions: {output: {entryFileNames: 'game.mjs'}}},
  });
  const g = await import(pathToFileURL(join(out, 'game.mjs')).href);
  for (const boss of Object.keys(g.BOSSES)) {
    for (let d = 0; d < 25; d++) {
      const date = `bundle-${d}`, team = g.dailyPool(date, boss), b = g.newBattle(date, team, boss), choices = [];
      g.play(b, null);
      while (!b.ended && choices.length < 500) {
        const c = g.aiChoice(b, 'p1') || 'default';
        if (!g.play(b, c)) throw new Error(`${boss} ${date}: elección rechazada ${c}`);
        choices.push(c);
      }
      if (!b.ended) throw new Error(`${boss} ${date}: el combate no termina`);
      if (g.replay(date, team, choices, boss).turn !== b.turn) throw new Error(`${boss} ${date}: la repetición no cuadra`);
    }
    console.log(`ok ${boss}: 25 combates con el bundle recortado`);
  }
} finally {
  rmSync(out, {recursive: true, force: true});
}
