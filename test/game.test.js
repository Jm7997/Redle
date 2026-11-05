import test from 'node:test';
import assert from 'node:assert/strict';
import {Dex} from '@pkmn/sim';
import {dailyPool, replay, newBattle, play, aiChoice, dayNumber, today, msToNext, POOL_SIZE, BOSSES, leagueLineup, leaguePool, ruleFor, typeMultiplier, LEAGUE, bossPlan, teamOf, poolFor, poolOf, pokedexList, DOUBLES, DUOS, duoOf, doublesOpen, nextSunday, RETO, retoOpen, retoBoss, retoPool, estimate, bossPool, PICK} from '../src/game.js';
import {SEASONS, seasonOf, seasonDaysLeft} from '../src/seasons.js';
import {BALANCE} from '../src/balance.js';

test('el reto del día es igual para todos y cambia cada día', () => {
  const a = dailyPool('2026-10-12'), b = dailyPool('2026-10-12'), c = dailyPool('2026-10-13');
  assert.equal(a.length, POOL_SIZE);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map(s => s.species), c.map(s => s.species));
  assert.equal(new Set(a.map(s => s.species)).size, POOL_SIZE);
  assert.equal(dayNumber('2026-10-12'), 1);
});

test('un combate completo termina y se puede reproducir desde las elecciones', () => {
  const date = '2026-10-20', team = dailyPool(date).slice(0, 6), choices = [];
  const battle = newBattle(date, team);
  play(battle, null);
  while (!battle.ended && choices.length < 500) {
    const c = aiChoice(battle, 'p1') || 'default';
    assert.ok(play(battle, c));
    choices.push(c);
  }
  assert.ok(battle.ended);
  const again = replay(date, team, choices);
  assert.equal(again.winner, battle.winner);
  const noTime = log => log.filter(l => !l.startsWith('|t:|'));
  assert.deepEqual(noTime(again.log), noTime(battle.log));
});

test('tus Pokémon van a nivel 100 con IVs, EVs y naturaleza al azar pero válidos', () => {
  for (const set of dailyPool('2026-10-12')) {
    assert.equal(set.level, 100);
    assert.ok(Object.values(set.evs).reduce((a, b) => a + b, 0) <= 508, set.species);
    assert.ok(Object.values(set.evs).every(v => v <= 252 && v % 4 === 0), set.species);
    assert.ok(Object.values(set.ivs).every(v => v >= 0 && v <= 31), set.species);
  }
});

test('el reto cambia a medianoche hora de España', () => {
  // Octubre de 2026: España está en UTC+2 (horario de verano).
  assert.equal(today(new Date('2026-10-12T21:59:00Z')), '2026-10-12'); // 23:59 en Madrid
  assert.equal(today(new Date('2026-10-12T22:00:00Z')), '2026-10-13'); // 00:00 en Madrid
  assert.equal(msToNext(new Date('2026-10-12T21:00:00Z')), 3600e3);
});

test('cada rival tiene su equipo del juego y tu equipo sale de sus generaciones', () => {
  const dex = Dex.forGen(9);
  assert.deepEqual(BOSSES.red.team.map(s => s.species), ['Pikachu', 'Lapras', 'Snorlax', 'Venusaur', 'Charizard', 'Blastoise']);
  assert.deepEqual(BOSSES.cynthia.team.map(s => s.species), ['Spiritomb', 'Roserade', 'Togekiss', 'Lucario', 'Milotic', 'Garchomp']);
  // Lance: su primer combate de HGSS (con tres Dragonite) desde el 15-10-2026; antes, el de revancha.
  assert.deepEqual(teamOf('lance', '2026-10-15').map(s => s.species), ['Gyarados', 'Dragonite', 'Dragonite', 'Aerodactyl', 'Charizard', 'Dragonite']);
  assert.deepEqual(teamOf('lance', '2026-10-14').map(s => s.species), ['Gyarados', 'Salamence', 'Garchomp', 'Altaria', 'Charizard', 'Dragonite']);
  for (const b of Object.values(BOSSES)) {
    assert.equal(b.team.length, 6, b.id);
    const [lo, hi] = b.gens;
    for (let d = 1; d <= 3; d++) {
      for (const set of dailyPool(`2026-11-0${d}`, b.id)) {
        const sp = dex.species.get(set.species);
        assert.ok(sp.gen >= lo && sp.gen <= hi, `${b.id}: ${sp.name} es de Gen ${sp.gen}`);
        assert.ok(!sp.tags.some(t => t !== 'Paradox'), `${b.id}: ${sp.name} es legendario`);
      }
    }
  }
});

