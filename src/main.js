// Interfaz: vista previa de equipos, combate animado a partir del log de Showdown, resultado, ajustes.
import {Dex} from '@pkmn/sim';
import {Sprites, Icons} from '@pkmn/img';
import {today, msToNext, dayNumber, dailyPool, BOSSES, play, replay, typeMultiplier} from './game.js';
import {T, LANG, setLang, setBoss, typeName, moveName, itemName, abilityName} from './i18n.js';
import {audio, setMusic, setSfx, playMusic, jingle, sfx, cry, lowHpAlarm} from './audio.js';
import {setupFx, setSpeed, animateMove, floatText, statFx, popup, flash, sparkle, center, throwBall} from './fx.js';

const dex = Dex.forGen(9);
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => Object.assign(document.createElement(tag), cls ? {className: cls} : {}, html != null ? {innerHTML: html} : {});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ls = {get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }};
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Rival (?vs=red|cynthia). Cada uno tiene su ambientación, su equipo y sus estadísticas.
const SD = 'https://play.pokemonshowdown.com/';
const STAGES = {
  red: {sprite: 'red', emoji: '⛰️', bg: SD + 'fx/bg-icecave.png', music: ['hgss-kanto-trainer', 'hgss-johto-trainer', 'bw2-kanto-gym-leader']},
  cynthia: {sprite: 'cynthia', emoji: '👑', bg: SD + 'sprites/gen6bgs/bg-elite4drake.jpg', music: ['dpp-rival', 'dpp-trainer']},
};
const BOSS = BOSSES[new URLSearchParams(location.search).get('vs')] ? new URLSearchParams(location.search).get('vs') : 'red';
const B = BOSSES[BOSS], STAGE = STAGES[BOSS];
const keyOf = boss => `redle:v9:${boss}`;
const KEY = keyOf(BOSS);
const store = Object.assign({stats: {played: 0, wins: 0, streak: 0, best: 0, last: null}, days: {}}, JSON.parse(ls.get(KEY) || '{}'));

