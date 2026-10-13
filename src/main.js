// Interfaz: rivales diarios, Liga, vista previa de equipos, combate animado a partir del log de Showdown,
// resultado, repeticiones compartibles y ajustes.
import {Dex} from '@pkmn/sim';
import {Sprites, Icons} from '@pkmn/img';
import {today, msToNext, dayNumber, dailyPool, leaguePool, leagueLineup, ruleFor, BOSSES, LEAGUE, play, replay, typeMultiplier} from './game.js';
import {T, LANG, setLang, setBoss, ruleHtml, typeName, moveName, itemName, abilityName} from './i18n.js';
import {audio, setMusic, setSfx, playMusic, jingle, sfx, cry, lowHpAlarm} from './audio.js';
import {sendResult, dailyStats} from './stats.js';
import {setupFx, setSpeed, animateMove, floatText, statFx, popup, flash, sparkle, center, throwBall} from './fx.js';

const dex = Dex.forGen(9);
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => Object.assign(document.createElement(tag), cls ? {className: cls} : {}, html != null ? {innerHTML: html} : {});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ls = {get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }};
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------- ambientación de cada rival ----------
// colors: cabecera, cabecera oscura, y degradado/borde de las fichas de su equipo.
const SD = 'https://play.pokemonshowdown.com/', G6 = SD + 'sprites/gen6bgs/';
const STAGES = {
  blue: {sprite: 'blue', emoji: '🌿', bg: G6 + 'bg-city.jpg', music: ['hgss-kanto-trainer', 'bw2-kanto-gym-leader'], colors: ['#2f7de1', '#163f80', '#7fb4f0', '#2a64b8', '#123a73']},
  red: {sprite: 'red', emoji: '⛰️', bg: SD + 'fx/bg-icecave.png', music: ['hgss-kanto-trainer', 'hgss-johto-trainer', 'bw2-kanto-gym-leader']},
  lance: {sprite: 'lance', emoji: '🐉', bg: G6 + 'bg-skypillar.jpg', music: ['hgss-johto-trainer', 'hgss-kanto-trainer'], colors: ['#c43a22', '#6e1a0e', '#f09a7f', '#b23a24', '#5e140c']},
  steven: {sprite: 'steven', emoji: '💎', bg: G6 + 'bg-earthycave.jpg', music: ['oras-rival', 'oras-trainer'], colors: ['#5d6f8f', '#2b3550', '#a9b8d4', '#56688c', '#27324a']},
  wallace: {sprite: 'wallace', emoji: '🌊', bg: G6 + 'bg-leaderwallace.jpg', music: ['oras-rival', 'oras-trainer'], colors: ['#1d9fcb', '#0b5a78', '#86dcf2', '#1c88b2', '#0a4a63']},
  cynthia: {sprite: 'cynthia', emoji: '👑', bg: G6 + 'bg-elite4drake.jpg', music: ['dpp-rival', 'dpp-trainer']},
  iris: {sprite: 'iris', emoji: '🐲', bg: G6 + 'bg-forest.jpg', music: ['bw2-rival', 'bw-rival'], colors: ['#9046cf', '#4d1d7c', '#d4a8f3', '#8140b6', '#43186b']},
  leon: {sprite: 'leon', emoji: '🔥', bg: G6 + 'bg-darkcity.jpg', music: ['sm-rival', 'xy-rival'], colors: ['#b5142f', '#560715', '#f2c54a', '#a8122b', '#4a0612']},
};
const keyOf = mode => `redle:v10:${mode}`;
const TODAY = today();
const DAY = dayNumber(TODAY);
const YESTERDAY = new Date(Date.parse(TODAY + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const params = new URLSearchParams(location.search);

// ---------- repeticiones compartibles ----------
// El combate es determinista: basta con el modo, la fecha, la ronda, el orden del equipo y las elecciones.
// Se codifican en el #hash del enlace. Todo lo que llega por el enlace se valida antes de usarlo.
const packChoices = cs => cs.map(c => c === 'default' ? 'd' : c[0] + c.split(' ')[1]).join('.');
function encodeReplay(data) {
  const json = JSON.stringify({...data, c: packChoices(data.c)});
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function parseReplay(hash) {
  const m = hash.match(/^#r=([\w-]{1,20000})$/);
  if (!m) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
    const mode = String(raw.m), date = String(raw.d), round = raw.r | 0, picks = raw.p, tokens = String(raw.c).split('.');
    if (mode !== 'liga' && !BOSSES[mode]) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > TODAY) return null; // nunca combates de días futuros
    if (round < 0 || round >= LEAGUE.rounds || (mode !== 'liga' && round)) return null;
    if (!Array.isArray(picks) || [...picks].sort().join() !== '0,1,2,3,4,5') return null;
    if (tokens.length > 1000 || !tokens.every(t => /^(m[1-4]|s[1-6]|d)$/.test(t))) return null;
    const choices = tokens.map(t => t === 'd' ? 'default' : (t[0] === 'm' ? 'move ' : 'switch ') + t[1]);
    return {mode, date, round, picks: picks.map(Number), choices};
  } catch { return null; }
}
const REPLAY = parseReplay(location.hash);

// ---------- modo, almacenamiento y práctica ----------
const MODE = REPLAY ? REPLAY.mode : params.get('vs') === 'liga' ? 'liga' : BOSSES[params.get('vs')] ? params.get('vs') : 'red';
const LIGA = MODE === 'liga';
const KEY = keyOf(MODE);
const store = Object.assign({stats: {played: 0, wins: 0, streak: 0, best: 0, bestRound: 0, last: null}, days: {}}, JSON.parse(ls.get(KEY) || '{}'));

// Modo práctica (?practica=semilla&equipo=hoy|semilla): no se guarda ni cuenta para las estadísticas.
// Solo tras jugar el reto: si perdiste, con el mismo equipo del día; si ganaste, también con equipos aleatorios.
const dailyResult = store.days[TODAY]?.result;
const PRACTICE = !REPLAY && dailyResult ? params.get('practica') : null;
const TEAM = PRACTICE && dailyResult === 'win' ? params.get('equipo') || 'hoy' : 'hoy';
const POOL_DATE = REPLAY ? REPLAY.date : TEAM === 'hoy' ? TODAY : 'equipo-' + TEAM;
const RULE_DATE = REPLAY ? REPLAY.date : TODAY; // la práctica conserva la regla del día
const DATE = REPLAY ? REPLAY.date : PRACTICE ? 'practica-' + PRACTICE : TODAY;
const POOL = LIGA ? leaguePool(POOL_DATE) : dailyPool(POOL_DATE, MODE);
const LINEUP = LIGA ? leagueLineup(REPLAY ? REPLAY.date : TODAY) : [MODE];
const rand = () => Math.random().toString(36).slice(2, 8);
const goPractice = team => { location.search = `?vs=${MODE}&practica=${rand()}&equipo=${team}`; };
const goToday = () => { location.href = `${location.pathname}?vs=${MODE}`; };
if (params.has('practica') && !PRACTICE && !REPLAY) history.replaceState(null, '', `${location.pathname}?vs=${MODE}`);
let speed = +(ls.get('redle:speed') || 1);
setSpeed(speed);

if (PRACTICE || REPLAY) delete store.days[DATE];
const save = () => { if (!PRACTICE && !REPLAY) ls.set(KEY, JSON.stringify(store)); };
const defaultPicks = () => POOL.map((_, i) => i);
// El día guarda una partida (rival) o varias rondas (Liga); `rec()` es siempre el combate en curso.
const day = () => store.days[DATE] ||= LIGA ? {round: 0, rounds: []} : {picks: defaultPicks(), choices: []};
const round = () => LIGA ? day().round : 0;
const rec = () => LIGA ? (day().rounds[day().round] ||= {picks: defaultPicks(), choices: []}) : day();
if (REPLAY) Object.assign(LIGA ? (day().round = REPLAY.round, rec()) : day(), {picks: REPLAY.picks, choices: [], started: true});
const battleKey = () => LIGA ? `liga${round()}:${DATE}` : DATE;

// ---------- rival actual ----------
let OPP, B, STAGE, RULE;
function setOpponent(id) {
  OPP = id; B = BOSSES[id]; STAGE = STAGES[id]; RULE = ruleFor(RULE_DATE, id);
  setBoss(id, B.name, B.team.map(s => s.species).join(', '), LIGA ? LEAGUE.gens : B.gens);
  const body = document.body;
  body.className = body.className.replace(/\bboss-\w+/g, '').trim();
  body.classList.add('boss-' + id);
  body.classList.toggle('stage-g6', STAGE.bg.includes('gen6bgs'));
  for (const [i, v] of ['--dex', '--dex-dark', '--slot-a', '--slot-b', '--slot-edge'].entries()) {
    if (STAGE.colors) body.style.setProperty(v, STAGE.colors[i]); else body.style.removeProperty(v);
  }
  document.querySelectorAll('.boss-sprite').forEach(im => { im.src = `${SD}sprites/trainers/${STAGE.sprite}.png`; im.alt = B.name; });
  document.querySelectorAll('.boss-name').forEach(e => (e.textContent = B.name));
  document.documentElement.style.setProperty('--arena-bg', `url(${STAGE.bg})`);
  document.querySelectorAll('[data-i18n]').forEach(e => (e.innerHTML = T[e.dataset.i18n]));
  $('#how').innerHTML = T.how.filter(Boolean).map(h => `<li>${h}</li>`).join('');
}
setOpponent(LINEUP[round()]);
document.documentElement.lang = LANG;
if (LIGA) document.body.classList.add('mode-liga');

// Selector de modo: los 8 rivales y la Liga, con el estado del reto de hoy de cada uno.
const markOf = id => {
  const d = JSON.parse(ls.get(keyOf(id)) || '{}').days?.[TODAY];
  return id === 'liga' && d?.result ? (d.result === 'win' ? '🏆' : `${d.reached}/5`) : d?.result === 'win' ? '🏆' : d?.result === 'loss' ? '✗' : '';
};
$('#bosses').innerHTML = [...Object.values(BOSSES).map(b => ({id: b.id, name: b.name, img: `${SD}sprites/trainers/${STAGES[b.id].sprite}.png`})),
  {id: 'liga', name: T.league, img: ''}].map(b =>
  `<a href="?vs=${b.id}" class="boss-tab ${b.id}${b.id === MODE ? ' on' : ''}">${b.img ? `<img src="${b.img}" alt="" width="40" height="40">` : '<span class="liga-icon">🏟️</span>'}
    <span><b>${b.name}</b><small>${b.id === MODE ? (LIGA ? T.leagueWhere : T.where) : ''}</small></span><i>${markOf(b.id)}</i></a>`).join('');
{ // centrar la pestaña activa sin mover la página
  const nav = $('#bosses'), on = $('.boss-tab.on');
  if (on) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.clientWidth) / 2;
}

// ---------- utilidades visuales ----------
const typeBadge = t => `<span class="type t-${t.toLowerCase()}">${typeName(t)}</span>`;
const spriteOf = (species, back) => Sprites.getPokemon(species, {gen: 'ani', side: back ? 'p1' : 'p2'});
const icon = (species, extra = '') => `<span class="icon-mon ${extra}" style="${Icons.getPokemon(species).style}" title="${species}"></span>`;
const itemIcon = name => `<span class="icon-item" style="${Icons.getItem(name).style}"></span>`;
const cryId = species => toID(dex.species.get(species).baseSpecies);
const trainerImg = id => `${SD}sprites/trainers/${STAGES[id].sprite}.png`;

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

// Fila de los 5 rivales de la Liga: vencidos, el actual y los que faltan.
function drawLineup() {
  const box = $('#lineup');
  box.hidden = !LIGA;
  if (!LIGA) return;
  const d = day();
  box.innerHTML = LINEUP.map((id, i) => {
    const r = d.rounds[i]?.result, cls = r === 'win' ? 'beaten' : r === 'loss' ? 'lost' : i === d.round ? 'current' : '';
    return `<figure class="${cls}"><img src="${trainerImg(id)}" alt="" width="56" height="56"><figcaption><b>${BOSSES[id].name}</b><small>${i === 4 ? T.champion : T.eliteN(i + 1)}</small></figcaption></figure>`;
  }).join('');
}

function renderDraft() {
  const r = rec();
  $('#draft').hidden = false;
  $('#battle').hidden = true;
  drawLineup();
  $('.intro-text').innerHTML = LIGA ? T.leagueLead(round() + 1, B.name) : T.lead;
  $('#pool').replaceChildren(...POOL.map((set, i) => {
    const s = slot(set, 'button');
    if (r.picks[0] === i) { s.classList.add('lead'); s.append(el('span', 'ribbon', T.leadTag)); }
    s.onclick = () => { sfx('click'); r.picks = [i, ...POOL.map((_, j) => j).filter(j => j !== i)]; renderDraft(); };
    return s;
  }));
  $('#red-team').replaceChildren(...B.team.map(set => slot(set, 'div')));
  $('#stage-rules').innerHTML = [ruleHtml(RULE), T.stageRules].filter(Boolean).join('<br>');
  const go = $('#btn-go');
  go.querySelector('.txt').textContent = T.go;
  go.onclick = () => { r.started = true; save(); startBattle(true); };
}

// ---------- combate ----------
let battle, logIdx = 0, busy = false;
const fresh = () => ({name: '', species: '', gender: '', level: 100, hp: 0, maxhp: 1, status: '', boosts: {}});
const freshView = () => ({p1: fresh(), p2: fresh(), fainted: {p1: new Set(), p2: new Set()}, seen: {}, eff: null, weather: '', field: []});
const view = freshView();
const team = () => rec().picks.map(i => POOL[i]);
const img = side => $(`.mon.${side === 'p1' ? 'me' : 'foe'}`);
const wait = ms => sleep(ms / speed);
const seenOf = species => (view.seen[species] ||= {moves: new Set()});
const battleTrack = () => STAGE.music[(DAY + round()) % STAGE.music.length];

// Deja el escenario como nuevo (siguiente ronda de la Liga o repetición).
function resetView() {
  logIdx = 0;
  Object.assign(view, freshView());
  drawWeather();
  for (const side of ['p1', 'p2']) { const im = img(side); im.classList.remove('faint', 'enter'); im.removeAttribute('src'); delete im.dataset.species; }
  $('#log').innerHTML = $('#msg').innerHTML = '';
  $('#moves').innerHTML = $('#switches').innerHTML = $('#prompt').textContent = '';
}

async function startBattle(isNew) {
  const r = rec();
  $('#draft').hidden = true;
  $('#battle').hidden = false;
  setupFx($('.arena'));
  battle = replay(battleKey(), team(), REPLAY ? REPLAY.choices : r.choices, OPP, RULE);
  $('#replay-banner').hidden = !REPLAY;
  if (REPLAY) $('#replay-banner').innerHTML = T.replayBanner(B.name, REPLAY.date);
  if (r.result && !REPLAY) { await consume(false); if (day().result) showResult(); return; } // en la Liga puede quedar el siguiente rival
  playMusic(battleTrack());
  if (isNew || REPLAY) {
    // Transición de inicio de combate: destellos, franjas y el rival entrando.
    $('#intro p').textContent = LIGA ? T.leagueChallenge(round() + 1, B.name) : T.challenge;
    const intro = $('#intro');
    intro.hidden = false;
    sfx('encounter');
    await sleep(2600);
    intro.hidden = true;
  }
  await consume(isNew || !!REPLAY);
}

async function choose(choice) {
  if (busy || REPLAY) return;
  sfx('click');
  if (!play(battle, choice)) return;
  rec().choices.push(choice); // se guarda antes de animar: recargar no da otro intento
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
  else if (REPLAY) replayEnd();
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
    case '-fieldstart': case '-fieldend': { // Espacio Raro, Gravedad, combate inverso
      const id = a.replace('move: ', '');
      view.field = cmd === '-fieldstart' ? [...view.field, id] : view.field.filter(f => f !== id);
      drawWeather();
      return cmd === '-fieldstart' && T.fieldStart[id] ? say(T.fieldStart[id], animate, 'eff') : null;
    }
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

// Indicador y partículas del clima y de los efectos de campo (Espacio Raro, combate inverso…).
function drawWeather() {
  $('.arena').classList.toggle('hail', view.weather === 'Hail' || view.weather === 'Snowscape');
  const badges = [T.weatherBadge[view.weather], ...view.field.map(f => T.fieldBadge[f])].filter(Boolean);
  $('.weather-badge').hidden = !badges.length;
  $('.weather-badge').textContent = badges.join(' · ');
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
    const it = p.item ? `${itemIcon(p.item)}${itemName(p.item)}` : T.noItem;
    return `<div class="tp${p.fainted ? ' out' : ''}${p.isActive ? ' active' : ''}">
      <div class="tp-head">${icon(p.species.name)}<b>${p.name}</b>${p.status ? `<span class="st st-${p.status}">${T.statusTag[p.status]}</span>` : ''}<span class="tp-hp">${p.hp}/${p.maxhp}</span></div>
      <div class="mini-hp"><i class="${pct > 50 ? '' : pct > 20 ? 'mid' : 'low'}" style="width:${pct}%"></i></div>
      <div class="tp-sub">${it} · ${abilityName(p.ability)}</div>
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

// ---------- final, Liga y estadísticas ----------
const ballBtn = (txt, fn, cls = 'ballbtn') => { const b = el('button', cls, `<span class="ball" aria-hidden="true"></span><span class="txt">${txt}</span>`); b.onclick = fn; return b; };

// Al acabar el día (rival o Liga completa) se apuntan las estadísticas una sola vez.
function closeDay(won, reached) {
  const d = day();
  if (d.result) return;
  d.result = won ? 'win' : 'loss';
  if (LIGA) d.reached = reached;
  if (PRACTICE || REPLAY) return;
  const s = store.stats;
  s.played++;
  if (won) { s.wins++; s.streak = s.last === YESTERDAY ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak); s.last = TODAY; }
  else s.streak = 0;
  if (LIGA) s.bestRound = Math.max(s.bestRound || 0, reached);
  save();
  sendResult({day: TODAY, mode: MODE, won, turns: LIGA ? null : rec().turns, reached: LIGA ? reached : null});
}

function finish(animate) {
  const r = rec();
  lowHpAlarm(false);
  $('.tabs button[data-tab=controls]').click();
  $('#moves').innerHTML = $('#switches').innerHTML = '';
  if (REPLAY) return replayEnd();
  const won = battle.winner === 'Tú';
  if (!r.result) {
    r.result = won ? 'win' : 'loss';
    r.turns = battle.turn;
    r.mine = battle.p1.pokemon.map(p => (p.fainted ? 0 : p.hp / p.maxhp));
    r.red = battle.p2.pokemon.map(p => (p.fainted ? 0 : 1));
    save();
  }
  // Liga: si gana y quedan rivales, a por el siguiente (el equipo se cura entre combates).
  if (LIGA && r.result === 'win' && round() < LEAGUE.rounds - 1) {
    if (animate) jingle('win');
    $('#prompt').textContent = T.won;
    const next = LINEUP[round() + 1];
    $('#moves').append(ballBtn(T.nextRival(BOSSES[next].name), () => {
      day().round++;
      save();
      resetView();
      setOpponent(next);
      renderDraft();
      window.scrollTo({top: 0, behavior: 'smooth'});
    }));
    return;
  }
  closeDay(r.result === 'win', LIGA ? (r.result === 'win' ? LEAGUE.rounds : round()) : 0);
  if (animate) jingle(r.result === 'win' ? 'win' : 'lose');
  else playMusic(null);
  $('#prompt').textContent = LIGA ? (day().result === 'win' ? T.leagueWon : T.leagueLost(round() + 1)) : r.result === 'win' ? T.won : T.lost;
  $('#moves').append(ballBtn((day().result === 'win' ? '🏆 ' : '') + T.seeResult, showResult),
    ballBtn('▶ ' + T.replay, watchReplay, 'ballbtn alt'), ...practiceOptions().map(([txt, fn]) => ballBtn(txt, fn, 'ballbtn alt')));
  if (animate) setTimeout(showResult, 2500);
}

// Qué práctica se ofrece al acabar: el mismo equipo siempre; uno aleatorio solo si ya ganaste el reto de hoy.
function practiceOptions() {
  if (REPLAY) return [];
  const won = (PRACTICE ? dailyResult : store.days[TODAY]?.result) === 'win';
  const opts = [[T.retrySame, () => goPractice(TEAM)]];
  if (won) opts.push([PRACTICE ? T.newRandom : T.practiceRandom, () => goPractice(rand())]);
  return opts;
}

// Vuelve a reproducir el último combate entero con animaciones (es determinista).
async function watchReplay() {
  if (busy) return;
  $('#dlg-stats').close();
  resetView();
  battle = replay(battleKey(), team(), rec().choices, OPP, RULE);
  playMusic(battleTrack());
  window.scrollTo({top: 0, behavior: 'smooth'});
  await consume(true);
}

// Fin de una repetición compartida: invitar a jugar el reto de hoy.
function replayEnd() {
  $('#prompt').textContent = '';
  $('#moves').replaceChildren(ballBtn(T.playToday, goToday));
}

// Enlace que reproduce este combate en cualquier navegador.
function replayLink() {
  const r = rec();
  const hash = encodeReplay({m: MODE, d: DATE, r: round(), p: r.picks, c: r.choices});
  return `${location.origin}${location.pathname}?vs=${MODE}#r=${hash}`;
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

function shareText() {
  const d = day(), url = `${location.origin}${location.pathname}?vs=${MODE}`;
  if (LIGA) {
    const marks = LINEUP.map((_, i) => d.rounds[i]?.result === 'win' ? '✅' : d.rounds[i]?.result === 'loss' ? '❌' : '⬜').join('');
    return `Redle ${T.league} #${DAY} 🏟️\n${T.leagueShare(d.reached)}\n${marks}\n${LINEUP.map(id => BOSSES[id].name).join(' · ')}\n${url}`;
  }
  const mine = d.mine.map(f => (f === 0 ? '🟥' : f < 0.5 ? '🟨' : '🟩')).join('');
  const red = d.red.map(a => (a ? '🔴' : '⚫')).join('');
  return `Redle #${DAY} ${STAGE.emoji} vs ${B.name}\n${(d.result === 'win' ? T.shareWin : T.shareLoss)(d.turns)}\n${T.you}: ${mine}\n${T.red}: ${red}\n${url}`;
}

function showResult() {
  const d = store.days[DATE], done = d?.result;
  $('#result-title').textContent = !done ? T.stats : LIGA ? (done === 'win' ? T.leagueWon : T.leagueLost(d.reached + 1)) : done === 'win' ? T.won : T.lost;
  $('#result-body').innerHTML = !done ? '' : LIGA
    ? `<div class="lineup small-lineup">${LINEUP.map((id, i) => `<figure class="${d.rounds[i]?.result === 'win' ? 'beaten' : d.rounds[i]?.result === 'loss' ? 'lost' : ''}"><img src="${trainerImg(id)}" alt="" width="48" height="48"><figcaption><b>${BOSSES[id].name}</b></figcaption></figure>`).join('')}</div><p>${done === 'win' ? T.leagueWonSub : T.leagueLostSub}</p>`
    : `<img class="result-red ${done}" src="${trainerImg(OPP)}" alt="${B.name}" width="96" height="96"><p>${done === 'win' ? T.wonSub : T.lostSub}</p>`;
  const s = store.stats, streak = s.last === TODAY || s.last === YESTERDAY ? s.streak : 0;
  const cells = LIGA
    ? [[s.played, T.played], [s.wins, T.champions], [`${s.bestRound || 0}/5`, T.bestRound], [streak, T.streak]]
    : [[s.played, T.played], [s.played ? Math.round(100 * s.wins / s.played) + '%' : '—', T.winPct], [streak, T.streak], [s.best, T.best]];
  $('#stats').innerHTML = cells.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
  $('#share-box').hidden = !done || !!PRACTICE;
  if (done) $('#share-text').textContent = shareText();
  $('#summary').innerHTML = '';
  if (done && battle?.ended) {
    const rows = summary(), mvp = rows.reduce((m, r) => (r.kos * 1000 + r.dmg > m.kos * 1000 + m.dmg ? r : m), rows[0]);
    $('#summary').innerHTML = `<h3>${T.summary}</h3><table><tr><th></th><th>${T.kos}</th><th>${T.dmg}</th><th>${T.taken}</th></tr>${rows.map(r =>
      `<tr class="${r === mvp ? 'mvp' : ''}"><td>${icon(r.species)}${r.species}${r === mvp ? ' <b>MVP</b>' : ''}</td><td>${r.kos}</td><td>${Math.round(r.dmg)}%</td><td>${Math.round(r.taken)}%</td></tr>`).join('')}</table>`;
  }
  $('#result-actions').innerHTML = '';
  if (done) {
    const add = (txt, fn) => { const b = el('button', 'secondary', txt); b.onclick = fn; $('#result-actions').append(b); return b; };
    if (battle?.ended) add('▶ ' + T.replay, watchReplay);
    if (battle?.ended && !PRACTICE) {
      const b = add('🔗 ' + T.shareReplay, async () => {
        try { await navigator.clipboard.writeText(replayLink()); b.textContent = '🔗 ' + T.replayCopied; } catch {}
      });
    }
    for (const [txt, fn] of practiceOptions()) add(txt, fn);
    if (PRACTICE) add(T.backToday, goToday);
  }
  drawGlobal(done);
  tickCountdown();
  if (!$('#dlg-stats').open) $('#dlg-stats').showModal();
}

// Estadísticas de todos los jugadores de hoy en este modo (solo tras jugar, para no condicionar).
async function drawGlobal(done) {
  const box = $('#global');
  box.innerHTML = '';
  if (!done || PRACTICE || REPLAY) return;
  const g = (await dailyStats(TODAY))?.[MODE];
  if (!g || !g.players) return;
  const pct = n => Math.round(100 * n / g.players);
  if (LIGA) {
    const mine = day().reached, worse = g.reached.slice(0, mine).reduce((a, b) => a + b, 0);
    box.innerHTML = `<h3>🌍 ${T.globalTitle}</h3><p>${T.globalPlayers(g.players)} · ${T.globalChampions(g.wins, pct(g.wins))}</p>
      <div class="dist">${g.reached.map((n, i) => `<div class="${i === mine ? 'me' : ''}"><i style="height:${Math.max(4, pct(n))}%"></i><span>${i}/5</span></div>`).join('')}</div>
      <p>${T.globalBetter(pct(worse))}</p>`;
  } else {
    box.innerHTML = `<h3>🌍 ${T.globalTitle}</h3><p>${T.globalPlayers(g.players)} · ${T.globalWins(pct(g.wins))}${g.avgTurns ? ` · ${T.globalTurns(g.avgTurns)}` : ''}</p>`;
  }
}

$('#btn-share').onclick = async () => {
  const text = shareText();
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
$('#day-num').textContent = PRACTICE ? T.practiceBadge : REPLAY ? '▶' : '#' + DAY;
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

const firstVisit = !Object.values(BOSSES).concat({id: 'liga'}).some(b => ls.get(keyOf(b.id)));
if (firstVisit && !PRACTICE && !REPLAY) $('#dlg-help').showModal();
if (REPLAY || rec().started) startBattle(false);
else renderDraft();