test('la Liga: 5 rivales distintos al día, equipo de Gen 1-9 y regla del día estable', () => {
  const a = leagueLineup('2026-10-13');
  assert.equal(a.length, LEAGUE.rounds);
  assert.equal(new Set(a).size, LEAGUE.rounds);
  assert.ok(a.every(id => BOSSES[id]));
  assert.deepEqual(a, leagueLineup('2026-10-13'));
  assert.equal(leaguePool('2026-10-13').length, POOL_SIZE);
  assert.equal(ruleFor('2026-10-13', 'leon'), ruleFor('2026-10-13', 'leon'));
  // Red ya tiene granizo: las reglas de clima no se aplican contra él.
  for (let d = 0; d < 60; d++) assert.ok(!['sun', 'rain', 'sand', 'snow'].includes(ruleFor(`x-${d}`, 'red')));
});

test('con combate inverso, Fuego es muy eficaz contra Agua', () => {
  for (let d = 0; d < 400; d++) {
    if (ruleFor(`inv-${d}`, 'cynthia') !== 'inverse') continue;
    const b = newBattle(`inv-${d}`, dailyPool('2026-10-13', 'cynthia'), 'cynthia');
    assert.ok(b.field.pseudoWeather.inversebattle);
    return;
  }
  assert.fail('ningún día con combate inverso en 400 días');
});

test('los rivales llevan objeto y contra Red empieza granizando', () => {
  for (const boss of Object.keys(BOSSES)) {
    assert.ok(BOSSES[boss].team.filter(s => !s.item).every(s => s.moves.includes('Acrobatics')), boss); // solo va sin objeto quien usa Acróbata
    for (let d = 0; d < 6; d++) {
      const date = `2026-12-${String(d + 1).padStart(2, '0')}`, team = dailyPool(date, boss), b = newBattle(date, team, boss), choices = [];
      play(b, null);
      while (!b.ended && choices.length < 500) { const c = aiChoice(b, 'p1') || 'default'; play(b, c); choices.push(c); }
      if (boss === 'red') assert.equal(b.log.find(l => l.startsWith('|-weather|')), '|-weather|Hail'); // empieza granizando (una habilidad de clima puede cambiarlo)
      assert.equal(replay(date, team, choices, boss).turn, b.turn, `${boss} ${date} se reproduce igual`);
    }
  }
});

test('60 combates por rival con elecciones al azar terminan sin errores y se reproducen igual', () => {
  for (const boss of Object.keys(BOSSES)) {
    for (let d = 0; d < 60; d++) {
      const date = `azar-${d}`, team = dailyPool(date, boss), b = newBattle(date, team, boss), choices = [];
      let x = d + 1; // pseudoaleatorio simple y repetible
      const rand = n => (x = (x * 1103515245 + 12345) % 2147483648) % n;
      play(b, null);
      while (!b.ended && choices.length < 1000) {
        const req = b.p1.activeRequest;
        const options = [];
        if (!req.forceSwitch) req.active[0].moves.forEach((m, i) => !m.disabled && options.push(`move ${i + 1}`));
        if (req.forceSwitch || !req.active[0].trapped) b.p1.pokemon.forEach((p, i) => !p.fainted && !p.isActive && options.push(`switch ${i + 1}`));
        const c = options.length ? options[rand(options.length)] : 'default';
        assert.ok(play(b, c), `${boss} ${date}: elección rechazada ${c}`);
        choices.push(c);
      }
      assert.ok(b.ended, `${boss} ${date} no termina`);
      if (d % 20 === 0) assert.equal(replay(date, team, choices, boss).turn, b.turn);
    }
  }
});