// Modo práctica (?practica=semilla&equipo=hoy|semilla): no se guarda ni cuenta para las estadísticas.
// Solo tras jugar el reto: si perdiste, con el mismo equipo del día; si ganaste, también con equipos aleatorios.
const TODAY = today();
const DAY = dayNumber(TODAY);
const YESTERDAY = new Date(Date.parse(TODAY + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const params = new URLSearchParams(location.search);
const dailyResult = store.days[TODAY]?.result;
const PRACTICE = dailyResult ? params.get('practica') : null;
const TEAM = PRACTICE && dailyResult === 'win' ? params.get('equipo') || 'hoy' : 'hoy';
const DATE = PRACTICE ? 'practica-' + PRACTICE : TODAY;
const POOL = dailyPool(TEAM === 'hoy' ? TODAY : 'equipo-' + TEAM, BOSS);
const rand = () => Math.random().toString(36).slice(2, 8);
const goPractice = team => { location.search = `?vs=${BOSS}&practica=${rand()}&equipo=${team}`; };
const goToday = () => { location.search = `?vs=${BOSS}`; };
if (params.has('practica') && !PRACTICE) history.replaceState(null, '', `${location.pathname}?vs=${BOSS}`);
const battleTrack = day => STAGE.music[day % STAGE.music.length];
let speed = +(ls.get('redle:speed') || 1);
setSpeed(speed);

// ---------- almacenamiento ----------
if (PRACTICE) delete store.days[DATE];
const save = () => { if (!PRACTICE) ls.set(KEY, JSON.stringify(store)); };
const todayRec = () => store.days[DATE] ||= {picks: POOL.map((_, i) => i), choices: []};

// ---------- utilidades visuales ----------
const typeBadge = t => `<span class="type t-${t.toLowerCase()}">${typeName(t)}</span>`;
const spriteOf = (species, back) => Sprites.getPokemon(species, {gen: 'ani', side: back ? 'p1' : 'p2'});
const icon = (species, extra = '') => `<span class="icon-mon ${extra}" style="${Icons.getPokemon(species).style}" title="${species}"></span>`;
const itemIcon = name => `<span class="icon-item" style="${Icons.getItem(name).style}"></span>`;
const cryId = species => toID(dex.species.get(species).baseSpecies);

// Textos estáticos del HTML y ambientación del rival.
setBoss(BOSS, B.name, B.team.map(s => s.species).join(', '));
document.documentElement.lang = LANG;
document.body.classList.add('boss-' + BOSS);
document.querySelectorAll('.boss-sprite').forEach(im => { im.src = `${SD}sprites/trainers/${STAGE.sprite}.png`; im.alt = B.name; });
document.querySelectorAll('.boss-name').forEach(e => (e.textContent = B.name));
document.documentElement.style.setProperty('--arena-bg', `url(${STAGE.bg})`);

// Selector de rival con el estado del reto de hoy de cada uno.
$('#bosses').innerHTML = Object.values(BOSSES).map(b => {
  const res = JSON.parse(ls.get(keyOf(b.id)) || '{}').days?.[TODAY]?.result;
  const mark = res === 'win' ? '🏆' : res === 'loss' ? '✗' : '';
  return `<a href="?vs=${b.id}" class="boss-tab ${b.id}${b.id === BOSS ? ' on' : ''}"><img src="${SD}sprites/trainers/${STAGES[b.id].sprite}.png" alt="" width="44" height="44">
    <span><b>${b.name}</b><small>${b.id === BOSS ? T.where : ''}</small></span><i>${mark}</i></a>`;
}).join('');
document.querySelectorAll('[data-i18n]').forEach(e => (e.innerHTML = T[e.dataset.i18n]));
$('#how').innerHTML = T.how.filter(Boolean).map(h => `<li>${h}</li>`).join('');

// ---------- fondo con Pokémon ----------
function backgroundMons() {
  const box = $('#bg-mons');
  const pick = [...POOL.map(s => s.species), ...B.team.map(s => s.species)];
  const cols = innerWidth < 600 ? 3 : 5, rows = 4;
  for (let i = 0; i < cols * rows; i++) {
    const im = el('img');
    im.src = Sprites.getPokemon(pick[i % pick.length], {gen: 'gen5'}).url;
    im.alt = '';
    const x = (i % cols + 0.15 + Math.random() * 0.7) / cols * 100, y = (Math.floor(i / cols) + 0.1 + Math.random() * 0.8) / rows * 100;
    im.style.cssText = `left:${x}%;top:${y}%;--d:${(Math.random() * -8).toFixed(1)}s;--s:${(0.9 + Math.random() * 0.9).toFixed(2)};--f:${Math.random() < 0.5 ? -1 : 1}`;
    box.append(im);
  }
}

// ---------- vista previa de equipos (pantalla de equipo estilo juego) ----------
function slot(set, tag) {
  const sp = dex.species.get(set.species);
  const s = el(tag, 'slot');
  s.innerHTML = `
    <img class="sp" src="${spriteOf(set.species).url}" alt="" loading="lazy">
    <div class="top">${sp.name}<small>${T.level}${set.level}</small></div>
    <div class="types">${sp.types.map(typeBadge).join('')}</div>
    <div class="mini-hp"><i></i></div>
    <div class="sub">${set.item ? itemIcon(set.item) + itemName(set.item) + ' · ' : ''}${abilityName(set.ability)}</div>
    <div class="moves4">${set.moves.map(m => `<span class="t-${dex.moves.get(m).type.toLowerCase()}">${moveName(m)}</span>`).join('')}</div>`;
  return s;
}

function renderDraft() {
  const rec = todayRec();
  $('#draft').hidden = false;
  $('#pool').replaceChildren(...POOL.map((set, i) => {
    const s = slot(set, 'button');
    if (rec.picks[0] === i) { s.classList.add('lead'); s.append(el('span', 'ribbon', T.leadTag)); }
    s.onclick = () => { sfx('click'); rec.picks = [i, ...POOL.map((_, j) => j).filter(j => j !== i)]; renderDraft(); };
    return s;
  }));
  $('#red-team').replaceChildren(...B.team.map(set => slot(set, 'div')));
  $('#stage-rules').innerHTML = T.stageRules;
  const go = $('#btn-go');
  go.querySelector('.txt').textContent = T.go;
  go.onclick = () => { rec.started = true; save(); startBattle(true); };
}

// ---------- combate ----------
let battle, logIdx = 0, busy = false;
const fresh = () => ({name: '', species: '', gender: '', level: 100, hp: 0, maxhp: 1, status: '', boosts: {}});
const view = {p1: fresh(), p2: fresh(), fainted: {p1: new Set(), p2: new Set()}, seen: {}, eff: null, weather: ''};
const team = () => todayRec().picks.map(i => POOL[i]);
const img = side => $(`.mon.${side === 'p1' ? 'me' : 'foe'}`);
const wait = ms => sleep(ms / speed);
const seenOf = species => (view.seen[species] ||= {moves: new Set()});

async function startBattle(isNew) {
  const rec = todayRec();
  $('#draft').hidden = true;
  $('#battle').hidden = false;
  setupFx($('.arena'));
  battle = replay(DATE, team(), rec.choices, BOSS);
  if (rec.result) { await consume(false); return showResult(); }
  playMusic(battleTrack(DAY));
  if (isNew) {
    // Transición de inicio de combate: destellos, franjas y el rival entrando.
    const intro = $('#intro');
    intro.hidden = false;
    sfx('encounter');
    await sleep(2600);
    intro.hidden = true;
  }
  await consume(isNew);
}

async function choose(choice) {
  if (busy) return;
  sfx('click');
  if (!play(battle, choice)) return;
  todayRec().choices.push(choice); // se guarda antes de animar: recargar no da otro intento
  save();
  await consume(true);
}

async function consume(animate) {
  busy = true;
  $('#controls').classList.add('locked');
  $('#prompt').textContent = '';
  const lines = battle.log.slice(logIdx);
  logIdx = battle.log.length;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith('|split|')) { line = lines[i + 1]; i += 2; } // línea privada = PS exactos
    await step(line.split('|').slice(1), animate);
  }
  drawHud('p1'); drawHud('p2');
  drawTeamPanel();
  busy = false;
  $('#controls').classList.remove('locked');
  if (battle.ended) finish(animate);
  else drawControls();
}

