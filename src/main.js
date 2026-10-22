// Interfaz: rivales diarios, Liga, vista previa de equipos, combate animado a partir del log de Showdown,
// resultado, repeticiones compartibles y ajustes.
import {Dex} from '@pkmn/sim';
import {Sprites, Icons} from '@pkmn/img';
import {today, msToNext, dayNumber, dailyPool, leaguePool, leagueLineup, ruleFor, battleGimmicks, teamOf, BOSSES, LEAGUE, play, replay, typeMultiplier} from './game.js';
import {T, LANG, setLang, setBoss, ruleHtml, typeName, moveName, itemName, abilityName, moveDesc, loadMoveDescs, itemIcon, FIELD_ICON} from './i18n.js';
import {audio, setMusic, setSfx, playMusic, jingle, sfx, cry, lowHpAlarm} from './audio.js';
import {NEWS} from './news.js';
import {sendResult, dailyStats, dailyRank, dailyTop, dailyWins, sendFeedback, saveProgress, loadProgress, setNickname, deleteMyData, playerId, UUID_RE} from './stats.js';
import {setupFx, setSpeed, animateMove, floatText, statFx, popup, flash, sparkle, center, throwBall} from './fx.js';

const dex = Dex.forGen(9);
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => Object.assign(document.createElement(tag), cls ? {className: cls} : {}, html != null ? {innerHTML: html} : {});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ls = {get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }};
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------- ambientación de cada rival ----------
// era: carpeta de sprites de Showdown del juego del rival. colors: cabecera, cabecera oscura, y degradado/borde de las fichas de su equipo.
const SD = 'https://play.pokemonshowdown.com/', G6 = SD + 'sprites/gen6bgs/';
const STAGES = {
  blue: {era: 'gen4', sprite: 'blue', emoji: '🌿', bg: G6 + 'bg-city.jpg', music: ['bw2-kanto-gym-leader', 'hgss-kanto-trainer', 'xy-rival'], colors: ['#2f7de1', '#163f80', '#7fb4f0', '#2a64b8', '#123a73']},
  red: {era: 'gen4', sprite: 'red', emoji: '⛰️', bg: SD + 'fx/bg-icecave.png', music: ['hgss-kanto-trainer', 'bw2-kanto-gym-leader', 'hgss-johto-trainer']},
  lance: {era: 'gen4', sprite: 'lance', emoji: '🐉', bg: G6 + 'bg-skypillar.jpg', music: ['hgss-johto-trainer', 'spl-elite4', 'hgss-kanto-trainer'], colors: ['#c43a22', '#6e1a0e', '#f09a7f', '#b23a24', '#5e140c']},
  steven: {era: 'gen3', sprite: 'steven', emoji: '💎', bg: G6 + 'bg-earthycave.jpg', music: ['oras-rival', 'spl-elite4', 'oras-trainer'], colors: ['#5d6f8f', '#2b3550', '#a9b8d4', '#56688c', '#27324a']},
  wallace: {era: 'gen3', sprite: 'wallace', emoji: '🌊', bg: G6 + 'bg-leaderwallace.jpg', music: ['oras-trainer', 'oras-rival', 'spl-elite4'], colors: ['#1d9fcb', '#0b5a78', '#86dcf2', '#1c88b2', '#0a4a63']},
  cynthia: {era: 'gen4', sprite: 'cynthia', emoji: '👑', bg: G6 + 'bg-elite4drake.jpg', music: ['dpp-rival', 'spl-elite4', 'dpp-trainer']},
  iris: {era: 'gen5ani', sprite: 'iris', emoji: '🐲', bg: G6 + 'bg-forest.jpg', music: ['bw2-rival', 'bw-rival', 'bw2-homika-dogars', 'bw-subway-trainer'], colors: ['#9046cf', '#4d1d7c', '#d4a8f3', '#8140b6', '#43186b']},
  leon: {era: 'ani', sprite: 'leon', emoji: '🔥', bg: G6 + 'bg-darkcity.jpg', music: ['sm-rival', 'xy-rival', 'sm-trainer', 'xy-trainer'], colors: ['#b5142f', '#560715', '#f2c54a', '#a8122b', '#4a0612']},
};
const keyOf = mode => `redle:v11:${mode}`;
const TODAY = today();
const DAY = dayNumber(TODAY);
const YESTERDAY = new Date(Date.parse(TODAY + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
const params = new URLSearchParams(location.search);

// ---------- repeticiones compartibles ----------
// El combate es determinista: basta con el modo, la fecha, la ronda, el orden del equipo y las elecciones.
// Se codifican en el #hash del enlace. Todo lo que llega por el enlace se valida antes de usarlo.
const GIMMICK_TOKEN = {terastallize: 't', mega: 'm', dynamax: 'x'};
const packChoices = cs => cs.map(c => c === 'default' ? 'd' : c === 'forfeit' ? 'f' : c[0] + c.split(' ')[1] + (GIMMICK_TOKEN[c.split(' ')[2]] || '')).join('.');
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
    if (tokens.length > 1000 || !tokens.every(t => /^(m[1-4][tmx]?|s[1-6]|d|f)$/.test(t))) return null;
    const fromToken = Object.fromEntries(Object.entries(GIMMICK_TOKEN).map(([k, v]) => [v, ' ' + k]));
    const choices = tokens.map(t => t === 'd' ? 'default' : t === 'f' ? 'forfeit' : (t[0] === 'm' ? 'move ' : 'switch ') + t[1] + (fromToken[t[2]] || ''));
    return {mode, date, round, picks: picks.map(Number), choices};
  } catch { return null; }
}
const REPLAY = parseReplay(location.hash);

// ---------- modo, almacenamiento y práctica ----------
const MODE = REPLAY ? REPLAY.mode : params.get('vs') === 'liga' ? 'liga' : BOSSES[params.get('vs')] ? params.get('vs') : 'red';
const LIGA = MODE === 'liga';
const KEY = keyOf(MODE);
// Datos guardados dañados no deben dejar la página en blanco: se ignoran.
const readJSON = k => { try { return JSON.parse(ls.get(k) || '{}') || {}; } catch { return {}; } };
const store = Object.assign({stats: {played: 0, wins: 0, streak: 0, best: 0, bestRound: 0, last: null}, days: {}}, readJSON(KEY));

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
let speed = +(ls.get('redle:speed') || 2); // rápido por defecto: quien repite quiere ir al grano
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
let OPP, B, STAGE, RULE, GIMMICKS = [];
// Fondo del combate: esqueleto mientras carga, la imagen al llegar y un escenario dibujado si falla.
function loadArenaBg(url) {
  const bg = $('.arena-bg');
  bg.className = 'arena-bg';
  bg.dataset.src = url;
  bg.style.setProperty('--arena-bg', `url("${url}")`);
  const im = new Image(), mine = () => bg.dataset.src === url; // que una carga vieja no pise a la nueva
  im.onload = () => mine() && bg.classList.add('ready');
  im.onerror = () => mine() && bg.classList.add('fail');
  im.src = url;
}
// Las imágenes con esqueleto de carga lo pierden al llegar (o al fallar, para no brillar para siempre).
for (const ev of ['load', 'error']) document.addEventListener(ev, e => { if (e.target.tagName === 'IMG') e.target.classList.add('ok'); }, true);
function setOpponent(id) {
  // B.team: el equipo que tenía el rival ese día (Lance cambió de equipo el 15-10-2026).
  OPP = id; B = {...BOSSES[id], team: teamOf(id, PRACTICE ? DATE : RULE_DATE)}; STAGE = STAGES[id]; RULE = ruleFor(RULE_DATE, id); GIMMICKS = battleGimmicks(LIGA ? 'liga' : '', id);
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
  loadArenaBg(STAGE.bg);
  document.querySelectorAll('[data-i18n]').forEach(e => (e.innerHTML = T[e.dataset.i18n]));
  $('#how').innerHTML = T.how.filter(Boolean).map(h => `<li>${h}</li>`).join('');
}
setOpponent(LINEUP[round()]);
document.documentElement.lang = LANG;
if (LIGA) document.body.classList.add('mode-liga');