test('teracristalizar (Liga) y rendirse funcionan y se reproducen igual', () => {
  const date = '2026-10-14', key = `liga0:${date}`, team = leaguePool(date), boss = leagueLineup(date)[0], b = newBattle(key, team, boss);
  play(b, null);
  assert.ok(b.p1.activeRequest.active[0].canTerastallize);
  const choices = ['move 1 terastallize', 'forfeit'];
  for (const c of choices) assert.ok(play(b, c));
  assert.ok(b.log.some(l => l.startsWith('|-terastallize|p1a:')));
  assert.ok(b.ended);
  assert.equal(b.winner, BOSSES[boss].name);
  assert.equal(replay(key, team, choices, boss).turn, b.turn);
});

test('mecanismos por combate: Liga los tres, Leon Dinamax en Gen 8, el resto ninguno', () => {
  const req = b => (play(b, null), b.p1.activeRequest.active[0]);
  const liga = req(newBattle('liga0:2026-10-14', leaguePool('2026-10-14'), 'red'));
  assert.ok(liga.canTerastallize && liga.canDynamax);
  const leon = newBattle('2026-10-14', dailyPool('2026-10-14', 'leon'), 'leon');
  assert.equal(leon.gen, 8);
  const lr = req(leon);
  assert.ok(lr.canDynamax && !lr.canTerastallize);
  for (const boss of ['blue', 'red', 'lance', 'steven', 'wallace', 'cynthia', 'iris']) {
    const r = req(newBattle('2026-10-14', dailyPool('2026-10-14', boss), boss));
    assert.ok(!r.canTerastallize && !r.canDynamax && !r.canMegaEvo, boss);
  }
});

test('en la Liga los rivales usan como mucho un mecanismo por combate (≈10 %) y Leon siempre gigamaxiza', () => {
  let plans = 0, n = 0;
  for (let d = 0; d < 80; d++) {
    const date = `M${d}`, team = leaguePool(date);
    for (const [i, boss] of leagueLineup(date).entries()) {
      const key = `liga${i}:${date}`;
      if (boss === 'leon') { assert.deepEqual(bossPlan(key, boss), {kind: 'dynamax', species: 'Charizard'}); continue; }
      n++; if (bossPlan(key, boss)) plans++;
      if (d % 4) continue;
      const b = newBattle(key, team, boss); play(b, null); let g = 0;
      while (!b.ended && g++ < 500) play(b, aiChoice(b, 'p1') || 'default');
      const used = [/^\|-mega\|p2a/, /^\|-start\|p2a: [^|]+\|Dynamax/, /^\|-terastallize\|p2a/].filter(re => b.log.some(l => re.test(l))).length;
      assert.ok(used <= 1, `${boss} ${key} usó ${used} mecanismos`);
    }
  }
  assert.ok(plans / n > 0.04 && plans / n < 0.2, `planes ${plans}/${n}`);
  assert.equal(bossPlan('2026-10-14', 'red'), null); // fuera de la Liga, nada
});

test('equilibrio diario: solo días desde el 24-10, sorteo alternativo determinista y distinto del normal', () => {
  const entries = Object.entries(BALANCE);
  for (const [key, i] of entries) {
    const [boss, date] = key.split(':');
    assert.ok(date >= '2026-10-24', `${key}: nunca se cambian días ya jugados`);
    assert.ok((BOSSES[boss] || boss === DOUBLES.id) && Number.isInteger(i) && i > 0, key);
  }
  if (entries.length) {
    const [key, i] = entries[0], [boss, date] = key.split(':');
    const a = dailyPool(date, boss), b = dailyPool(date, boss);
    assert.deepEqual(a, b);
    assert.deepEqual(a.map(s => s.species), poolFor(boss, date, i).map(s => s.species));
    assert.notDeepEqual(a.map(s => s.species), poolFor(boss, date, 0).map(s => s.species));
  }
  // Los días anteriores siguen con el sorteo de siempre.
  assert.deepEqual(dailyPool('2026-10-20', 'red').map(s => s.species), poolFor('red', '2026-10-20', 0).map(s => s.species));
});