// Muestra un mensaje en la caja de texto y espera a que dé tiempo a leerlo.
async function say(text, animate, cls = '') {
  const msg = $('#msg');
  msg.innerHTML = text;
  msg.className = cls;
  msg.style.animation = 'none'; void msg.offsetWidth; msg.style.animation = '';
  const log = $('#log');
  log.append(el('p', cls, text));
  while (log.children.length > 150) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
  if (animate) await wait(1050);
}

const parseId = id => ({side: id.slice(0, 2), name: id.slice(id.indexOf(':') + 2)});
const who = id => { const {side, name} = parseId(id); return side === 'p1' ? `<b>${name}</b>` : `<b>${T.foe(name)}</b>`; };
const fromTag = (tags, kind) => tags.match(new RegExp(`\\[from\\] ${kind}: ([^|]+)`))?.[1];
function parseHp(text) {
  const [cur, st = ''] = text.split(' ');
  const [hp, max] = cur.split('/').map(Number);
  return {hp: st === 'fnt' ? 0 : hp, max, status: st === 'fnt' ? '' : st};
}

// Anima la barra y el número de PS hasta el nuevo valor.
function setHp(side, text, animate) {
  const v = view[side], {hp, max, status} = parseHp(text);
  const before = v.hp;
  if (max) v.maxhp = max;
  v.hp = hp;
  v.status = status;
  const delta = hp - before;
  // Velocidad constante, como en los juegos: vaciar la barra entera tarda 1,6 s.
  const dur = animate ? Math.max(250, 1600 * Math.abs(delta) / v.maxhp) / speed : 0;
  drawHud(side, dur, before);
  return {delta, pct: Math.round(100 * Math.abs(delta) / v.maxhp), dur};
}