// Selector de modo: los 8 rivales y la Liga, con el estado del reto de hoy de cada uno.
const markOf = id => {
  const d = readJSON(keyOf(id)).days?.[TODAY];
  return id === 'liga' && d?.result ? (d.result === 'win' ? itemIcon('Poke Ball') : `${d.reached}/5`) : d?.result === 'win' ? itemIcon('Poke Ball') : d?.result === 'loss' ? '✗' : '';
};
$('#bosses').innerHTML = [...Object.values(BOSSES).map(b => ({id: b.id, name: b.name, img: `${SD}sprites/trainers/${STAGES[b.id].sprite}.png`})),
  {id: 'liga', name: T.league, img: ''}].map(b =>
  `<a href="?vs=${b.id}" class="boss-tab ${b.id}${b.id === MODE ? ' on' : ''}">${b.img ? `<img src="${b.img}" alt="" width="40" height="40">` : `<span class="liga-icon">${itemIcon('Master Ball')}</span>`}
    <span><b>${b.name}</b><small>${b.id === MODE ? (LIGA ? T.leagueWhere : T.where) : ''}</small></span><i>${markOf(b.id)}</i></a>`).join('');
{ // centrar la pestaña activa sin mover la página
  const nav = $('#bosses'), on = $('.boss-tab.on');
  if (on) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.clientWidth) / 2;
}

// ---------- utilidades visuales ----------
const typeBadge = t => `<span class="type t-${t.toLowerCase()}">${typeName(t)}</span>`;
// Sprites del juego de cada rival (HGSS, RSE, Platino, NB2…); la Liga mezcla generaciones y usa los animados.
// Los Pokémon posteriores a esa generación salen con el sprite más antiguo que exista.
const spriteOf = (species, back) => Sprites.getPokemon(species, {gen: LIGA ? 'ani' : STAGE.era, side: back ? 'p1' : 'p2'});
const icon = (species, extra = '') => `<span class="icon-mon ${extra}" style="${Icons.getPokemon(species).style}" title="${species}"></span>`;

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
// Estadísticas finales (nivel, IVs, EVs y naturaleza ya aplicados), sin enseñar IVs ni EVs.
const STAT_IDS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
function finalStats(set) {
  const base = dex.species.get(set.species).baseStats, nat = dex.natures.get(set.nature || 'Serious'), L = set.level || 100;
  return Object.fromEntries(STAT_IDS.map(s => {
    const raw = Math.floor((2 * base[s] + (set.ivs?.[s] ?? 31) + Math.floor((set.evs?.[s] ?? 0) / 4)) * L / 100);
    if (s === 'hp') return [s, set.species === 'Shedinja' ? 1 : raw + L + 10];
    return [s, Math.floor((raw + 5) * (nat.plus === s ? 1.1 : nat.minus === s ? 0.9 : 1))];
  }));
}
// Como en la pantalla de datos de los juegos: la estadística que la naturaleza sube va en rojo (▲)
// y la que baja en azul (▼). No se muestra el nombre de la naturaleza ni IVs/EVs.
// En combate, el Pokémon activo muestra la estadística ya multiplicada por sus cambios (Danza Espada +2: Ataque ×2),
// con el valor base tachado al lado y el +2 / −1.
const boostMult = n => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
const statsRow = (stats, nature, boosts = {}) => {
  const n = dex.natures.get(nature || 'Serious');
  return `<div class="stats6">${STAT_IDS.map(s => {
    const mod = n.plus === s && n.minus !== s ? 'up' : n.minus === s && n.plus !== s ? 'down' : '';
    const k = boosts[s] || 0;
    const value = k ? `<b class="${k > 0 ? 'bup' : 'bdown'}">${Math.floor(stats[s] * boostMult(k))}</b><s>${stats[s]}</s><em class="${k > 0 ? 'bup' : 'bdown'}">${k > 0 ? '+' : '−'}${Math.abs(k)}</em>` : stats[s];
    return `<span class="${mod}"><small>${s === 'hp' ? T.hpShort : T.statShort[s]}${mod === 'up' ? '▲' : mod === 'down' ? '▼' : ''}</small>${value}</span>`;
  }).join('')}</div>`;
};