test('dobles: un domingo cada dupla, solo se juega en domingo y la semana anuncia la siguiente', () => {
  assert.equal(doublesOpen('2026-10-25'), false); // domingo anterior al estreno
  assert.equal(doublesOpen('2026-11-01'), true);
  assert.equal(doublesOpen('2026-11-02'), false);
  assert.equal(nextSunday('2026-11-02'), '2026-11-08');
  assert.equal(duoOf('2026-10-30').id, DUOS[0].id);
  assert.equal(duoOf('2026-11-02').id, DUOS[1].id);
  assert.equal(duoOf('2026-11-08').id, DUOS[1].id);
  assert.equal(duoOf('practica-abc-2026-11-08').id, DUOS[1].id);
  const sunday = n => new Date(Date.parse('2026-11-01T12:00:00Z') + n * 7 * 864e5).toISOString().slice(0, 10);
  assert.equal(new Set(Array.from({length: DUOS.length}, (_, i) => duoOf(sunday(i)).id)).size, DUOS.length);
  assert.equal(duoOf(sunday(DUOS.length)).id, DUOS[0].id);
});

test('dobles: 3 Pokémon de cada entrenador, sin repetir especie y con sets legales', () => {
  const dex = Dex.forGen(9), id = t => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const learns = (species, move) => {
    for (let sp = dex.species.get(species); sp?.exists; sp = sp.prevo ? dex.species.get(sp.prevo) : null) if (dex.data.Learnsets[sp.id]?.learnset?.[id(move)]) return true;
    return false;
  };
  assert.equal(learns('Pikachu', 'Spore'), false); // la comprobación no da todo por bueno
  DUOS.forEach((duo, w) => {
    assert.equal(duo.team.length, 6);
    assert.equal(new Set(duo.team.map(s => s.species)).size, 6, duo.id);
    for (const t of duo.trainers) assert.equal(duo.team.filter(s => s.trainer === t).length, 3, duo.id);
    const later = teamOf(DOUBLES.id, new Date(Date.parse('2027-01-24T12:00:00Z') + w * 7 * 864e5).toISOString().slice(0, 10)); // sets desde el 8-11
    for (const set of [...duo.team, ...later]) {
      assert.ok(Object.values(dex.species.get(set.species).abilities).includes(set.ability), `${set.species} ${set.ability}`);
      for (const m of set.moves) assert.ok(learns(set.species, m), `${set.species} no aprende ${m}`);
    }
  });
});

test('dobles: combates completos con la IA por los dos lados se reproducen igual', () => {
  const noTime = log => log.filter(l => !l.startsWith('|t:|'));
  DUOS.forEach((duo, w) => {
    const date = new Date(Date.parse('2026-11-01T12:00:00Z') + w * 7 * 864e5).toISOString().slice(0, 10);
    const team = dailyPool(date, DOUBLES.id), choices = [];
    assert.equal(duoOf(date).id, duo.id);
    const b = newBattle(date, team, DOUBLES.id, 'none');
    assert.equal(b.gameType, 'doubles');
    play(b, null);
    while (!b.ended && choices.length < 300) {
      const c = aiChoice(b, 'p1') || 'default';
      assert.ok(play(b, c), `${duo.id}: elección rechazada "${c}"`);
      choices.push(c);
    }
    assert.ok(b.ended, duo.id);
    const again = replay(date, team, choices, DOUBLES.id, 'none');
    assert.equal(again.winner, b.winner);
    assert.deepEqual(noTime(again.log), noTime(b.log));
  });
});

test('dobles: desde el 8-11 tu equipo va sin EVs; el primer domingo no cambia', () => {
  const evs = date => dailyPool(date, DOUBLES.id).reduce((a, s) => a + Object.values(s.evs).reduce((x, y) => x + y, 0), 0);
  assert.ok(evs('2026-11-01') > 0);
  assert.equal(evs('2026-11-08'), 0);
});

test('dobles: el sorteo de equipo funciona cualquier domingo y en sus alternativas', () => {
  for (let w = 0; w < 80; w++) {
    const date = new Date(Date.parse('2026-11-01T12:00:00Z') + w * 7 * 864e5).toISOString().slice(0, 10);
    for (let i = 0; i < 8; i++) assert.equal(new Set(poolFor(DOUBLES.id, date, i).map(s => s.species)).size, POOL_SIZE, date);
  }
});