// Procesa una línea del protocolo de Showdown.
async function step([cmd, a = '', b = '', c = '', ...rest], animate) {
  const tags = [c, ...rest].join('|');
  const side = a.slice(0, 2), cls = side === 'p1' ? 'me' : side === 'p2' ? 'foe' : '';
  // Cartel del objeto o la habilidad que provoca el efecto.
  const item = fromTag(tags, 'item'), ability = fromTag(tags, 'ability');
  if ((item || ability) && cls) {
    if (side === 'p2' && view.p2.species) Object.assign(seenOf(view.p2.species), item ? {item} : {ability});
    if (animate) popup(cls, item ? `${itemIcon(item)}${itemName(item)}` : `<small>${parseId(a).name}</small>${abilityName(ability)}`);
  }
  switch (cmd) {
    case 'switch': case 'drag': {
      const {name} = parseId(a);
      const [species, ...details] = b.split(', ');
      Object.assign(view[side], fresh(), {name, species, gender: details.find(d => d === 'M' || d === 'F') || '', level: +(details.find(d => /^L\d+$/.test(d)) || 'L100').slice(1)});
      if (side === 'p2') seenOf(species);
      const im = img(side);
      im.classList.remove('faint', 'enter');
      await say(side === 'p1' ? T.go1(`<b>${name}</b>`) : T.redSends(`<b>${name}</b>`), false, cls);
      if (animate) {
        im.style.visibility = 'hidden';
        setHp(side, c, false);
        sfx('switch');
        await throwBall(im, side === 'p2');
        im.style.visibility = '';
        void im.offsetWidth; im.classList.add('enter');
        await cry(cryId(species));
        await wait(700);
      } else setHp(side, c, false);
      return;
    }
    case 'move': {
      const target = c.startsWith('p') ? c.slice(0, 2) : side === 'p1' ? 'p2' : 'p1';
      if (side === 'p2') seenOf(view.p2.species).moves.add(b);
      await say(T.uses(who(a), `<i>${moveName(b)}</i>`), animate, cls);
      if (animate && !tags.includes('[still]') && !tags.includes('[miss]')) {
        sfx('attack', dex.moves.get(b).type);
        await animateMove(b, img(side), img(target));
      }
      return;
    }
    case '-damage': case '-heal': case '-sethp': {
      const {delta, pct, dur} = setHp(side, b, animate);
      if (!delta) return;
      if (animate) {
        const heal = delta > 0;
        floatText(img(side), side === 'p1' ? `${heal ? '+' : '−'}${Math.abs(delta)}` : `${heal ? '+' : '−'}${pct}%`, heal);
        if (heal) { sfx('heal'); sparkle(center(img(side))); }
        else if (!tags.includes('[from]')) {
          sfx(view.eff === 'super' ? 'super' : view.eff === 'weak' ? 'weak' : 'hit');
          const im = img(side); im.classList.remove('hit'); void im.offsetWidth; im.classList.add('hit');
          if (view.eff === 'super') flash('#fff', 140);
        } else sfx('weak');
        await sleep(dur);
      }
      view.eff = null;
      if (item === 'Leftovers') return say(T.leftovers(who(a)), animate, cls);
      if (/\[from\] (brn|psn|tox)/.test(tags)) return say((tags.includes('brn') ? T.burnDmg : T.poisonDmg)(who(a)), animate, cls);
      if (tags.includes('Recoil')) return say(T.recoil(who(a)), animate, cls);
      if (tags.includes('Hail')) return say(T.hailDmg(who(a)), animate, cls);
      if (/Sandstorm|Snow/.test(tags)) return say(T.weatherDmg(who(a)), animate, cls);
      if (tags.includes('drain')) return say(T.drain(who(a)), animate, cls);
      return say((delta > 0 ? T.gained : T.lost_)(who(a), pct), animate, cls);
    }
    // El aviso de eficacia llega antes que el daño: se guarda y se muestra con el golpe.
    case '-supereffective': view.eff = 'super'; return say(T.super, animate, 'eff');
    case '-resisted': view.eff = 'weak'; return say(T.resisted, animate);
    case '-immune': if (animate) sfx('miss'); return say(T.immune(who(a)), animate);
    case '-crit': if (animate) { sfx('crit'); flash('#fff', 200); } return say(T.crit, animate, 'eff');
    case '-miss': if (animate) sfx('miss'); return say(T.miss(who(b || a)), animate);
    case '-fail': return say(T.fail, animate);
    case '-hitcount': return say(T.hitcount(b), animate);
    case 'faint': {
      view.fainted[side].add(parseId(a).name);
      view[side].hp = 0;
      if (animate) { cry(cryId(view[side].species), true); await wait(500); sfx('faint'); }
      img(side).classList.add('faint');
      drawHud(side);
      return say(T.faint(who(a)), animate, cls);
    }
    case '-status':
      view[side].status = b;
      drawHud(side);
      if (animate) { sfx('status'); flash({brn: '#ff7a1a', par: '#ffe03a', frz: '#8ee8ff', slp: '#9aa0c0'}[b] || '#b04fe0', 240); }
      return say((T.st[b] || T.st.psn)(who(a)), animate, cls);
    case '-curestatus':
      view[side].status = '';
      drawHud(side);
      if (animate) sfx('heal');
      return say((T.cure[b] || T.cure._)(who(a)), animate, cls);
    case 'cant': return say((T.cant[b] || T.cant._)(who(a)), animate, cls);
    case '-boost': case '-unboost': {
      const up = cmd === '-boost', n = +c || 0, boosts = view[side].boosts;
      boosts[b] = Math.max(-6, Math.min(6, (boosts[b] || 0) + (up ? n : -n)));
      drawHud(side);
      if (!n) return say(T.nothing, animate);
      if (animate) { sfx(up ? 'boost' : 'drop'); statFx(img(side), up); }
      return say((up ? T.boost : T.unboost)(who(a), T.stat[b] || b, n), animate, cls);
    }
    case '-clearallboost': view.p1.boosts = {}; view.p2.boosts = {}; drawHud('p1'); drawHud('p2'); return say(T.clearBoosts, animate);
    case '-clearboost': view[side].boosts = {}; drawHud(side); return;
    case '-enditem':
      if (side === 'p2') seenOf(view.p2.species).item = b;
      if (animate) { popup(cls, `${itemIcon(b)}${itemName(b)}`); sfx('item'); }
      return say((tags.includes('[eat]') ? T.ate : T.usedItem)(who(a), itemName(b)), animate, cls);
    case '-ability':
      if (side === 'p2') seenOf(view.p2.species).ability = b;
      if (animate) { popup(cls, `<small>${parseId(a).name}</small>${abilityName(b)}`); sfx('item'); await wait(700); }
      return;
    case '-weather': // |-weather|TIPO|[upkeep]: el tipo va en el primer campo
      view.weather = a === 'none' ? '' : a;
      drawWeather();
      if ([b, c].includes('[upkeep]')) return a === 'Hail' ? say(T.hailUpkeep, animate) : null;
      return T.weather[a] ? say(T.weather[a], animate) : null;
    case '-prepare': return say(T.prepare(who(a)), animate, cls);
    case '-singleturn': return /Protect|Detect/.test(b) ? say(T.protect(who(a)), animate, cls) : null;
    case '-sidestart': return say(T.sideStart(moveName(b.replace('move: ', '')), a.startsWith('p1')), animate);
    case '-sideend': return say(T.sideEnd(moveName(b.replace('move: ', ''))), animate);
    case '-transform': return say(T.mimic(who(a)), animate, cls);
    case '-start':
      if (b.includes('Substitute')) return say(T.sub(who(a)), animate, cls);
      if (b.includes('confusion')) return say(T.confused(who(a)), animate, cls);
      if (b.includes('Leech Seed')) return say(T.seeded(who(a)), animate, cls);
      return;
    case '-end': return b.includes('Substitute') ? say(T.subEnd(who(a)), animate, cls) : null;
    case '-activate':
      if (b.includes('confusion')) return say(T.confusedAct(who(a)), animate, cls);
      if (b.includes('Substitute')) return say(T.subHit, animate);
      if (/Protect|Detect/.test(b)) return say(T.protect(who(a)), animate, cls);
      return;
    case 'turn':
      $('.turn').textContent = T.turn(a);
      $('#log').append(el('p', 'turnmark', T.turn(a)));
      return;
    case 'win':
      return say(a === 'Tú' ? T.win : T.lose, animate, 'eff');
  }
}