function slot(set, tag) {
  const sp = dex.species.get(set.species);
  const s = el(tag, 'slot');
  s.innerHTML = `
    <img class="sp" src="${spriteOf(set.species).url}" alt="">
    <div class="top">${sp.name}<small>${T.level}${set.level}</small></div>
    <div class="types">${sp.types.map(typeBadge).join('')}</div>
    <div class="mini-hp"><i></i></div>
    <div class="sub">${set.item ? itemIcon(set.item) + itemName(set.item) : ''}<span class="ab">${set.item ? ' · ' : ''}${abilityName(set.ability)}</span>${set.teraType && GIMMICKS.includes('tera') && !B.team.includes(set) ? ` · ${T.teraLabel} ${typeBadge(set.teraType)}` : ''}${set.gigantamax ? ` <span class="gmax-tag">${T.gmaxTag}</span>` : ''}</div>
    ${statsRow(finalStats(set), set.nature)}
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

// Durante el combate de la Liga: el camino a la cima (vencidos, el actual y los que quedan).
function drawLeagueBar() {
  const bar = $('#league-bar');
  bar.hidden = !LIGA;
  if (!LIGA) return;
  const d = day(), n = round();
  // En una repetición solo existe la ronda que se ve: las anteriores se ganaron por fuerza.
  const state = i => d.rounds[i]?.result === 'win' || (REPLAY && i < n) ? 'beaten' : d.rounds[i]?.result === 'loss' ? 'lost' : i === n ? 'current' : '';
  bar.innerHTML = `<div class="steps">${LINEUP.map((id, i) => `<span class="${state(i)}${i === 4 ? ' champ' : ''}"><img src="${trainerImg(id)}" alt="${BOSSES[id].name}" width="36" height="36"></span>`).join('<i></i>')}</div>
    <small>${T.leagueProgress(n + 1, LEAGUE.rounds - 1 - n)}</small>`;
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
  $('#rules').hidden = !$('#stage-rules').innerHTML;
  // Aviso de entrenamiento: tu equipo al azar (Brazal Recio) frente al rival entrenado al máximo (Brazal Firme).
  $('#train-you').innerHTML = `${itemIcon('Power Bracer')}<span><b>${T.trainYou}</b><small>${POOL_DATE >= '2026-10-18' ? T.trainYouTipIV : T.trainYouTip}</small></span>`;
  $('#train-boss').innerHTML = `${itemIcon('Macho Brace')}<span><b>${T.trainBoss}</b><small>${T.trainBossTip}</small></span>`;
  // Fichas compactas por defecto (sprite, tipos y objeto); estadísticas, habilidad y ataques se despliegan con un toque.
  const details = ls.get('redle:details') === '1';
  $('#parties').classList.toggle('compact', !details);
  $('#btn-details').textContent = details ? T.hideDetails : T.showDetails;
  $('#btn-details').onclick = () => { ls.set('redle:details', details ? '0' : '1'); renderDraft(); };
  $('#welcome').hidden = !!ls.get('redle:welcome') || !!PRACTICE;
  $('#btn-welcome').onclick = () => { ls.set('redle:welcome', '1'); $('#welcome').hidden = true; };
  const go = $('#btn-go');
  go.querySelector('.txt').textContent = T.go;
  go.onclick = () => { r.started = true; save(); startBattle(true); };
}

// ---------- combate ----------
let battle, logIdx = 0, busy = false;
const fresh = () => ({name: '', species: '', gender: '', level: 100, hp: 0, maxhp: 1, status: '', boosts: {}, dmax: false, gmax: false});
const freshView = () => ({p1: fresh(), p2: fresh(), fainted: {p1: [], p2: []}, seen: {}, eff: null, weather: '', field: [], side: {p1: {}, p2: {}}, tera: {p1: {}, p2: {}}});
const view = freshView();
const team = () => rec().picks.map(i => POOL[i]);
const img = side => $(`.mon.${side === 'p1' ? 'me' : 'foe'}`);
const wait = ms => sleep(ms / speed);
const seenOf = species => (view.seen[species] ||= {moves: new Set()});
// Lista de pistas del rival: empieza por una distinta cada día (y en cada ronda de la Liga) y al acabar una suena la siguiente.
const playBattleMusic = () => playMusic(STAGE.music, DAY + round());

// Deja el escenario como nuevo (siguiente ronda de la Liga o repetición).
function resetView() {
  logIdx = 0;
  Object.assign(view, freshView());
  drawWeather(); drawSide('p1'); drawSide('p2');
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
  drawLeagueBar();
  watching = !!REPLAY;
  drawReplayBar();
  if (REPLAY) $('#replay-banner').innerHTML = T.replayBanner(B.name, REPLAY.date);
  if (r.result && !REPLAY) { await consume(false); if (day().result) showResult(); return; } // en la Liga puede quedar el siguiente rival
  playBattleMusic();
  if (isNew || REPLAY) {
    busy = true; // durante la intro, los controles de repetición esperan a `consume`
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
  gimmickOn = '';
  $('.forfeit-btn')?.remove();
  rec().choices.push(choice); // se guarda antes de animar: recargar no da otro intento
  save();
  await consume(true);
}

// Tocar el escenario o la caja de texto salta lo que queda de animación del turno.
let skipping = false;
for (const s of ['.arena', '.textbox']) $(s).addEventListener('click', e => { if (busy && !e.target.closest('.hud')) skipping = true; });

// Procesa líneas del log. En una repetición se puede pausar entre mensajes o pedir un salto de turno (`seek`):
// entonces corta y devuelve false.
async function runLines(lines, animate) {
  for (let i = 0; i < lines.length; i++) {
    while (paused && seek === null) await sleep(100);
    if (seek !== null) return false;
    let line = lines[i];
    if (line.startsWith('|split|')) { line = lines[i + 1]; i += 2; } // línea privada = PS exactos
    if (line.startsWith('|turn|')) { skipping = false; setReplayTurn(+line.split('|')[2]); } // el toque salta solo ese turno
    // Un fallo al pintar una línea (navegador antiguo, dato raro) no puede dejar el combate bloqueado: se salta.
    try { await step(line.split('|').slice(1), animate && !skipping); } catch (e) { console.error(line, e); }
  }
  return true;
}

async function consume(animate) {
  busy = true;
  skipping = false;
  $('#controls').classList.add('locked');
  $('#prompt').textContent = '';
  const lines = battle.log.slice(logIdx);
  logIdx = battle.log.length;
  if (!await runLines(lines, animate)) { const t = seek; seek = null; busy = false; return seekTo(t); }
  drawHud('p1'); drawHud('p2');
  drawTeamPanel();
  busy = false;
  $('#controls').classList.remove('locked');
  if (battle.ended) finish(animate);
  else if (REPLAY) replayEnd();
  else drawControls();
}

// ---------- controles de repetición: pausa, turno anterior/siguiente, ir a un turno o al final ----------
let watching = false, paused = false, seek = null, replayTurn = 0;
function drawReplayBar() {
  const bar = $('#replay-ctl');
  bar.hidden = !watching;
  if (!watching) return;
  const opts = Array.from({length: battle.turn + 1}, (_, t) => `<option value="${t}">${t ? T.rTurnN(t) : T.rStart}</option>`).join('');
  bar.innerHTML = `<button data-a="prev">${T.rPrev}</button><button data-a="pause" class="${paused ? 'on' : ''}">${paused ? T.rPlay : T.rPause}</button>
    <button data-a="next">${T.rNext}</button><select aria-label="${T.rTurn}">${opts}</select><button data-a="end">${T.rEnd}</button>`;
  bar.querySelector('select').value = replayTurn;
  bar.querySelector('select').onchange = e => requestSeek(+e.target.value);
  bar.querySelectorAll('button').forEach(b => (b.onclick = () => {
    sfx('click');
    const a = b.dataset.a;
    if (a === 'pause') { paused = !paused; drawReplayBar(); }
    else requestSeek(a === 'prev' ? Math.max(0, replayTurn - 1) : a === 'next' ? replayTurn + 1 : Infinity);
  }));
}
function setReplayTurn(t) {
  replayTurn = t;
  const sel = $('#replay-ctl select');
  if (sel) sel.value = t;
}
function requestSeek(t) {
  paused = false;
  if (busy) { seek = t; skipping = true; } else seekTo(t);
  drawReplayBar();
}
// Salta al inicio del turno `t` (0 = principio, Infinity = final): rehace el escenario sin animar hasta ahí y sigue.
async function seekTo(t) {
  const all = battle.log, at = t <= 0 ? 0 : all.indexOf(`|turn|${t}`), end = at < 0 ? all.length : at;
  lowHpAlarm(false);
  resetView();
  busy = true;
  replayTurn = 0;
  await runLines(all.slice(0, end), false);
  logIdx = end;
  busy = false;
  await consume(true);
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
        im.addEventListener('animationend', () => im.classList.remove('enter'), {once: true});
        await cry(cryId(species));
        await wait(700);
      } else setHp(side, c, false);
      return;
    }
    case 'move': {
      const target = c.startsWith('p') ? c.slice(0, 2) : side === 'p1' ? 'p2' : 'p1';
      if (side === 'p2') seenOf(view.p2.species).moves.add(b);
      view.lastMove = {side, move: b};
      await say(T.uses(who(a), `<i>${moveName(b)}</i>`), animate, cls);
      if (animate && !tags.includes('[still]') && !tags.includes('[miss]')) {
        sfx('attack', dex.moves.get(b).type);
        await animateMove(b, img(side), img(target));
      }
      return;
    }
    case '-heal':
      if (tags.includes('Revival Blessing')) {
        const {name} = parseId(a), i = view.fainted[side].indexOf(name);
        if (i >= 0) view.fainted[side].splice(i, 1);
        drawHud(side);
        if (animate) { sfx('heal'); flash('#fff6c2', 500); }
        return say(T.revived(side === 'p1' ? `<b>${name}</b>` : `<b>${T.foe(name)}</b>`), animate, cls);
      }
      // falls through
    case '-damage': case '-sethp': {
      const {delta, pct, dur} = setHp(side, b, animate);
      if (!delta || tags.includes('[silent]')) return;
      if (animate) {
        const heal = delta > 0;
        floatText(img(side), side === 'p1' ? `${heal ? '+' : '−'}${Math.abs(delta)}` : `${heal ? '+' : '−'}${pct}%`, heal);
        if (heal) { sfx('heal'); sparkle(center(img(side))); }
        else if (!tags.includes('[from]')) {
          sfx(view.eff === 'super' ? 'super' : view.eff === 'weak' ? 'weak' : 'hit');
          const im = img(side); im.classList.remove('hit'); void im.offsetWidth; im.classList.add('hit');
          im.addEventListener('animationend', () => im.classList.remove('hit'), {once: true});
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
      if (tags.includes('move: Wish')) return say(T.wishCame(tags.match(/\[wisher\] ([^|]+)/)?.[1] || parseId(a).name), animate, cls);
      if (/move: (Healing Wish|Lunar Dance)/.test(tags)) return say(T.healingWish(who(a)), animate, cls);
      return say((delta > 0 ? T.gained : T.lost_)(who(a), pct), animate, cls);
    }
    // El aviso de eficacia llega antes que el daño: se guarda y se muestra con el golpe.
    case '-supereffective': view.eff = 'super'; return say(T.super, animate, 'eff');
    case '-resisted': view.eff = 'weak'; return say(T.resisted, animate);
    case '-immune': {
      if (animate) sfx('miss');
      // Bromista: sus movimientos de estado no afectan a los tipo Siniestro (desde la 7.ª gen). Sin esto parecía un fallo.
      const lm = view.lastMove, mv = lm && dex.moves.get(lm.move);
      const types = view.tera[side][view[side].name] ? [view.tera[side][view[side].name]] : dex.species.get(view[side].species).types;
      if (mv?.category === 'Status' && lm.side !== side && battle?.[lm.side]?.active[0]?.ability === 'prankster' && types.includes('Dark'))
        return say(T.pranksterDark(who(a)), animate);
      return say(T.immune(who(a)), animate);
    }
    case '-crit': if (animate) { sfx('crit'); flash('#fff', 200); } return say(T.crit, animate, 'eff');
    case '-miss': if (animate) sfx('miss'); return say(T.miss(who(b || a)), animate);
    case '-fail': return say(T.fail, animate);
    case '-hitcount': return say(T.hitcount(b), animate);
    case 'faint': {
      view.fainted[side].push(parseId(a).name);
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
    case '-clearnegativeboost': // Hierba Blanca: quita solo las bajadas (el combate ya las quitaba; faltaba en el marcador)
      for (const k in view[side].boosts) if (view[side].boosts[k] < 0) delete view[side].boosts[k];
      drawHud(side); return;
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
    case '-fieldstart': case '-fieldend': { // campos, Espacio Raro, Gravedad, combate inverso
      const id = a.replace('move: ', '');
      // Un campo nuevo sustituye al anterior (Showdown no avisa del final del viejo).
      const rest = view.field.filter(f => f !== id && !(cmd === '-fieldstart' && id.endsWith('Terrain') && f.endsWith('Terrain')));
      view.field = cmd === '-fieldstart' ? [...rest, id] : rest;
      drawWeather();
      return cmd === '-fieldstart' && T.fieldStart[id] ? say(T.fieldStart[id], animate, 'eff') : null;
    }
    case '-prepare': return say(T.prepare(who(a)), animate, cls);
    case '-singleturn': // Protección y sus variantes: burbuja alrededor del Pokémon
      if (!/Protect|Detect|Shield|Bunker|Silk Trap|Bulwark|Obstruct|Max Guard/.test(b)) return null;
      if (animate) shield(side);
      return say(T.protect(who(a)), animate, cls);
    case '-sidestart': case '-sideend': { // Trampa Rocas, Púas, Reflejo… (Púas y Púas Tóxicas se acumulan)
      const id = b.replace('move: ', ''), conds = view.side[side];
      if (cmd === '-sidestart') conds[id] = (conds[id] || 0) + 1; else delete conds[id];
      drawSide(side);
      const ally = side === 'p1';
      if (cmd === '-sideend') return say(T.sideEnd(moveName(id)), animate);
      return say(T.hazardStart[toID(id)]?.(ally) || T.sideStart(moveName(id), ally), animate);
    }
    case '-swapsideconditions': // Cambio de Banda
      [view.side.p1, view.side.p2] = [view.side.p2, view.side.p1];
      drawSide('p1'); drawSide('p2');
      return;
    case '-transform': return say(T.mimic(who(a)), animate, cls);
    case 'detailschange': { // forma nueva (Megaevolución)
      view[side].species = b.split(', ')[0];
      drawHud(side);
      return;
    }
    case '-mega':
      if (animate) {
        sfx('boost'); flash('#ffffff', 450);
        img(side).animate([{filter: 'brightness(4) saturate(0)'}, {filter: 'brightness(4) saturate(0)', offset: 0.3}, {filter: 'none'}], {duration: 1300 / speed});
      }
      return say(T.megaEvolved(who(a), dex.species.get(view[side].species).name), animate, cls);
    case '-terastallize': {
      view.tera[side][parseId(a).name] = b;
      drawHud(side);
      if (animate) {
        sfx('boost');
        flash('#ffffff', 300);
        img(side).animate([{filter: 'none'}, {filter: 'brightness(2.2) saturate(1.6) drop-shadow(0 0 16px #9ff3ff)', offset: 0.4}, {filter: 'drop-shadow(0 0 6px #9ff3ff)'}], {duration: 1200 / speed});
      }
      return say(T.terastallized(who(a), typeName(b)), animate, cls);
    }
    case '-start':
      if (b === 'Dynamax') {
        Object.assign(view[side], {dmax: true, gmax: c === 'Gmax'});
        drawHud(side);
        if (animate) { sfx('boost'); flash('#ff2a6d', 600); }
        return say((c === 'Gmax' ? T.gigantamaxed : T.dynamaxed)(who(a)), animate, cls);
      }
      if (b.includes('Substitute')) { // el Pokémon se cambia por el muñeco del Sustituto
        view[side].sub = true;
        await swapSprite(side, animate);
        return say(T.sub(who(a)), animate, cls);
      }
      if (b.includes('confusion')) return say(T.confused(who(a)), animate, cls);
      if (b.includes('Leech Seed')) return say(T.seeded(who(a)), animate, cls);
      // Premonición / Deseo Oculto: el ataque llega dos turnos después (el aviso sale en -end, junto al daño).
      if (/Future Sight|Doom Desire/.test(b)) return say(T.foresaw(who(a), moveName(b.replace('move: ', ''))), animate, cls);
      if (b.includes('Taunt')) return say(T.taunted(who(a)), animate, cls);
      if (b.includes('Encore')) return say(T.encored(who(a)), animate, cls);
      if (b.includes('Yawn')) return say(T.drowsy(who(a)), animate, cls);
      if (/^perish\d/.test(b) && !tags.includes('[silent]')) return say(T.perish(who(a), b.slice(6)), animate, cls);
      return;
    case '-end':
      if (b === 'Dynamax') {
        Object.assign(view[side], {dmax: false, gmax: false});
        drawHud(side);
        return say(T.dynamaxEnd(who(a)), animate, cls);
      }
      if (/Future Sight|Doom Desire/.test(b)) { // el ataque llega: animación desde el otro lado y luego el daño (siguiente línea)
        const mv = b.replace('move: ', '');
        if (animate) await animateMove(mv, img(side === 'p1' ? 'p2' : 'p1'), img(side));
        return say(T.foresawHit(who(a), moveName(mv)), animate, cls);
      }
      if (b.includes('Substitute')) { // el muñeco se rompe y vuelve el Pokémon
        view[side].sub = false;
        await swapSprite(side, animate);
        return say(T.subEnd(who(a)), animate, cls);
      }
      return null;
    case '-activate':
      if (b.includes('confusion')) return say(T.confusedAct(who(a)), animate, cls);
      if (b.includes('Substitute')) { // el golpe se lo lleva el muñeco
        if (animate) { const im = img(side); im.classList.remove('hit'); void im.offsetWidth; im.classList.add('hit'); sfx('hit'); }
        return say(T.subHit, animate);
      }
      if (/Protect|Detect|Shield|Bunker|Silk Trap|Bulwark|Obstruct|Max Guard/.test(b)) { if (animate) shield(side); return say(T.protect(who(a)), animate, cls); }
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
// Como en Showdown: cada clima y cada campo tiñe el escenario con su imagen de efectos.
const WEATHER_BG = {SunnyDay: 'weather-sunnyday.jpg', RainDance: 'weather-raindance.jpg', Sandstorm: 'weather-sandstorm.png',
  Hail: 'weather-hail.png', Snowscape: 'weather-hail.png', Snow: 'weather-hail.png'};
const FIELD_BG = {'Electric Terrain': 'weather-electricterrain.png', 'Grassy Terrain': 'weather-grassyterrain.png',
  'Misty Terrain': 'weather-mistyterrain.png', 'Psychic Terrain': 'weather-psychicterrain.png', 'Trick Room': 'weather-trickroom.png', Gravity: 'weather-gravity.png'};
const layer = (sel, file) => { $(sel).style.backgroundImage = file ? `url(${SD}fx/${file})` : ''; $(sel).classList.toggle('on', !!file); };
function drawWeather() {
  $('.arena').classList.toggle('hail', view.weather === 'Hail' || view.weather === 'Snowscape' || view.weather === 'Snow');
  layer('.fx-weather', WEATHER_BG[view.weather]);
  layer('.fx-field', FIELD_BG[view.field.filter(f => FIELD_BG[f]).pop()]);
  const badges = [[view.weather, T.weatherBadge[view.weather]], ...view.field.map(f => [f, T.fieldBadge[f]])]
    .filter(([, txt]) => txt).map(([id, txt]) => `${itemIcon(FIELD_ICON[id])}${txt}`);
  $('.weather-badge').hidden = !badges.length;
  $('.weather-badge').innerHTML = badges.join(' · ');
}

// Trampas y barreras en el lado de cada uno: piedras, púas y red bajo el Pokémon, y un panel de color para
// Reflejo / Pantalla de Luz / Velo Aurora. El resto (Viento Afín, Velo Sagrado…) como etiqueta pequeña.
const HAZARD_IMG = {stealthrock: ['rock1.png', 'rock2.png', 'rock3.png'], spikes: ['caltrop.png'], toxicspikes: ['poisoncaltrop.png'], stickyweb: ['web.png']};
const SCREENS = {reflect: 'reflect', lightscreen: 'lightscreen', auroraveil: 'auroraveil'};
function drawSide(side) {
  const box = $(`.side-fx.${side === 'p1' ? 'me' : 'foe'}`), conds = Object.entries(view.side[side]);
  const imgs = conds.flatMap(([id, n]) => {
    const files = HAZARD_IMG[toID(id)];
    if (!files) return [];
    const count = toID(id) === 'stealthrock' ? 3 : toID(id) === 'stickyweb' ? 1 : n;
    return Array.from({length: count}, (_, i) => `<img class="hz ${toID(id)}" src="${SD}fx/${files[i % files.length]}" alt="">`);
  });
  const screens = conds.filter(([id]) => SCREENS[toID(id)]).map(([id]) => `<i class="screen ${SCREENS[toID(id)]}"></i>`);
  const tags = conds.filter(([id]) => !HAZARD_IMG[toID(id)] && !SCREENS[toID(id)]).map(([id]) => `<span>${moveName(id)}</span>`);
  box.innerHTML = `${screens.join('')}<div class="hz-row">${imgs.join('')}</div>${tags.length ? `<div class="sc-tags">${tags.join('')}</div>` : ''}`;
}

function drawHud(side, dur = 0, fromHp) {
  const v = view[side], cls = side === 'p1' ? 'me' : 'foe';
  if (!v.species) return;
  const im = img(side);
  const shown = v.sub ? 'substitute' : v.gmax && dex.species.get(`${v.species}-Gmax`).exists ? `${v.species}-Gmax` : v.species;
  im.classList.toggle('dynamax', v.dmax);
  im.dataset.status = v.hp > 0 ? v.status : ''; // cada problema de estado tiñe y mueve el sprite a su manera
  $(`.zzz.${cls}`).hidden = v.status !== 'slp' || v.hp <= 0;
  if (im.dataset.species !== shown) {
    const s = v.sub ? subSprite(side === 'p1') : spriteOf(shown, side === 'p1');
    im.src = s.url;
    im.alt = v.species;
    im.dataset.species = shown;
    im.style.setProperty('--w', s.w);
  }
  const hud = $(`.hud.${cls}`);
  hud.querySelector('.name').textContent = v.name;
  const g = hud.querySelector('.gender');
  g.textContent = v.gender === 'M' ? '♂' : v.gender === 'F' ? '♀' : '';
  g.className = 'gender ' + v.gender.toLowerCase();
  hud.querySelector('.lvl').textContent = T.level + v.level;
  const tera = view.tera[side][v.name];
  hud.querySelector('.types').innerHTML = tera ? `<span class="tera-tag">${T.teraLabel}</span>${typeBadge(tera)}` : dex.species.get(v.species).types.map(typeBadge).join('');
  const pct = Math.max(0, 100 * v.hp / v.maxhp);
  animateBar(side, fromHp != null ? Math.max(0, 100 * fromHp / v.maxhp) : pct, pct, dur, v.maxhp);
  const boosts = Object.entries(v.boosts).filter(([, n]) => n)
    .map(([s, n]) => `<span class="boost ${n > 0 ? 'up' : 'down'}">${T.statShort[s]} ${n > 0 ? '+' : ''}${n}</span>`).join('');
  hud.querySelector('.status').innerHTML = (v.status ? `<span class="st st-${v.status}">${T.statusTag[v.status]}</span>` : '') + boosts;
  if (side === 'p1') lowHpAlarm(v.hp > 0 && pct <= 20 && !battle?.ended);
  const out = faintedMarks(side, side === 'p1' ? team() : B.team);
  $(`.balls.${cls}`).innerHTML = out.map(o => `<i class="${o ? 'out' : ''}"></i>`).join('');
}

// Qué miembros del equipo están debilitados, por mote y contando repetidos (no por especie: Rotom-Fan se llama Rotom).
function faintedMarks(side, sets) {
  const left = [...view.fainted[side]];
  return sets.map(s => { const i = left.indexOf(s.name || s.species); if (i < 0) return false; left.splice(i, 1); return true; });
}

// Pestaña "Tu equipo": objeto actual, habilidad, vida y ataques con PP de cada uno de tus Pokémon.
function drawTeamPanel() {
  $('#team-panel').innerHTML = battle.p1.pokemon.map(p => {
    const pct = Math.round(100 * p.hp / p.maxhp);
    const it = p.item ? `${itemIcon(p.item)}${itemName(p.item)}` : T.noItem;
    return `<div class="tp${p.fainted ? ' out' : ''}${p.isActive ? ' active' : ''}">
      <div class="tp-head">${icon(p.species.name)}<b>${p.name}</b>${p.status ? `<span class="st st-${p.status}">${T.statusTag[p.status]}</span>` : ''}<span class="tp-hp">${p.hp}/${p.maxhp}</span></div>
      <div class="mini-hp"><i class="${pct > 50 ? '' : pct > 20 ? 'mid' : 'low'}" style="width:${pct}%"></i></div>
      <div class="tp-sub">${it} · ${abilityName(p.ability)} · ${T.teraLabel} ${typeBadge(p.teraType)}${p.terastallized ? ' ✓' : ''}</div>
      ${statsRow({...p.storedStats, hp: p.maxhp}, p.set.nature, p.isActive ? p.boosts : {})}
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

// Mecanismo elegido para el próximo ataque: '' | 'terastallize' | 'mega' | 'dynamax'.
let gimmickOn = '';
const GIMMICK_BTN = [['canTerastallize', 'terastallize', 'tera'], ['canMegaEvo', 'mega', 'mega'], ['canDynamax', 'dynamax', 'dmax']];
function drawControls() {
  $('.forfeit-btn')?.remove();
  const req = battle.p1.activeRequest;
  const moves = $('#moves'), switches = $('#switches');
  moves.innerHTML = switches.innerHTML = '';
  if (!req || req.wait) return;
  const me = battle.p1.active[0], foe = battle.p2.active[0];
  // Revival Blessing (Bendición): hay que elegir a un Pokémon debilitado para revivirlo.
  const revive = req.forceSwitch && !!battle.p1.slotConditions[0]?.revivalblessing;
  $('#prompt').textContent = revive ? T.revivePick : req.forceSwitch ? T.who : T.what(me.name);
  switches.classList.toggle('revive', revive);
  const r = req.active?.[0];
  if (!req.forceSwitch) {
    const avail = GIMMICK_BTN.filter(([flag]) => r[flag]);
    if (gimmickOn && !avail.some(([, g]) => g === gimmickOn)) gimmickOn = '';
    if (avail.length) {
      const row = el('div', 'gimmicks');
      for (const [, g, cls] of avail) {
        const label = g === 'terastallize' ? `${T.teraBtn} <span class="type t-${me.teraType.toLowerCase()}">${typeName(me.teraType)}</span>`
          : g === 'mega' ? T.megaBtn : r.maxMoves?.gigantamax ? T.gmaxBtn : T.dmaxBtn;
        const gb = el('button', `gimmick ${cls}${gimmickOn === g ? ' on' : ''}`, label);
        gb.onclick = () => { gimmickOn = gimmickOn === g ? '' : g; sfx('click'); drawControls(); };
        row.append(gb);
      }
      moves.append(row);
    }
  }
  // Con Dinamax (activo o a punto de usarse) los botones muestran los Maxiataques.
  const maxMode = !req.forceSwitch && (me.volatiles.dynamax || gimmickOn === 'dynamax');
  if (!req.forceSwitch) {
    req.active[0].moves.forEach((m, i) => {
      const move = dex.moves.get(maxMode && r.maxMoves?.maxMoves?.[i] ? r.maxMoves.maxMoves[i].move : m.id);
      const cat = move.category === 'Status' ? T.status : move.category === 'Physical' ? T.physical : T.special;
      const mult = typeMultiplier(me, foe, m.id);
      const hint = mult === null ? '' : mult === 0 ? T.noEffect : mult > 1 ? T.superEff : mult < 1 ? T.notVery : '';
      const power = move.isMax ? dex.moves.get(m.id).maxMove?.basePower : move.basePower; // potencia real del Maxiataque
      const info = [cat, power && move.category !== 'Status' ? `${T.power} ${power}` : '', move.accuracy === true ? '' : `${T.acc} ${move.accuracy}`].filter(Boolean).join(' · ');
      // Descripción como en los juegos al elegir un ataque (los Maxiataques no tienen texto oficial).
      const desc = move.isMax ? (move.id === 'maxguard' ? T.maxGuardDesc : T.maxDesc(typeName(move.type))) : moveDesc(move.id);
      const b = el('button', `move t-${move.type.toLowerCase()}`,
        `<b>${m.id === 'recharge' ? T.recharge : moveName(move.id)}</b><span class="line">${typeBadge(move.type)}<span>PP ${m.pp ?? '-'}/${m.maxpp ?? '-'}</span></span><span class="info">${info}</span>${desc ? `<span class="desc">${desc}</span>` : ''}${hint ? `<em class="${mult > 1 ? 'good' : 'bad'}">${hint}</em>` : ''}`);
      b.disabled = !!m.disabled || m.pp === 0;
      if (desc) b.title = desc;
      b.onclick = () => choose(`move ${i + 1}${gimmickOn ? ' ' + gimmickOn : ''}`);
      moves.append(b);
    });
  }
  const trapped = !req.forceSwitch && req.active[0].trapped;
  battle.p1.pokemon.forEach((p, i) => {
    const b = el('button', 'sw' + (p.isActive ? ' active' : '') + (p.fainted ? (revive ? ' revivable' : ' out') : ''),
      `${icon(p.species.name)}<span>${p.name}</span><i style="--hp:${Math.round(100 * p.hp / p.maxhp)}%"></i>${revive && p.fainted ? `<em>${T.reviveTag}</em>` : ''}`);
    b.disabled = revive ? !p.fainted : p.fainted || p.isActive || trapped;
    b.title = `${p.name} · ${p.hp}/${p.maxhp} · ${p.moveSlots.map(m => moveName(m.id)).join(', ')}`;
    b.onclick = () => choose(`switch ${i + 1}`);
    switches.append(b);
  });
  // Rendirse: cuenta como derrota y deja practicar con el mismo equipo enseguida.
  if (!REPLAY) {
    const f = el('button', 'forfeit-btn', T.forfeit);
    f.onclick = () => { if (confirm(T.forfeitConfirm)) choose('forfeit'); };
    switches.after(f);
  }
}

// Muñeco del Sustituto del juego del rival (RSE, HGSS/Platino o NB; la Liga y Leon, el de NB).
const SUB_SPRITES = {gen3: ['gen3', 64], gen4: ['gen4', 80]};
function subSprite(back) {
  const [dir, w] = SUB_SPRITES[LIGA ? '' : STAGE.era] || ['gen5', 96];
  return {url: `${SD}sprites/substitutes/${dir}${back ? '-back' : ''}/substitute.png`, w};
}
async function swapSprite(side, animate) {
  const im = img(side);
  if (animate) { sfx('switch'); im.classList.add('swap'); await wait(180); }
  drawHud(side);
  if (animate) { await wait(220); im.classList.remove('swap'); }
}
function shield(side) {
  const im = img(side), c = center(im), r = im.getBoundingClientRect();
  const el2 = el('div', 'shield');
  const size = Math.max(r.width, r.height) * 1.15;
  el2.style.cssText = `left:${c.x - size / 2}px;top:${c.y - size / 2}px;width:${size}px;height:${size}px`;
  $('.arena').append(el2);
  sfx('item');
  setTimeout(() => el2.remove(), 1000 / speed);
}

// Tu marcador abre la pestaña "Tu equipo" (estadísticas, cambios de características, objeto y PP).
$('.hud.me').onclick = () => { $('.tabs button[data-tab=team-panel]').click(); $('.tabs').scrollIntoView({behavior: 'smooth', block: 'start'}); };

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
    <div class="icons">${faintedMarks('p2', B.team).map((o, i) => icon(B.team[i].species, o ? 'out' : view.seen[B.team[i].species] ? '' : 'unseen')).join('')}</div>`;
  $('#dlg-foe').showModal();
};

// ---------- final, Liga y estadísticas ----------
const ballBtn = (txt, fn, cls = 'ballbtn') => { const b = el('button', cls, `<span class="ball" aria-hidden="true"></span><span class="txt">${txt}</span>`); b.onclick = fn; return b; };

// Al acabar el día (rival o Liga completa) se apuntan las estadísticas una sola vez.
function closeDay(won, reached) {
  const d = day();
  // Contra un rival, `finish` ya apunta el resultado en el día (es el mismo registro): por eso la marca aparte.
  if (LIGA ? d.result : d.closed) return;
  d.closed = true;
  d.result = won ? 'win' : 'loss';
  if (LIGA) d.reached = reached;
  if (PRACTICE || REPLAY) return;
  const s = store.stats;
  s.played++;
  if (won) { s.wins++; s.streak = s.last === YESTERDAY ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak); s.last = TODAY; }
  else s.streak = 0;
  if (LIGA) s.bestRound = Math.max(s.bestRound || 0, reached);
  save();
  if (won) award(MODE);
  bumpStreak();
  sendResult(myResult());
  backup();
}
// Resultado de hoy tal y como se envía (y se compara para el puesto del día).
const myResult = () => {
  const d = day();
  return LIGA ? {day: TODAY, mode: MODE, won: d.result === 'win', turns: null, reached: d.reached, kos: null}
    : {day: TODAY, mode: MODE, won: d.result === 'win', turns: d.turns, reached: null, kos: d.red.filter(a => !a).length,
      // Si ganas, tu repetición queda para que otros vean cómo se hizo (solo tras jugar su intento).
      replay: d.result === 'win' ? encodeReplay({m: MODE, d: DATE, r: 0, p: d.picks, c: d.choices}) : null};
};

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
    const mvp = mvpOf(summary());
    if (mvp && (mvp.kos || mvp.dmg >= 1)) r.mvp = mvp.species;
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
  $('#moves').append(ballBtn(T.seeResult, showResult),
    ballBtn('▶ ' + T.replay, watchReplay, 'ballbtn alt'), ...practiceOptions().map(([txt, fn]) => ballBtn(txt, fn, 'ballbtn alt')));
  if (animate) resultTimer = setTimeout(showResult, 2500);
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
let resultTimer;
async function watchReplay() {
  if (busy) return;
  clearTimeout(resultTimer); // que no salte el resultado encima de la repetición
  $('#dlg-stats').close();
  resetView();
  battle = replay(battleKey(), team(), rec().choices, OPP, RULE);
  watching = true; paused = false; replayTurn = 0;
  drawReplayBar();
  playBattleMusic();
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
  // Por mote (el del set), no por especie: Palafin-Hero, Minior-Meteor o una Mega cambian de especie al volver a salir.
  const stats = new Map(team().map(s => [s.name || s.species, {species: s.species, dmg: 0, kos: 0, taken: 0}]));
  const hp = {}, active = {};
  let attacker = null;
  const lines = battle.log;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith('|split|')) { line = lines[i + 1]; i += 2; }
    const [, cmd, a = '', b = '', c = ''] = line.split('|');
    const side = a.slice(0, 2);
    if (cmd === 'switch' || cmd === 'drag') { active[side] = parseId(a).name; const [h, m] = c.split(' ')[0].split('/').map(Number); hp[side] = [h, m]; }
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

const mvpOf = rows => rows.reduce((m, r) => (r.kos * 1000 + r.dmg > m.kos * 1000 + m.dmg ? r : m), rows[0]);

function shareText() {
  const d = day(), url = `${location.origin}${location.pathname}?vs=${MODE}`;
  if (LIGA) {
    const marks = LINEUP.map((_, i) => d.rounds[i]?.result === 'win' ? '✅' : d.rounds[i]?.result === 'loss' ? '❌' : '⬜').join('');
    return `Redle ${T.league} #${DAY} 🏟️\n${T.leagueShare(d.reached)}\n${marks}\n${LINEUP.map(id => BOSSES[id].name).join(' · ')}\n${streakLine()}${url}`;
  }
  const mine = d.mine.map(f => (f === 0 ? '🟥' : f < 0.5 ? '🟨' : '🟩')).join('');
  const red = d.red.map(a => (a ? '🔴' : '⚫')).join('');
  const left = d.red.filter(Boolean).length;
  const head = d.result === 'win' ? T.shareWin(d.turns) : `${T.shareLoss(d.turns)} · ${T.shareLeft(left)}`;
  return `Redle #${DAY} ${STAGE.emoji} vs ${B.name}\n${head}\n${T.you}: ${mine}\n${T.red}: ${red}\n${d.mvp ? `${T.mvp}: ${d.mvp}\n` : ''}${streakLine()}${url}`;
}
const streakLine = () => { const s = playStreak(); return s.n > 1 ? T.shareStreak(s.n) + '\n' : ''; };