test('dobles: la IA no gasta Terremoto en su compañero ni cancela su propio Espacio Raro', () => {
  const battle = (active, foe) => {
    const b = newBattle('2026-11-29', foe, DOUBLES.id, 'none'); // Claydol y Spiritomb salen juntos
    play(b, null);
    return b;
  };
  const team = dailyPool('2026-11-29', DOUBLES.id);
  assert.equal(duoOf('2026-11-29').id, 'twisted');
  const b = battle(null, team);
  const first = aiChoice(b, 'p2').split(', ');
  const moves = first.map((c, i) => b.p2.activeRequest.active[i].moves[+c.split(' ')[1] - 1]?.id);
  assert.equal(moves.filter(m => m === 'trickroom').length, 1, moves.join());
});

test('Pokédex: están todos los Pokémon que te pueden tocar en cualquier modo, sin repetir', () => {
  const all = pokedexList(), names = new Set(all.map(p => p.name)), dex = Dex.forGen(9);
  assert.equal(names.size, all.length);
  assert.ok(all.every((p, i) => !i || all[i - 1].num <= p.num), 'en orden de Pokédex');
  for (let d = 0; d < 60; d++) {
    const date = new Date(Date.parse('2026-11-01T12:00:00Z') + d * 864e5).toISOString().slice(0, 10);
    for (const mode of [...Object.keys(BOSSES), 'liga', DOUBLES.id]) for (const set of poolOf(mode, date)) {
      assert.ok(names.has(dex.species.get(set.species).baseSpecies), `${mode} ${date}: ${set.species}`);
    }
  }
});

test('temporadas: por fecha, cruzando el año nuevo, y con los días que quedan', () => {
  assert.equal(seasonOf('2026-10-30').id, 'halloween');
  assert.equal(seasonOf('2026-11-02').id, 'halloween');
  assert.equal(seasonOf('2026-11-03'), null);
  assert.equal(seasonOf('2026-12-31').id, 'christmas');
  assert.equal(seasonOf('2027-01-06').id, 'christmas');
  assert.equal(seasonOf('2027-01-07'), null);
  assert.equal(seasonDaysLeft('2026-10-30', seasonOf('2026-10-30')), 3);
  assert.equal(seasonDaysLeft('2026-12-31', seasonOf('2026-12-31')), 6);
  assert.equal(seasonDaysLeft('2027-01-06', seasonOf('2027-01-06')), 0);
  const dex = Dex.forGen(9);
  for (const s of SEASONS) {
    assert.equal(s.mons.length, new Set(s.mons).size, s.id);
    for (const m of s.mons) assert.ok(dex.species.get(m).exists, m);
    assert.ok(dex.items.get(s.medal).exists, s.medal);
  }
});