// La barra baja (o sube) fotograma a fotograma desde el valor anterior, cambiando de color al cruzar
// el 50 % y el 20 %, y el número de PS cuenta a la vez.
const barAnim = {};
function animateBar(side, fromPct, toPct, dur, maxhp) {
  const hud = $(`.hud.${side === 'p1' ? 'me' : 'foe'}`), bar = hud.querySelector('.bar i'), num = hud.querySelector('.hp');
  const paint = pct => {
    bar.style.width = pct + '%';
    bar.className = pct > 50 ? '' : pct > 20 ? 'mid' : 'low';
    num.textContent = side === 'p1' ? `${Math.round(maxhp * pct / 100)}/${maxhp}` : Math.ceil(pct) + '%';
  };
  if (!dur) { if (barAnim[side]?.to !== toPct) { cancelAnimationFrame(barAnim[side]?.id); paint(toPct); } return; }
  cancelAnimationFrame(barAnim[side]?.id);
  const t0 = performance.now(), anim = barAnim[side] = {to: toPct};
  const tick = now => {
    const k = Math.min(1, (now - t0) / dur);
    paint(fromPct + (toPct - fromPct) * k);
    if (k < 1) anim.id = requestAnimationFrame(tick); else barAnim[side] = null;
  };
  anim.id = requestAnimationFrame(tick);
}

// Indicador y partículas del clima (granizo en el Monte Plateado).
function drawWeather() {
  $('.arena').classList.toggle('hail', view.weather === 'Hail');
  $('.weather-badge').hidden = !view.weather;
  $('.weather-badge').textContent = T.weatherBadge[view.weather] || '';
}

function drawHud(side, dur = 0, fromHp) {
  const v = view[side], cls = side === 'p1' ? 'me' : 'foe';
  if (!v.species) return;
  const im = img(side);
  if (im.dataset.species !== v.species) {
    const s = spriteOf(v.species, side === 'p1');
    im.src = s.url;
    im.alt = v.species;
    im.dataset.species = v.species;
    im.style.setProperty('--w', s.w);
  }
  const hud = $(`.hud.${cls}`);
  hud.querySelector('.name').textContent = v.name;
  const g = hud.querySelector('.gender');
  g.textContent = v.gender === 'M' ? '♂' : v.gender === 'F' ? '♀' : '';
  g.className = 'gender ' + v.gender.toLowerCase();
  hud.querySelector('.lvl').textContent = T.level + v.level;
  hud.querySelector('.types').innerHTML = dex.species.get(v.species).types.map(typeBadge).join('');
  const pct = Math.max(0, 100 * v.hp / v.maxhp);
  animateBar(side, fromHp != null ? Math.max(0, 100 * fromHp / v.maxhp) : pct, pct, dur, v.maxhp);
  const boosts = Object.entries(v.boosts).filter(([, n]) => n)
    .map(([s, n]) => `<span class="boost ${n > 0 ? 'up' : 'down'}">${T.statShort[s]} ${n > 0 ? '+' : ''}${n}</span>`).join('');
  hud.querySelector('.status').innerHTML = (v.status ? `<span class="st st-${v.status}">${T.statusTag[v.status]}</span>` : '') + boosts;
  if (side === 'p1') lowHpAlarm(v.hp > 0 && pct <= 20 && !battle?.ended);
  const names = side === 'p1' ? team().map(s => s.species) : B.team.map(s => s.species);
  $(`.balls.${cls}`).innerHTML = names.map(n => `<i class="${view.fainted[side].has(n) ? 'out' : ''}"></i>`).join('');
}

