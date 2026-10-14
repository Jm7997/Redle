import test from 'node:test';
import assert from 'node:assert/strict';
import {Dex} from '@pkmn/sim';
import {dailyPool, replay, newBattle, play, aiChoice, dayNumber, today, msToNext, POOL_SIZE, BOSSES, leagueLineup, leaguePool, ruleFor, LEAGUE, bossPlan, teamOf} from '../src/game.js';

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