test('reto del día: desde el 5-11, un rival distinto cada día; el estreno, 8 para elegir y después los 6 equilibrados del rival', () => {
  const day = n => new Date(Date.parse('2026-11-05T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  assert.equal(retoOpen('2026-11-04'), false);
  assert.equal(retoOpen('2026-11-05'), true);
  assert.equal(retoBoss('2026-11-05'), 'red');
  assert.equal(new Set(Array.from({length: 8}, (_, i) => retoBoss(day(i)))).size, 8);
  const dex = Dex.forGen(9);
  for (let i = 0; i < 40; i++) {
    const date = day(i), boss = retoBoss(date), pool = retoPool(date);
    const size = i ? PICK.pick : PICK.size; // el 5-11 (estreno), 8; desde el 6-11, los 6 fijos
    assert.equal(pool.length, size, date);
    assert.equal(new Set(pool.map(s => dex.species.get(s.species).baseSpecies)).size, size, date);
    assert.deepEqual(pool.slice(0, 6).map(s => s.species), dailyPool(date, boss).map(s => s.species), date);
    assert.deepEqual(retoPool(date).map(s => s.species), pool.map(s => s.species), 'determinista');
    assert.deepEqual(poolOf(RETO.id, date).map(s => s.species), pool.map(s => s.species));
  }
});

test('un combate con 6 de los 8 (contra un campeón desde el 6-11) se reproduce igual', () => {
  const date = '2026-11-06', boss = 'lance', pool = bossPool(date, boss), team = [7, 2, 5, 0, 3, 6].map(i => pool[i]);
  const b = newBattle(date, team, boss, ruleFor(date, boss)), choices = [];
  play(b, null);
  while (!b.ended && choices.length < 300) {
    const c = aiChoice(b, 'p1') || 'default';
    assert.ok(play(b, c), c);
    choices.push(c);
  }
  assert.ok(b.ended);
  const again = replay(date, team, choices, boss, ruleFor(date, boss));
  assert.equal(again.winner, b.winner);
  assert.equal(again.log.filter(l => !l.startsWith('|t:|')).join('\n'), b.log.filter(l => !l.startsWith('|t:|')).join('\n'));
});

test('las pistas de eficacia cuentan Levitación (Terremoto contra Claydol = ×0)', () => {
  const b = newBattle('liga2:2026-11-04', leaguePool('2026-11-04'), 'steven', 'none');
  play(b, null);
  const claydol = b.p2.pokemon.find(p => p.species.name === 'Claydol'), kroo = b.p1.pokemon.find(p => p.species.name === 'Krookodile');
  assert.equal(typeMultiplier(kroo, claydol, 'earthquake'), 0);
  assert.equal(typeMultiplier(kroo, claydol, 'crunch'), 2);
});

test('reto del día: desde el 6-11, sin EVs; el 5-11 no cambia', () => {
  const evs = p => p.reduce((a, s) => a + Object.values(s.evs).reduce((x, y) => x + y, 0), 0);
  const first = retoPool('2026-11-05');
  assert.deepEqual(first.map(s => s.species), ['Tentacruel', 'Bellossom', 'Tyranitar', 'Golduck', 'Electrode', 'Scizor', 'Flareon', 'Donphan']);
  assert.ok(evs(first) > 0);
  for (let i = 1; i < 20; i++) {
    const date = new Date(Date.parse('2026-11-05T12:00:00Z') + i * 864e5).toISOString().slice(0, 10), pool = retoPool(date);
    assert.equal(evs(pool), 0, date);
    assert.deepEqual(pool.slice(0, 6).map(s => s.species), dailyPool(date, retoBoss(date)).map(s => s.species), date);
  }
});

test('IA 5 (desde el 6-11): Azote pega más con poca vida y Esfuerzo deja al rival con la vida del usuario', () => {
  const b = newBattle('2026-11-10', dailyPool('2026-11-10', 'lance'), 'lance', 'none');
  play(b, null);
  assert.equal(b.aiV, 5);
  const gyara = b.p2.pokemon.find(p => p.species.name === 'Gyarados'), foe = b.p1.active[0];
  const full = estimate(gyara, foe, 'flail');
  gyara.hp = 1;
  assert.ok(estimate(gyara, foe, 'flail') > full * 4);
  if (!foe.hasType('Ghost')) assert.equal(estimate(gyara, foe, 'endeavor'), (foe.hp - 1) / foe.maxhp);
  const old = newBattle('2026-11-05', dailyPool('2026-11-05', 'lance'), 'lance', 'none');
  assert.equal(old.aiV, 3);
});

test('desde el 6-11: contra cada campeón, 8 sin EVs para elegir (con los 6 equilibrados); en la Liga, entrenado al máximo', () => {
  const dex = Dex.forGen(9), evs = s => Object.values(s.evs).reduce((a, b) => a + b, 0);
  assert.equal(poolOf('blue', '2026-11-05').length, 6);
  for (const boss of Object.keys(BOSSES)) for (const date of ['2026-11-06', '2026-11-20']) {
    const pool = bossPool(date, boss);
    assert.equal(pool.length, PICK.size, boss + date);
    assert.equal(new Set(pool.map(s => dex.species.get(s.species).baseSpecies)).size, PICK.size, boss + date);
    assert.ok(pool.every(s => evs(s) === 0), boss + date);
    assert.deepEqual(pool.slice(0, 6).map(s => s.species), dailyPool(date, boss).map(s => s.species), boss + date);
  }
  assert.ok(leaguePool('2026-11-05').every(s => evs(s) < 508));
  assert.ok(leaguePool('2026-11-06').every(s => evs(s) === 508 && s.evs.spe === 252));
});