// Pestaña "Tu equipo": objeto actual, habilidad, vida y ataques con PP de cada uno de tus Pokémon.
function drawTeamPanel() {
  $('#team-panel').innerHTML = battle.p1.pokemon.map(p => {
    const pct = Math.round(100 * p.hp / p.maxhp);
    const item = p.item ? `${itemIcon(p.item)}${itemName(p.item)}` : T.noItem;
    return `<div class="tp${p.fainted ? ' out' : ''}${p.isActive ? ' active' : ''}">
      <div class="tp-head">${icon(p.species.name)}<b>${p.name}</b>${p.status ? `<span class="st st-${p.status}">${T.statusTag[p.status]}</span>` : ''}<span class="tp-hp">${p.hp}/${p.maxhp}</span></div>
      <div class="mini-hp"><i class="${pct > 50 ? '' : pct > 20 ? 'mid' : 'low'}" style="width:${pct}%"></i></div>
      <div class="tp-sub">${item} · ${abilityName(p.ability)}</div>
      <div class="moves4">${p.moveSlots.map(m => `<span class="t-${dex.moves.get(m.id).type.toLowerCase()}">${moveName(m.id)}<small>${m.pp}/${m.maxpp}</small></span>`).join('')}</div>
    </div>`;
  }).join('');
}
document.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => {
  sfx('click');
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('#controls').hidden = b.dataset.tab !== 'controls';
  $('#team-panel').hidden = b.dataset.tab !== 'team-panel';
}));

function drawControls() {
  const req = battle.p1.activeRequest;
  const moves = $('#moves'), switches = $('#switches');
  moves.innerHTML = switches.innerHTML = '';
  if (!req || req.wait) return;
  const me = battle.p1.active[0], foe = battle.p2.active[0];
  $('#prompt').textContent = req.forceSwitch ? T.who : T.what(me.name);
  if (!req.forceSwitch) {
    req.active[0].moves.forEach((m, i) => {
      const move = dex.moves.get(m.id);
      const cat = move.category === 'Status' ? T.status : move.category === 'Physical' ? T.physical : T.special;
      const mult = typeMultiplier(me, foe, m.id);
      const hint = mult === null ? '' : mult === 0 ? T.noEffect : mult > 1 ? T.superEff : mult < 1 ? T.notVery : '';
      const info = [cat, move.basePower ? `${T.power} ${move.basePower}` : '', move.accuracy === true ? '' : `${T.acc} ${move.accuracy}`].filter(Boolean).join(' · ');
      const b = el('button', `move t-${move.type.toLowerCase()}`,
        `<b>${m.id === 'recharge' ? T.recharge : moveName(m.id)}</b><span class="line">${typeBadge(move.type)}<span>PP ${m.pp ?? '-'}/${m.maxpp ?? '-'}</span></span><span class="info">${info}</span>${hint ? `<em class="${mult > 1 ? 'good' : 'bad'}">${hint}</em>` : ''}`);
      b.disabled = !!m.disabled || m.pp === 0;
      b.onclick = () => choose(`move ${i + 1}`);
      moves.append(b);
    });
  }
  const trapped = !req.forceSwitch && req.active[0].trapped;
  battle.p1.pokemon.forEach((p, i) => {
    const b = el('button', 'sw' + (p.isActive ? ' active' : '') + (p.fainted ? ' out' : ''),
      `${icon(p.species.name)}<span>${p.name}</span><i style="--hp:${Math.round(100 * p.hp / p.maxhp)}%"></i>`);
    b.disabled = p.fainted || p.isActive || trapped;
    b.title = `${p.name} · ${p.hp}/${p.maxhp} · ${p.moveSlots.map(m => moveName(m.id)).join(', ')}`;
    b.onclick = () => choose(`switch ${i + 1}`);
    switches.append(b);
  });
}

// Ficha del rival: solo lo que se ha visto en combate.
$('#foe-hud').onclick = () => {
  const v = view.p2;
  if (!v.species) return;
  const sp = dex.species.get(v.species), seen = seenOf(v.species);
  $('#foe-body').innerHTML = `
    <div class="foe-card"><img src="${spriteOf(v.species).url}" alt=""><div>
      <b>${v.name}</b> · ${T.level}${v.level}<div class="types">${sp.types.map(typeBadge).join('')}</div>
      <div>${T.hpLeft}: ${Math.ceil(100 * v.hp / v.maxhp)}%</div>
      ${seen.ability ? `<div>${abilityName(seen.ability)}</div>` : ''}${seen.item ? `<div>${itemIcon(seen.item)}${itemName(seen.item)}</div>` : ''}
    </div></div>
    <p><b>${T.revealed}:</b> ${[...seen.moves].map(m => moveName(m)).join(', ') || T.none}</p>
    <div class="icons">${B.team.map(s => icon(s.species, view.fainted.p2.has(s.species) ? 'out' : view.seen[s.species] ? '' : 'unseen')).join('')}</div>`;
  $('#dlg-foe').showModal();
};