// Racha de días seguidos jugando (cualquier modo). Con esta dificultad, la racha de victorias casi nunca pasa de 1.
const playStreak = () => {
  const s = readJSON('redle:streak');
  return s.last === TODAY || s.last === YESTERDAY ? {n: s.n || 0, best: s.best || 0} : {n: 0, best: s.best || 0};
};
function bumpStreak() {
  const s = readJSON('redle:streak');
  if (s.last === TODAY) return;
  s.n = s.last === YESTERDAY ? (s.n || 0) + 1 : 1;
  s.best = Math.max(s.best || 0, s.n);
  s.last = TODAY;
  ls.set('redle:streak', JSON.stringify(s));
  for (const [n] of STREAK_MEDALS) if (s.n >= n) award('streak' + n);
}

function showResult() {
  const d = store.days[DATE], done = d?.result;
  $('#result-title').textContent = !done ? T.stats : LIGA ? (done === 'win' ? T.leagueWon : T.leagueLost(d.reached + 1)) : done === 'win' ? T.won : T.lost;
  $('#result-body').innerHTML = !done ? '' : LIGA
    ? `<div class="lineup small-lineup">${LINEUP.map((id, i) => `<figure class="${d.rounds[i]?.result === 'win' ? 'beaten' : d.rounds[i]?.result === 'loss' ? 'lost' : ''}"><img src="${trainerImg(id)}" alt="" width="48" height="48"><figcaption><b>${BOSSES[id].name}</b></figcaption></figure>`).join('')}</div><p>${done === 'win' ? T.leagueWonSub : T.leagueLostSub}</p>`
    : `<img class="result-red ${done}" src="${trainerImg(OPP)}" alt="${B.name}" width="96" height="96"><p>${done === 'win' ? T.wonSub : T.lostSub}</p>`;
  const s = store.stats, days = playStreak().n;
  const cells = LIGA
    ? [[s.played, T.played], [s.wins, T.champions], [`${s.bestRound || 0}/5`, T.bestRound], [days, T.playStreak]]
    : [[s.played, T.played], [s.played ? Math.round(100 * s.wins / s.played) + '%' : '—', T.winPct], [days, T.playStreak], [s.best, T.best]];
  $('#stats').innerHTML = cells.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
  $('#medals').innerHTML = medalsHtml();
  $('#share-box').hidden = !done || !!PRACTICE;
  if (done) $('#share-text').textContent = shareText();
  $('#btn-share').textContent = T.share; // no dejar "¡Copiado!" de la vez anterior
  $('#summary').innerHTML = '';
  if (done && battle?.ended) {
    const rows = summary(), mvp = mvpOf(rows);
    $('#summary').innerHTML = `<h3>${T.summary}</h3><table><tr><th></th><th>${T.kos}</th><th>${T.dmg}</th><th>${T.taken}</th></tr>${rows.map(r =>
      `<tr class="${r === mvp ? 'mvp' : ''}"><td>${icon(r.species)}${r.species}${r === mvp ? ` <b>${T.mvp}</b>` : ''}</td><td>${r.kos}</td><td>${Math.round(r.dmg)}%</td><td>${Math.round(r.taken)}%</td></tr>`).join('')}</table>`;
  }
  $('#result-actions').innerHTML = '';
  if (done) {
    const add = (txt, fn) => { const b = el('button', 'secondary', txt); b.onclick = fn; $('#result-actions').append(b); return b; };
    if (battle?.ended) add('▶ ' + T.replay, watchReplay);
    if (battle?.ended && !PRACTICE) {
      const b = add(T.shareReplay, async () => {
        // En el móvil, el menú de compartir del sistema (WhatsApp, Discord…); en el ordenador, copiar el enlace.
        try {
          if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({title: 'Redle', url: replayLink()});
          else { await navigator.clipboard.writeText(replayLink()); b.textContent = T.replayCopied; }
        } catch {}
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
  box.innerHTML = '<i class="sk sk-line"></i><i class="sk sk-line short"></i>'; // esqueleto mientras responde Supabase
  const [all, rank, top, wins] = await Promise.all([dailyStats(TODAY), dailyRank(myResult()), dailyTop(TODAY, MODE), LIGA ? null : dailyWins(TODAY, MODE)]);
  const g = all?.[MODE];
  if (!g || !g.players) { box.innerHTML = ''; return; }
  const pct = n => Math.round(100 * n / g.players);
  if (LIGA) {
    const mine = day().reached, worse = g.reached.slice(0, mine).reduce((a, b) => a + b, 0);
    box.innerHTML = `<h3>${itemIcon('Poke Ball')} ${T.globalTitle}</h3><p>${T.globalPlayers(g.players)} · ${T.globalChampions(g.wins, pct(g.wins))}</p>
      <div class="dist">${g.reached.map((n, i) => `<div class="${i === mine ? 'me' : ''}"><i style="height:${Math.max(4, pct(n))}%"></i><span>${i}/5</span></div>`).join('')}</div>
      <p>${T.globalBetter(pct(worse))}</p>`;
  } else {
    box.innerHTML = `<h3>${itemIcon('Poke Ball')} ${T.globalTitle}</h3><p>${T.globalPlayers(g.players)} · ${T.globalWins(pct(g.wins))}${g.avgTurns ? ` · ${T.globalTurns(g.avgTurns)}` : ''}</p>`;
  }
  if (rank) box.insertAdjacentHTML('beforeend', `<p class="rank">${T.rankLine(rank.pos, rank.total)}</p>`);
  if (Array.isArray(top) && top.length) box.insertAdjacentHTML('beforeend', `<h4>${T.topTitle}</h4><ol class="top">${top.map(r =>
    `<li class="${r.me ? 'me' : ''}"><span>${r.nickname ? esc(r.nickname) : T.anon}</span><em>${LIGA ? `${r.reached ?? 0}/5` : r.won ? T.topTurns(r.turns) : T.topKos(r.kos ?? 0)}</em></li>`).join('')}</ol>`);
  // Victorias de hoy con su repetición (ya has jugado tu intento, así que no hay spoilers).
  const valid = (wins || []).filter(w => /^[\w-]{1,6000}$/.test(w.replay || ''));
  if (valid.length) box.insertAdjacentHTML('beforeend', `<h4>${T.winsTitle}</h4><ul class="wins">${valid.map(w =>
    `<li><span>${w.nickname ? esc(w.nickname) : T.anon}</span><em>${T.topTurns(w.turns)}</em><a class="watch" href="?vs=${MODE}#r=${w.replay}" target="_blank" rel="noopener">▶ ${T.watch}</a></li>`).join('')}</ul>`);
}

// ---------- medallas, tarjeta de entrenador, apodo, código de entrenador y sugerencias ----------
const esc = t => String(t).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const MODES = [...Object.keys(BOSSES), 'liga'];
const STREAK_MEDALS = [[7, 'Poke Ball'], [30, 'Ultra Ball'], [100, 'Master Ball']]; // racha de días: Poké, Ultra y Master Ball
const medals = () => readJSON('redle:medals');
function award(id) {
  const m = medals();
  if (!m[id]) { m[id] = TODAY; ls.set('redle:medals', JSON.stringify(m)); }
}
// Medallas de lo ganado antes de que existieran (en el historial guardado de cada modo y la mejor racha).
for (const id of MODES) if (Object.values(readJSON(keyOf(id)).days || {}).some(d => d.result === 'win')) award(id);
for (const [n] of STREAK_MEDALS) if ((readJSON('redle:streak').best || 0) >= n) award('streak' + n);

// Una medalla por rival (su sprite en color si le has ganado alguna vez), la de Campeón de la Liga y las de racha.
function medalsHtml() {
  const m = medals();
  const list = [
    ...Object.values(BOSSES).map(b => [b.id, T.medalOf(b.name), `<img src="${trainerImg(b.id)}" alt="" width="40" height="40">`]),
    ['liga', T.medalLiga, itemIcon('Master Ball')],
    ...STREAK_MEDALS.map(([n, item]) => ['streak' + n, T.medalStreak(n), `${itemIcon(item)}<small>${n}</small>`]),
  ];
  const got = list.filter(([id]) => m[id]).length;
  return `<h3>${T.medalsTitle} <small>${got}/${list.length}</small></h3><div class="medal-row">${list.map(([id, title, inner]) =>
    `<span class="medal${m[id] ? ' got' : ''}" title="${title}" aria-label="${title}">${inner}</span>`).join('')}</div>`;
}

function trainerSummary() {
  const stores = MODES.map(id => readJSON(keyOf(id)));
  const sum = k => stores.reduce((a, st) => a + (st.stats?.[k] || 0), 0);
  const mvps = {};
  for (const st of stores) for (const d of Object.values(st.days || {})) if (d.mvp) mvps[d.mvp] = (mvps[d.mvp] || 0) + 1;
  const fav = Object.entries(mvps).sort((a, b) => b[1] - a[1])[0]?.[0];
  const m = medals(), total = Object.keys(BOSSES).length + 1 + STREAK_MEDALS.length;
  return {wins: sum('wins'), played: sum('played'), fav, medals: Object.keys(m).length, total, streak: playStreak().n, best: readJSON('redle:streak').best || 0};
}
function drawTrainer() {
  const t = trainerSummary(), nick = ls.get('redle:nick') || '';
  $('#trainer-card').innerHTML = `<div class="tc-head"><img src="${SD}sprites/trainers/ethan.png" alt="" width="64" height="64">
      <div><b>${nick ? esc(nick) : T.anon}</b><small>ID ${playerId().slice(0, 8).toUpperCase()}</small></div></div>
    <div class="stats">${[[t.played, T.cardPlayed], [t.wins, T.cardWins], [t.streak, T.cardStreak], [t.best, T.cardBest]].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>
    ${t.fav ? `<p class="tc-mvp">${T.cardMvp}: ${icon(t.fav)}<b>${t.fav}</b></p>` : ''}
    <div class="medals">${medalsHtml()}</div>`;
  $('#nick').value = nick;
  $('#nick-msg').textContent = T.nickHint;
  $('#my-code').textContent = playerId();
  $('#restore-code').value = '';
  $('#restore-msg').textContent = T.backupNote;
  $('#btn-share-card').textContent = T.shareCard;
  $('#btn-copy-code').textContent = T.copy;
}
$('#btn-trainer').onclick = () => { drawTrainer(); $('#dlg-trainer').showModal(); };
$('#btn-share-card').onclick = async () => {
  const t = trainerSummary(), text = `${T.cardShare(ls.get('redle:nick') || T.anon, t.medals, t.total, t.streak)}\n${location.origin}${location.pathname}`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({text});
    else { await navigator.clipboard.writeText(text); $('#btn-share-card').textContent = T.copied; }
  } catch {}
};

// Apodo para el top del día (mismas reglas que el servidor; el servidor filtra además insultos).
const NICK_RE = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]{3,16}$/;
$('#btn-nick').onclick = async () => {
  const nick = $('#nick').value.trim();
  if (nick && !NICK_RE.test(nick)) return ($('#nick-msg').textContent = T.nickHint);
  const ok = await setNickname(nick);
  if (ok) {
    if (nick) ls.set('redle:nick', nick); else try { localStorage.removeItem('redle:nick'); } catch {}
    backup();
    drawTrainer();
  }
  $('#nick-msg').textContent = ok === null ? T.offline : ok ? T.nickSaved : T.nickBad;
};

// Código de entrenador: copiarlo y recuperar con él el progreso guardado en el servidor.
$('#btn-copy-code').onclick = async () => { try { await navigator.clipboard.writeText(playerId()); $('#btn-copy-code').textContent = T.copied; } catch {} };
$('#btn-restore').onclick = async () => {
  const code = $('#restore-code').value.trim().toLowerCase(), msg = $('#restore-msg');
  if (!UUID_RE.test(code)) return (msg.textContent = T.restoreBad);
  if (code === playerId() || !confirm(T.restoreConfirm)) return;
  const {ok, data} = await loadProgress(code);
  if (!ok) return (msg.textContent = T.offline);
  if (!data?.stores) return (msg.textContent = T.restoreNone);
  try {
    for (const id of MODES) localStorage.removeItem(keyOf(id));
    for (const [id, st] of Object.entries(data.stores)) if (MODES.includes(id)) localStorage.setItem(keyOf(id), JSON.stringify(st));
    localStorage.setItem('redle:streak', JSON.stringify(data.streak || {}));
    localStorage.setItem('redle:medals', JSON.stringify(data.medals || {}));
    if (data.nick) localStorage.setItem('redle:nick', data.nick); else localStorage.removeItem('redle:nick');
    localStorage.setItem('redle:player', code);
  } catch {}
  location.reload();
};
// Copia que se sube al terminar cada reto: estadísticas, últimos 3 días de cada modo, rachas, medallas y apodo.
function backup() {
  if (PRACTICE || REPLAY) return;
  const stores = {};
  for (const id of MODES) {
    const st = readJSON(keyOf(id));
    if (!st.stats) continue;
    const days = Object.keys(st.days || {}).sort().slice(-3);
    stores[id] = {stats: st.stats, days: Object.fromEntries(days.map(k => [k, st.days[k]]))};
  }
  saveProgress({v: 1, stores, streak: readJSON('redle:streak'), medals: medals(), nick: ls.get('redle:nick') || ''});
}

// Novedades: lista de cambios con un punto rojo en el enlace hasta que se abre (se recuerda la última vista).
function drawNewsDot() { $('#btn-news .news-dot').hidden = (+ls.get('redle:news') || 0) >= NEWS[0].id; }
$('#btn-news').onclick = () => {
  const seen = +ls.get('redle:news') || 0;
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString(LANG, {day: 'numeric', month: 'long'});
  $('#news-list').innerHTML = NEWS.map(n => `<section class="${n.id > seen ? 'unseen' : ''}"><h3>${fmt(n.date)}${n.id > seen ? ` <em>${T.newsNew}</em>` : ''}</h3>
    <ul>${(LANG === 'es' ? n.es : n.en).map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('');
  ls.set('redle:news', NEWS[0].id);
  drawNewsDot();
  $('#dlg-news').showModal();
};
drawNewsDot();

// Sugerencias y fallos, con datos técnicos para poder reproducirlos.
let fbKind = 'idea';
document.querySelectorAll('#fb-kind button').forEach(b => (b.onclick = () => {
  fbKind = b.dataset.v;
  document.querySelectorAll('#fb-kind button').forEach(x => x.classList.toggle('on', x === b));
}));
$('#btn-feedback').onclick = () => { $('#fb-status').textContent = ''; $('#dlg-feedback').showModal(); };
$('#btn-fb-send').onclick = async () => {
  const message = $('#fb-msg').value.trim(), b = $('#btn-fb-send');
  if (message.length < 3) return ($('#fb-status').textContent = T.fbShort);
  b.disabled = true;
  const ok = await sendFeedback({kind: fbKind, message, contact: $('#fb-contact').value.trim(),
    context: {mode: MODE, day: DATE, lang: LANG, turn: battle?.turn ?? null, w: innerWidth, h: innerHeight, ua: navigator.userAgent.slice(0, 200)}});
  b.disabled = false;
  $('#fb-status').textContent = ok ? T.fbThanks : T.fbError;
  if (ok) $('#fb-msg').value = '';
};

$('#btn-share').onclick = async () => {
  const text = shareText();
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({text});
    else { await navigator.clipboard.writeText(text); $('#btn-share').textContent = T.copied; }
  } catch {}
};

// Pestaña o app abierta desde ayer: al cambiar el día, recargar para el reto nuevo (nunca a mitad de combate).
const newDay = () => today() !== TODAY && !PRACTICE && !REPLAY && (!battle || battle.ended);
document.addEventListener('visibilitychange', () => { if (!document.hidden && newDay()) location.reload(); });
function tickCountdown() {
  if (newDay()) return location.reload();
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
  document.querySelectorAll('.seg[data-set]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === current[seg.dataset.set]())));
  $('#btn-mute').classList.toggle('off', !(audio.music || audio.sfx));
}
document.querySelectorAll('.seg[data-set] button').forEach(b => (b.onclick = () => { apply[b.parentElement.dataset.set](b.dataset.v); sfx('click'); drawSettings(); }));
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
$('#btn-wipe').onclick = async () => {
  if (!confirm(T.wipeConfirm)) return;
  await Promise.race([deleteMyData(), sleep(4000)]); // también en el servidor (sin esperar para siempre)
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
document.querySelectorAll('img').forEach(im => { if (im.complete) im.classList.add('ok'); }); // las que llegaron antes
// Las descripciones llegan aparte: si ya hay botones de ataque en pantalla, se repintan con ellas.
loadMoveDescs().then(() => { if (battle && !busy && !battle.ended && !REPLAY) drawControls(); }).catch(() => {});

if (REPLAY || rec().started) startBattle(false);
else renderDraft();