// ---------- final y estadísticas ----------
function finish(animate) {
  const rec = todayRec();
  lowHpAlarm(false);
  $('.tabs button[data-tab=controls]').click();
  $('#moves').innerHTML = $('#switches').innerHTML = '';
  $('#prompt').textContent = '';
  if (!rec.result) {
    const won = battle.winner === 'Tú';
    rec.result = won ? 'win' : 'loss';
    rec.turns = battle.turn;
    rec.mine = battle.p1.pokemon.map(p => (p.fainted ? 0 : p.hp / p.maxhp));
    rec.red = battle.p2.pokemon.map(p => (p.fainted ? 0 : 1));
    if (!PRACTICE) {
      const s = store.stats;
      s.played++;
      if (won) { s.wins++; s.streak = s.last === YESTERDAY ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak); s.last = TODAY; }
      else s.streak = 0;
      save();
    }
  }
  if (animate) jingle(rec.result === 'win' ? 'win' : 'lose');
  else playMusic(null);
  $('#prompt').textContent = rec.result === 'win' ? T.won : T.lost;
  const btn = (txt, fn, cls = 'ballbtn') => { const b = el('button', cls, `<span class="ball" aria-hidden="true"></span><span class="txt">${txt}</span>`); b.onclick = fn; return b; };
  $('#moves').append(btn((rec.result === 'win' ? '🏆 ' : '') + T.seeResult, showResult),
    btn('▶ ' + T.replay, watchReplay, 'ballbtn alt'), ...practiceOptions().map(([txt, fn]) => btn(txt, fn, 'ballbtn alt')));
  if (animate) setTimeout(showResult, 2500);
}

// Qué práctica se ofrece al acabar: el mismo equipo siempre; uno aleatorio solo si ya ganaste el reto de hoy.
function practiceOptions() {
  const won = (PRACTICE ? dailyResult : store.days[TODAY]?.result) === 'win';
  const opts = [[T.retrySame, () => goPractice(TEAM)]];
  if (won) opts.push([PRACTICE ? T.newRandom : T.practiceRandom, () => goPractice(rand())]);
  return opts;
}

// Vuelve a reproducir el combate entero con animaciones (es determinista).
async function watchReplay() {
  if (busy) return;
  $('#dlg-stats').close();
  logIdx = 0;
  Object.assign(view, {p1: fresh(), p2: fresh(), fainted: {p1: new Set(), p2: new Set()}, seen: {}, eff: null, weather: ''});
  drawWeather();
  for (const side of ['p1', 'p2']) { const im = img(side); im.classList.remove('faint', 'enter'); im.removeAttribute('src'); delete im.dataset.species; }
  $('#log').innerHTML = '';
  $('#moves').innerHTML = $('#switches').innerHTML = '';
  battle = replay(DATE, team(), todayRec().choices, BOSS);
  playMusic(battleTrack(DAY));
  window.scrollTo({top: 0, behavior: 'smooth'});
  await consume(true);
}

// Resumen del combate a partir del log: daño hecho, K.O. y daño recibido por cada uno de tus Pokémon.
function summary() {
  const stats = new Map(team().map(s => [s.species, {species: s.species, dmg: 0, kos: 0, taken: 0}]));
  const hp = {}, active = {};
  let attacker = null;
  const lines = battle.log;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith('|split|')) { line = lines[i + 1]; i += 2; }
    const [, cmd, a = '', b = '', c = ''] = line.split('|');
    const side = a.slice(0, 2);
    if (cmd === 'switch' || cmd === 'drag') { active[side] = dex.species.get(b.split(', ')[0]).name; const [h, m] = c.split(' ')[0].split('/').map(Number); hp[side] = [h, m]; }
    else if (cmd === 'move') attacker = side;
    else if (cmd === '-damage' || cmd === '-heal') {
      const [h, m] = b.split(' ')[0].split('/').map(Number), [prev, max] = hp[side] || [h, m];
      const lost = Math.max(0, prev - h) / (m || max) * 100;
      hp[side] = [b.includes('fnt') ? 0 : h, m || max];
      if (cmd !== '-damage' || c.includes('[from]')) continue;
      const mine = stats.get(active.p1);
      if (!mine) continue;
      if (side === 'p2' && attacker === 'p1') mine.dmg += lost;
      if (side === 'p1') mine.taken += lost;
    } else if (cmd === 'faint' && side === 'p2' && attacker === 'p1' && stats.get(active.p1)) stats.get(active.p1).kos++;
  }
  return [...stats.values()];
}

function shareText(rec) {
  const mine = rec.mine.map(f => (f === 0 ? '🟥' : f < 0.5 ? '🟨' : '🟩')).join('');
  const red = rec.red.map(a => (a ? '🔴' : '⚫')).join('');
  return `Redle #${DAY} ${STAGE.emoji} vs ${B.name}\n${(rec.result === 'win' ? T.shareWin : T.shareLoss)(rec.turns)}\n${T.you}: ${mine}\n${T.red}: ${red}\n${location.origin}${location.pathname}?vs=${BOSS}`;
}

function showResult() {
  const rec = store.days[DATE], done = rec?.result;
  $('#result-title').textContent = !done ? T.stats : rec.result === 'win' ? T.won : T.lost;
  $('#result-body').innerHTML = done
    ? `<img class="result-red ${rec.result}" src="${SD}sprites/trainers/${STAGE.sprite}.png" alt="${B.name}" width="96" height="96"><p>${rec.result === 'win' ? T.wonSub : T.lostSub}</p>`
    : '';
  const s = store.stats, streak = s.last === TODAY || s.last === YESTERDAY ? s.streak : 0;
  $('#stats').innerHTML = [[s.played, T.played], [s.played ? Math.round(100 * s.wins / s.played) + '%' : '—', T.winPct], [streak, T.streak], [s.best, T.best]]
    .map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
  $('#share-box').hidden = !done || PRACTICE;
  if (done) $('#share-text').textContent = shareText(rec);
  $('#summary').innerHTML = '';
  if (done && battle?.ended) {
    const rows = summary(), mvp = rows.reduce((m, r) => (r.kos * 1000 + r.dmg > m.kos * 1000 + m.dmg ? r : m), rows[0]);
    $('#summary').innerHTML = `<h3>${T.summary}</h3><table><tr><th></th><th>${T.kos}</th><th>${T.dmg}</th><th>${T.taken}</th></tr>${rows.map(r =>
      `<tr class="${r === mvp ? 'mvp' : ''}"><td>${icon(r.species)}${r.species}${r === mvp ? ' <b>MVP</b>' : ''}</td><td>${r.kos}</td><td>${Math.round(r.dmg)}%</td><td>${Math.round(r.taken)}%</td></tr>`).join('')}</table>`;
  }
  $('#result-actions').innerHTML = '';
  if (done) {
    const add = (txt, fn) => { const b = el('button', 'secondary', txt); b.onclick = fn; $('#result-actions').append(b); };
    if (battle?.ended) add('▶ ' + T.replay, watchReplay);
    for (const [txt, fn] of practiceOptions()) add(txt, fn);
    if (PRACTICE) add(T.backToday, goToday);
  }
  tickCountdown();
  if (!$('#dlg-stats').open) $('#dlg-stats').showModal();
}

$('#btn-share').onclick = async () => {
  const text = shareText(store.days[DATE]);
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({text});
    else { await navigator.clipboard.writeText(text); $('#btn-share').textContent = T.copied; }
  } catch {}
};

function tickCountdown() {
  const t = msToNext(), p = n => String(n).padStart(2, '0');
  $('#next').textContent = T.next(Math.floor(t / 36e5), p(Math.floor(t / 6e4) % 60), p(Math.floor(t / 1e3) % 60));
}
setInterval(() => $('#dlg-stats').open && tickCountdown(), 1000);

// ---------- ajustes ----------
const current = {lang: () => LANG, theme: () => ls.get('redle:theme') || 'auto', music: () => (audio.music ? '1' : '0'), sfx: () => (audio.sfx ? '1' : '0'), speed: () => String(speed)};
const apply = {
  lang: v => v !== LANG && setLang(v),
  theme: v => { ls.set('redle:theme', v); if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v; },
  music: v => setMusic(v === '1'),
  sfx: v => setSfx(v === '1'),
  speed: v => { speed = +v; setSpeed(speed); ls.set('redle:speed', v); },
};
function drawSettings() {
  document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === current[seg.dataset.set]())));
  $('#btn-mute').textContent = audio.music || audio.sfx ? '♪' : '🔇';
}
document.querySelectorAll('.seg button').forEach(b => (b.onclick = () => { apply[b.parentElement.dataset.set](b.dataset.v); sfx('click'); drawSettings(); }));
$('#btn-mute').onclick = () => {
  const on = !(audio.music || audio.sfx);
  setMusic(on); setSfx(on); drawSettings();
};

// ---------- arranque ----------
$('#day-num').textContent = PRACTICE ? T.practiceBadge : '#' + DAY;
if (PRACTICE) document.body.classList.add('practice');
document.querySelectorAll('[data-close]').forEach(b => (b.onclick = () => b.closest('dialog').close()));
$('#btn-help').onclick = () => $('#dlg-help').showModal();
$('#btn-legal').onclick = () => $('#dlg-legal').showModal();
// Borrar todo lo que Redle guarda en este navegador (progreso, estadísticas y ajustes).
$('#btn-wipe').onclick = () => {
  if (!confirm(T.wipeConfirm)) return;
  try { Object.keys(localStorage).filter(k => k.startsWith('redle:')).forEach(k => localStorage.removeItem(k)); } catch {}
  location.href = location.pathname;
};
$('#btn-stats').onclick = showResult;
$('#btn-settings').onclick = () => { drawSettings(); $('#dlg-settings').showModal(); };
drawSettings();
backgroundMons();
// Etiquetas accesibles de los botones de iconos y fin de la pantalla de carga.
for (const [id, key] of [['btn-help', 'aHelp'], ['btn-settings', 'settings'], ['btn-mute', 'aSound'], ['btn-stats', 'stats']]) $('#' + id).setAttribute('aria-label', T[key]);
$('#loading').remove();

if (!Object.keys(store.days).length && !PRACTICE) $('#dlg-help').showModal();
if (store.days[DATE]?.started) startBattle(false);
else renderDraft();
