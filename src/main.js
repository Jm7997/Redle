// Interfaz: rivales diarios, Liga, vista previa de equipos, combate animado a partir del log de Showdown,
// resultado, repeticiones compartibles y ajustes.
import {Dex} from '@pkmn/sim';
import {Sprites, Icons} from '@pkmn/img';
import {today, msToNext, dayNumber, dailyPool, leaguePool, leagueLineup, ruleFor, battleGimmicks, teamOf, BOSSES, LEAGUE, DOUBLES, duoOf, nextSunday, doublesOpen, poolOf, pokedexList, play, replay, typeMultiplier} from './game.js';
import {SEASONS, seasonOf, seasonDaysLeft} from './seasons.js';
import {T, LANG, setLang, setBoss, ruleHtml, typeName, moveName, itemName, abilityName, moveDesc, loadMoveDescs, itemIcon, FIELD_ICON, FIELD_INFO, RULE_TEXT, RULE_ICON} from './i18n.js';
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
// Los dobles toman el escenario del primer entrenador y la música de los dos, con el color del evento.
const duoStage = ({trainers: [a, b]}) => ({...STAGES[a], era: 'ani', emoji: STAGES[a].emoji + STAGES[b].emoji,
  music: [...new Set([...STAGES[a].music, ...STAGES[b].music])], colors: ['#6b3fc4', '#2a1763', '#d9c2fb', '#5c36a8', '#241353']});
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
// Una elección por Pokémon en el campo (en dobles van dos, separadas por "+"): m1, m1t, m12, m1-2 (ataque a un objetivo), s3, p.
const packOne = c => c === 'default' ? 'd' : c === 'forfeit' ? 'f' : c === 'pass' ? 'p' : c[0] + c.split(' ')[1] + (GIMMICK_TOKEN[c.split(' ')[2]] || c.split(' ')[2] || '');
const packChoices = cs => cs.map(c => c.split(', ').map(packOne).join('+')).join('.');
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
    if (mode !== 'liga' && mode !== DOUBLES.id && !BOSSES[mode]) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > TODAY) return null; // nunca combates de días futuros
    if (round < 0 || round >= LEAGUE.rounds || (mode !== 'liga' && round)) return null;
    if (!Array.isArray(picks) || [...picks].sort().join() !== '0,1,2,3,4,5') return null;
    if (tokens.length > 1000 || !tokens.every(t => /^(m[1-4][tmx]?|m[1-4]-?[12]|s[1-6]|p|d|f)(\+(m[1-4]-?[12]?|s[1-6]|p))?$/.test(t))) return null;
    const fromToken = Object.fromEntries(Object.entries(GIMMICK_TOKEN).map(([k, v]) => [v, ' ' + k]));
    const unpack = t => t === 'd' ? 'default' : t === 'f' ? 'forfeit' : t === 'p' ? 'pass' : (t[0] === 'm' ? 'move ' : 'switch ') + t[1] + (fromToken[t[2]] || (t.length > 2 ? ' ' + t.slice(2) : ''));
    const choices = tokens.map(t => t.split('+').map(unpack).join(', '));
    const attempt = raw.a | 0 || 1;
    if (attempt < 1 || attempt > 3 || mode === 'liga' && attempt > 1) return null;
    return {mode, date, round, attempt, picks: picks.map(Number), choices};
  } catch { return null; }
}
const REPLAY = parseReplay(location.hash);

// ---------- modo, almacenamiento y práctica ----------
const MODE = REPLAY ? REPLAY.mode : params.get('vs') === 'liga' || params.get('vs') === DOUBLES.id ? params.get('vs') : BOSSES[params.get('vs')] ? params.get('vs') : 'red';
const LIGA = MODE === 'liga', DOUBLE = MODE === DOUBLES.id;
// Los dobles solo se juegan los domingos: el resto de la semana su pestaña enseña quién viene.
const LOCKED = DOUBLE && !REPLAY && !doublesOpen(TODAY);
const KEY = keyOf(MODE);
// Datos guardados dañados no deben dejar la página en blanco: se ignoran.
const readJSON = k => { try { return JSON.parse(ls.get(k) || '{}') || {}; } catch { return {}; } };
const store = Object.assign({stats: {played: 0, wins: 0, streak: 0, best: 0, bestRound: 0, last: null}, days: {}}, readJSON(KEY));

// Modo práctica (?practica=semilla&equipo=hoy|semilla): no se guarda ni cuenta para las estadísticas.
// Solo tras jugar el reto: si perdiste, con el mismo equipo del día; si ganaste, también con equipos aleatorios.
const dailyResult = store.days[TODAY]?.closed ? store.days[TODAY].result : null; // hecho = ganado o sin intentos
const PRACTICE = !REPLAY && dailyResult ? params.get('practica') : null;
const TEAM = PRACTICE && dailyResult === 'win' ? params.get('equipo') || 'hoy' : 'hoy';
const POOL_DATE = REPLAY ? REPLAY.date : TEAM === 'hoy' ? TODAY : 'equipo-' + TEAM;
const RULE_DATE = REPLAY ? REPLAY.date : TODAY; // la práctica conserva la regla del día
// En dobles la clave de práctica lleva la fecha: de ella sale la dupla del domingo.
const DATE = REPLAY ? REPLAY.date : PRACTICE ? `practica-${PRACTICE}${DOUBLE ? '-' + TODAY : ''}` : TODAY;
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
// Intentos por día contra un rival (desde el 24-10-2026): 3, como en Wordle; gana el intento en que ganes. La Liga,
// uno (ya son 5 combates seguidos). Cada intento tiene su propia semilla, para que no se repita todo igual.
const TRIES_FROM = '2026-10-24';
const maxTries = () => REPLAY || PRACTICE || LIGA || DATE < TRIES_FROM ? 1 : 3;
const attempt = () => REPLAY ? REPLAY.attempt : LIGA ? 1 : day().attempt || 1;
const battleKey = () => LIGA ? `liga${round()}:${DATE}` : attempt() > 1 ? `${DATE}~${attempt()}` : DATE;

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
  const duo = id === DOUBLES.id ? duoOf(PRACTICE ? DATE : RULE_DATE) : null;
  OPP = id; B = duo ? {...DOUBLES, ...duo, duo: duo.id} : {...BOSSES[id], team: teamOf(id, PRACTICE ? DATE : RULE_DATE)};
  STAGE = duo ? duoStage(duo) : STAGES[id]; RULE = ruleFor(RULE_DATE, id); GIMMICKS = battleGimmicks(LIGA ? 'liga' : '', id);
  setBoss(id, B.name, B.team.map(s => s.species).join(', '), LIGA ? LEAGUE.gens : B.gens, maxTries(), B.duo);
  const body = document.body;
  body.className = body.className.replace(/\bboss-\w+/g, '').trim();
  body.classList.add('boss-' + id);
  body.classList.toggle('stage-g6', STAGE.bg.includes('gen6bgs'));
  for (const [i, v] of ['--dex', '--dex-dark', '--slot-a', '--slot-b', '--slot-edge'].entries()) {
    if (STAGE.colors) body.style.setProperty(v, STAGE.colors[i]); else body.style.removeProperty(v);
  }
  // En dobles salen los dos entrenadores; en el resto, el segundo sprite se queda oculto.
  const faces = (B.trainers || [id]).map(t => (STAGES[t] || STAGE).sprite);
  document.querySelectorAll('.boss-sprite').forEach(im => {
    const face = faces[im.classList.contains('second') ? 1 : 0];
    im.hidden = !face;
    if (face) { im.src = `${SD}sprites/trainers/${face}.png`; im.alt = B.name; }
  });
  document.querySelectorAll('.boss-name').forEach(e => (e.textContent = B.name));
  loadArenaBg(STAGE.bg);
  document.querySelectorAll('[data-i18n]').forEach(e => (e.innerHTML = T[e.dataset.i18n]));
  $('#how').innerHTML = T.how.filter(Boolean).map(h => `<li>${h}</li>`).join('');
}
setOpponent(LINEUP[round()]);
document.documentElement.lang = LANG;
if (LIGA) document.body.classList.add('mode-liga');
if (DOUBLE) $('.arena').classList.add('doubles');

const SEASON = seasonOf(TODAY);

// Selector de modo: los 8 rivales y la Liga, con el estado del reto de hoy de cada uno.
const markOf = id => {
  const d = readJSON(keyOf(id)).days?.[TODAY];
  return id === 'liga' && d?.result ? (d.result === 'win' ? itemIcon('Poke Ball') : `${d.reached}/5`) : d?.result === 'win' ? itemIcon('Poke Ball') : d?.result === 'loss' ? (d.closed ? '✗' : `${d.attempt || 1}/3`) : '';
};
const SUNDAY = doublesOpen(TODAY), NEXT_DUO = duoOf(TODAY);
const duoTab = {id: DOUBLES.id, name: T.doublesTab, sprites: NEXT_DUO.trainers.map(t => `${SD}sprites/trainers/${STAGES[t].sprite}.png`)};
const tabs = [...Object.values(BOSSES).map(b => ({id: b.id, name: b.name, img: `${SD}sprites/trainers/${STAGES[b.id].sprite}.png`})), {id: 'liga', name: T.league, img: ''}];
tabs.splice(SUNDAY ? 0 : tabs.length, 0, duoTab); // el domingo, la primera
$('#bosses').innerHTML = tabs.map(b =>
  `<a href="?vs=${b.id}" class="boss-tab ${b.id}${b.id === MODE ? ' on' : ''}${b.sprites && SUNDAY ? ' live' : ''}">${b.sprites ? `<span class="duo-faces">${b.sprites.map(u => `<img src="${u}" alt="" width="40" height="40">`).join('')}</span>` : b.img ? `<img src="${b.img}" alt="" width="40" height="40">` : `<span class="liga-icon">${itemIcon('Master Ball')}</span>`}
    <span><b>${b.name}</b><small>${b.sprites ? (SUNDAY ? T.doublesToday : T.doublesSoon) : b.id === MODE ? (LIGA ? T.leagueWhere : T.where) : ''}</small></span><i>${markOf(b.id)}</i></a>`).join('');
// Aviso del domingo en las demás pestañas (solo en la pantalla de equipo, no a mitad de combate).
function showBanner() { return !DOUBLE && !REPLAY && !PRACTICE; }
{
  const banner = $('#sunday-banner'), name = NEXT_DUO.name;
  banner.hidden = !showBanner();
  banner.href = `?vs=${DOUBLES.id}`;
  banner.innerHTML = `<span class="duo-faces">${duoTab.sprites.map(u => `<img src="${u}" alt="" width="40" height="40">`).join('')}</span><span>${SUNDAY ? T.sundayToday(name) : T.sundayNext(name)}</span>`;
  banner.classList.toggle('live', SUNDAY);
}
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
const trainerImg = id => `${SD}sprites/trainers/${(STAGES[id] || STAGES[B.trainers[0]]).sprite}.png`;

// ---------- fondo con Pokémon ----------
function backgroundMons() {
  const box = $('#bg-mons');
  const pick = SEASON ? SEASON.mons : [...POOL.map(s => s.species), ...B.team.map(s => s.species)];
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
    ${set.trainer ? `<img class="set-trainer" src="${trainerImg(set.trainer)}" alt="${BOSSES[set.trainer].name}" title="${BOSSES[set.trainer].name}">` : ''}
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

// Los días que no son domingo: quién viene y qué se traen entre manos.
function renderTeaser() {
  $('#draft').hidden = true;
  $('#battle').hidden = true;
  const days = Math.round((Date.parse(nextSunday(TODAY)) - Date.parse(TODAY)) / 864e5);
  const box = $('#sunday');
  box.hidden = false;
  box.innerHTML = `<h2>${T.sundayTitle}</h2>
    <div class="duo-vs">${B.trainers.map((t, i) => `<figure style="--i:${i}"><img src="${trainerImg(t)}" alt="" width="128" height="128"><figcaption>${BOSSES[t].name}</figcaption></figure>`).join('<span class="vs">&amp;</span>')}</div>
    <p class="duo-name">${T.duoName[B.duo]}</p><p>${T.duoIdea[B.duo]}</p>
    <p class="duo-when">${T.sundayIn(days)}</p>
    <ul class="duo-rules">${T.sundayRules.map(r => `<li>${r}</li>`).join('')}</ul>
    <a class="primary duo-back" href="?vs=red">${T.sundayBack}</a>`;
}

function renderDraft() {
  const r = rec();
  $('#sunday-banner').hidden = !showBanner();
  $('#season').hidden = !SEASON || !!REPLAY;
  $('#draft').hidden = false;
  $('#battle').hidden = true;
  drawLineup();
  $('.intro-text').innerHTML = LIGA ? T.leagueLead(round() + 1, B.name) : T.lead;
  $('#pool').replaceChildren(...POOL.map((set, i) => {
    const s = slot(set, 'button');
    const leads = r.picks.slice(0, DOUBLE ? 2 : 1);
    if (leads.includes(i)) { s.classList.add('lead'); s.append(el('span', 'ribbon', T.leadTag)); }
    // En dobles salen dos: el nuevo sustituye al que lleva más tiempo elegido.
    s.onclick = () => {
      sfx('click');
      if (leads.includes(i)) return;
      const first = DOUBLE ? [leads[1], i] : [i];
      r.picks = [...first, ...POOL.map((_, j) => j).filter(j => !first.includes(j))];
      renderDraft();
    };
    return s;
  }));
  $('#red-team').replaceChildren(...B.team.map(set => slot(set, 'div')));
  $('#stage-rules').innerHTML = [ruleHtml(RULE), T.stageRules].filter(Boolean).join('<br>');
  $('#rules').hidden = !$('#stage-rules').innerHTML;
  // Aviso de entrenamiento: tu equipo al azar (Brazal Recio) frente al rival entrenado al máximo (Brazal Firme).
  $('#train-you').innerHTML = `${itemIcon('Power Bracer')}<span><b>${T.trainYou}</b><small>${POOL_DATE >= '2026-10-30' ? T.trainYouTipHalf : POOL_DATE >= '2026-10-24' ? T.trainYouTipFull : POOL_DATE >= '2026-10-18' ? T.trainYouTipIV : T.trainYouTip}</small></span>`;
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
// Posiciones en el campo: en individuales, una por lado (p1, p2); en dobles, dos (p1a, p1b, p2a, p2b).
// `off` recoge lo que le pasa a un Pokémon que no está en el campo (en dobles el log no le da hueco).
const POS = DOUBLE ? ['p1a', 'p1b', 'p2a', 'p2b'] : ['p1', 'p2'];
const posOf = id => !DOUBLE ? id.slice(0, 2) : id[2] === ':' ? 'off' : id.slice(0, 3);
const freshView = () => ({...Object.fromEntries(POS.map(p => [p, fresh()])), off: fresh(), fainted: {p1: [], p2: []}, seen: {}, eff: null, weather: '', field: [], side: {p1: {}, p2: {}}, tera: {p1: {}, p2: {}}});
const view = freshView();
const team = () => rec().picks.map(i => POOL[i]);
const slotSel = pos => `.${pos[1] === '1' ? 'me' : 'foe'}${pos[2] === 'b' ? '.b' : ':not(.b)'}`;
const img = pos => $(`.mon${slotSel(pos)}`);
const opposite = pos => POS.find(p => p[1] !== pos[1] && view[p].hp > 0) || POS.find(p => p[1] !== pos[1]);
const wait = ms => sleep(ms / speed);
const seenOf = species => (view.seen[species] ||= {moves: new Set()});
// Lista de pistas del rival: empieza por una distinta cada día (y en cada ronda de la Liga) y al acabar una suena la siguiente.
const playBattleMusic = () => playMusic(STAGE.music, DAY + round());

// Deja el escenario como nuevo (siguiente ronda de la Liga o repetición).
function resetView() {
  logIdx = 0;
  Object.assign(view, freshView());
  drawWeather(); drawSide('p1'); drawSide('p2');
  for (const pos of POS) { const im = img(pos); im.classList.remove('faint', 'enter', 'acting', 'under'); im.removeAttribute('src'); delete im.dataset.species; }
  if (DOUBLE) document.querySelectorAll('.hud').forEach(h => { h.hidden = true; });
  $('#log').innerHTML = $('#msg').innerHTML = '';
  $('#moves').innerHTML = $('#switches').innerHTML = $('#prompt').textContent = '';
}

async function startBattle(isNew) {
  const r = rec();
  $('#sunday-banner').hidden = $('#season').hidden = true;
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
    const rule = RULE_TEXT[RULE] ? [RULE_ICON[RULE], RULE_TEXT[RULE][0]] : B.weather === 'hail' ? [FIELD_ICON.Hail, FIELD_INFO.Hail[0]] : null;
    $('#intro .intro-rule').hidden = !rule;
    if (rule) $('#intro .intro-rule').innerHTML = `${itemIcon(rule[0])}<span>${T.todayRule}: <b>${rule[1]}</b></span>`;
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
  if (!play(battle, choice)) return drawControls();
  gimmickOn = '';
  $('.forfeit-btn')?.remove();
  rec().choices.push(choice); // se guarda antes de animar: recargar no da otro intento
  save();
  await consume(true);
}

// Tocar el escenario o la caja de texto salta lo que queda de animación del turno.
let skipping = false;
for (const s of ['.arena', '.textbox']) $(s).addEventListener('click', e => { if (busy && !e.target.closest('.hud, .weather-badge')) skipping = true; });

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
  document.querySelector('.mon.acting')?.classList.remove('acting');
  const lines = battle.log.slice(logIdx);
  logIdx = battle.log.length;
  if (!await runLines(lines, animate)) { const t = seek; seek = null; busy = false; return seekTo(t); }
  POS.forEach(p => drawHud(p));
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
  const side = a.slice(0, 2), pos = posOf(a), cls = side === 'p1' ? 'me' : side === 'p2' ? 'foe' : '';
  // Cartel del objeto o la habilidad que provoca el efecto.
  const item = fromTag(tags, 'item'), ability = fromTag(tags, 'ability');
  if ((item || ability) && cls) {
    if (side === 'p2' && view[pos].species) Object.assign(seenOf(view[pos].species), item ? {item} : {ability});
    if (animate) popup(cls, item ? `${itemIcon(item)}${itemName(item)}` : `<small>${parseId(a).name}</small>${abilityName(ability)}`);
  }
  switch (cmd) {
    case 'switch': case 'drag': {
      const {name} = parseId(a);
      const [species, ...details] = b.split(', ');
      Object.assign(view[pos], fresh(), {name, species, gender: details.find(d => d === 'M' || d === 'F') || '', level: +(details.find(d => /^L\d+$/.test(d)) || 'L100').slice(1)});
      if (side === 'p2') seenOf(species);
      const im = img(pos);
      im.classList.remove('faint', 'enter', 'under');
      const owner = B.trainers && side === 'p2' ? BOSSES[B.team.find(t => t.species === species || t.name === name)?.trainer]?.name : null; // en dobles, quién lo saca
      await say(side === 'p1' ? T.go1(`<b>${name}</b>`) : owner ? T.sentBy(owner, `<b>${name}</b>`) : T.redSends(`<b>${name}</b>`), false, cls);
      if (animate) {
        im.style.visibility = 'hidden';
        setHp(pos, c, false);
        sfx('switch');
        await throwBall(im, side === 'p2');
        im.style.visibility = '';
        void im.offsetWidth; im.classList.add('enter');
        im.addEventListener('animationend', () => im.classList.remove('enter'), {once: true});
        await cry(cryId(species));
        await wait(700);
      } else setHp(pos, c, false);
      // Con su último Pokémon, el rival dice algo (una vez por combate; en dobles, cuando ya no le queda banquillo).
      if (side === 'p2' && !view.lastWord && view.fainted.p2.length === B.team.length - POS.length / 2) {
        view.lastWord = true;
        const line = T.lastWord[B.duo ? 'dobles' : OPP];
        if (line) await say(line, animate, 'foe');
      }
      return;
    }
    case 'move': {
      const target = c.startsWith('p') ? posOf(c) : opposite(pos);
      // Ataques a varios a la vez: el log trae todos los objetivos ([spread] p2a,p2b).
      const spread = (tags.match(/\[spread\] ([^|]*)/)?.[1] || '').split(',').filter(p => DOUBLE && POS.includes(p));
      if (side === 'p2') seenOf(view[pos].species).moves.add(b);
      img(pos).classList.remove('under'); // vuelve de Vuelo, Excavar…
      view.lastMove = {side, pos, move: b};
      await say(T.uses(who(a), `<i>${moveName(b)}</i>`), animate, cls);
      if (animate && !tags.includes('[still]') && !tags.includes('[miss]')) {
        sfx('attack', dex.moves.get(b).type);
        await Promise.all((spread.length ? spread : [target]).map(t => animateMove(b, img(pos), img(t))));
      }
      return;
    }
    case '-heal':
      if (tags.includes('Revival Blessing')) {
        const {name} = parseId(a), i = view.fainted[side].indexOf(name);
        if (i >= 0) view.fainted[side].splice(i, 1);
        drawHud(pos);
        if (animate) { sfx('heal'); flash('#fff6c2', 500); }
        return say(T.revived(side === 'p1' ? `<b>${name}</b>` : `<b>${T.foe(name)}</b>`), animate, cls);
      }
      // falls through
    case '-damage': case '-sethp': {
      const {delta, pct, dur} = setHp(pos, b, animate);
      if (!delta || tags.includes('[silent]')) return;
      if (animate) {
        const heal = delta > 0;
        floatText(img(pos), side === 'p1' ? `${heal ? '+' : '−'}${Math.abs(delta)}` : `${heal ? '+' : '−'}${pct}%`, heal);
        if (heal) { sfx('heal'); sparkle(center(img(pos))); }
        else if (!tags.includes('[from]')) {
          sfx(view.eff === 'super' ? 'super' : view.eff === 'weak' ? 'weak' : 'hit');
          const im = img(pos); im.classList.remove('hit'); void im.offsetWidth; im.classList.add('hit');
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
      const types = view.tera[side][view[pos].name] ? [view.tera[side][view[pos].name]] : view[pos].types || dex.species.get(view[pos].species).types;
      if (mv?.category === 'Status' && lm.side !== side && battle?.[lm.side]?.active.some(p => p?.ability === 'prankster') && types.includes('Dark'))
        return say(T.pranksterDark(who(a)), animate);
      // Decir por qué, como en los juegos nuevos: por su habilidad (Levitación, Absorbe Agua…) o por su tipo.
      const ability = fromTag(tags, 'ability');
      if (ability) return say(T.abilityImmune(who(a), abilityName(ability)), animate);
      const immuneType = mv && lm.side !== side && types.find(t => !dex.getImmunity(mv.type, [t]));
      if (immuneType) return say(T.typeImmune(who(a), typeName(immuneType), typeName(mv.type)), animate);
      return say(T.immune(who(a)), animate);
    }
    case '-crit': if (animate) { sfx('crit'); flash('#fff', 200); } return say(T.crit, animate, 'eff');
    case '-miss': if (animate) sfx('miss'); return say(T.miss(who(b || a)), animate);
    case '-fail': // Cuerpo Puro, Foco Interno ante Intimidación…: decir por qué no bajan sus características
      if (b === 'unboost') return say(ability ? T.noDropBy(who(a), abilityName(ability)) : T.noDrop(who(a)), animate, cls);
      return say(T.fail, animate);
    case '-hitcount': return say(T.hitcount(b), animate);
    case 'faint': {
      view.fainted[side].push(parseId(a).name);
      view[pos].hp = 0;
      if (animate) { cry(cryId(view[pos].species), true); await wait(500); sfx('faint'); }
      img(pos).classList.add('faint');
      drawHud(pos);
      return say(T.faint(who(a)), animate, cls);
    }
    case '-status':
      view[pos].status = b;
      drawHud(pos);
      if (animate) { sfx('status'); flash({brn: '#ff7a1a', par: '#ffe03a', frz: '#8ee8ff', slp: '#9aa0c0'}[b] || '#b04fe0', 240); }
      return say((T.st[b] || T.st.psn)(who(a)), animate, cls);
    case '-curestatus':
      view[pos].status = '';
      drawHud(pos);
      if (animate) sfx('heal');
      return say((T.cure[b] || T.cure._)(who(a)), animate, cls);
    case 'cant': return say((T.cant[b.replace(/^(ability|move): /, '')] || T.cant._)(who(a)), animate, cls);
    case '-boost': case '-unboost': {
      const up = cmd === '-boost', n = +c || 0, boosts = view[pos].boosts;
      boosts[b] = Math.max(-6, Math.min(6, (boosts[b] || 0) + (up ? n : -n)));
      drawHud(pos);
      if (!n) return say(T.nothing, animate);
      if (animate) { sfx(up ? 'boost' : 'drop'); statFx(img(pos), up); }
      return say((up ? T.boost : T.unboost)(who(a), T.stat[b] || b, n), animate, cls);
    }
    case '-setboost': { // Tambor y similares fijan la característica de golpe (Tambor: Ataque al +6)
      view[pos].boosts[b] = +c || 0;
      drawHud(pos);
      if (animate) { sfx('boost'); statFx(img(pos), true); }
      return say(+c >= 6 ? T.maxedStat(who(a), T.stat[b] || b) : T.boost(who(a), T.stat[b] || b, +c), animate, cls);
    }
    case '-clearallboost': for (const p of POS) { view[p].boosts = {}; drawHud(p); } return say(T.clearBoosts, animate);
    case '-clearboost': view[pos].boosts = {}; drawHud(pos); return;
    case '-clearnegativeboost': // Hierba Blanca: quita solo las bajadas (el combate ya las quitaba; faltaba en el marcador)
      for (const k in view[pos].boosts) if (view[pos].boosts[k] < 0) delete view[pos].boosts[k];
      drawHud(pos); return;
    case '-enditem':
      if (side === 'p2') seenOf(view[pos].species).item = b;
      if (animate) { popup(cls, `${itemIcon(b)}${itemName(b)}`); sfx('item'); }
      return say((tags.includes('[eat]') ? T.ate : T.usedItem)(who(a), itemName(b)), animate, cls);
    case '-item': { // un Pokémon consigue o enseña un objeto: Cosecha, Reciclaje, Truco, Ladrón, Recogida, Cacheo, Globo Helio
      if (side === 'p2') seenOf(view[pos].species).item = b;
      if (animate) { popup(cls, `${itemIcon(b)}${itemName(b)}`); sfx('item'); }
      const item = itemName(b), from = fromTag(tags, 'ability') || fromTag(tags, 'move') || '';
      const of = tags.match(/\[of\] (p[12]a?: [^|]+)/)?.[1];
      if (from === 'Frisk' && of) return say(T.frisk(who(of), who(a), item), animate, cls);
      const msg = {Harvest: T.harvest, Recycle: T.recycled, Pickup: T.pickedUp, Thief: T.stole, Covet: T.stole}[from]
        || (b === 'Air Balloon' && !from ? T.balloon : T.obtained);
      return say(msg(who(a), item), animate, cls);
    }
    case '-ability':
      if (side === 'p2') seenOf(view[pos].species).ability = b;
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
    case '-prepare': // primer turno de Rayo Solar, Vuelo, Excavar… Los que se esconden desaparecen del campo.
      if (/^(Fly|Bounce|Dig|Dive|Phantom Force|Shadow Force)$/.test(b)) img(pos).classList.add('under');
      return say((T.prepareMove[b] || T.prepare)(who(a)), animate, cls);
    case '-anim': // el golpe del segundo turno
      if (animate) { sfx('attack', dex.moves.get(b).type); await animateMove(b, img(pos), img(c.startsWith('p') ? posOf(c) : opposite(pos))); }
      return;
    case 'replace': { // se rompe Ilusión: aparece el Pokémon de verdad
      Object.assign(view[pos], {name: parseId(a).name, species: b.split(', ')[0], types: null});
      drawHud(pos);
      if (animate) { sfx('switch'); flash('#b04fe0', 300); }
      return say(T.illusionEnd(who(a)), animate, cls);
    }
    case '-singleturn': // Protección y sus variantes: burbuja alrededor del Pokémon
      if (/Follow Me|Rage Powder|Spotlight/.test(b)) { if (animate) sfx('item'); return say(T.redirect(who(a)), animate, cls); }
      if (b.includes('Helping Hand')) { if (animate) sfx('boost'); return say(T.helpingHand(who(a)), animate, cls); }
      if (b.includes('Wide Guard') || b.includes('Quick Guard')) { if (animate) shield(pos); return say(T.guardTeam(who(a)), animate, cls); }
      if (!/Protect|Detect|Shield|Bunker|Silk Trap|Bulwark|Obstruct|Max Guard/.test(b)) return null;
      if (animate) shield(pos);
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
    case 'swap': { // Cambio Banda de los compañeros (Intercambio): se cambian de sitio
      if (!DOUBLE) return;
      [view[side + 'a'], view[side + 'b']] = [view[side + 'b'], view[side + 'a']];
      drawHud(side + 'a'); drawHud(side + 'b');
      return say(T.swapped(who(a)), animate, cls);
    }
    case '-formechange': // Aegislash con Cambio Táctico, Mimikyu, Cramorant…
      view[pos].species = b;
      drawHud(pos);
      return;
    case 'detailschange': { // forma nueva (Megaevolución)
      view[pos].species = b.split(', ')[0];
      drawHud(pos);
      return;
    }
    case '-mega':
      if (animate) {
        sfx('boost'); flash('#ffffff', 450);
        img(pos).animate([{filter: 'brightness(4) saturate(0)'}, {filter: 'brightness(4) saturate(0)', offset: 0.3}, {filter: 'none'}], {duration: 1300 / speed});
      }
      return say(T.megaEvolved(who(a), dex.species.get(view[pos].species).name), animate, cls);
    case '-terastallize': {
      view.tera[side][parseId(a).name] = b;
      drawHud(pos);
      if (animate) {
        sfx('boost');
        flash('#ffffff', 300);
        img(pos).animate([{filter: 'none'}, {filter: 'brightness(2.2) saturate(1.6) drop-shadow(0 0 16px #9ff3ff)', offset: 0.4}, {filter: 'drop-shadow(0 0 6px #9ff3ff)'}], {duration: 1200 / speed});
      }
      return say(T.terastallized(who(a), typeName(b)), animate, cls);
    }
    case '-start':
      if (b === 'Dynamax') {
        Object.assign(view[pos], {dmax: true, gmax: c === 'Gmax'});
        drawHud(pos);
        if (animate) { sfx('boost'); flash('#ff2a6d', 600); }
        return say((c === 'Gmax' ? T.gigantamaxed : T.dynamaxed)(who(a)), animate, cls);
      }
      if (b.includes('Substitute')) { // el Pokémon se cambia por el muñeco del Sustituto
        view[pos].sub = true;
        await swapSprite(pos, animate);
        return say(T.sub(who(a)), animate, cls);
      }
      if (b === 'typechange') { // Líbero, Mutatipo, Empapar…
        view[pos].types = c.split('/');
        drawHud(pos);
        if (animate) sfx('item');
        return say(T.typeChange(who(a), view[pos].types.map(typeName).join('/')), animate, cls);
      }
      if (b === 'Disable') return say(T.disabled(who(a), moveName(c.replace('move: ', ''))), animate, cls);
      if (b.includes('Heal Block')) return say(T.healBlock(who(a)), animate, cls);
      if (b === 'Salt Cure') return say(T.saltCure(who(a)), animate, cls);
      if (b === 'Autotomize') return say(T.lighter(who(a)), animate, cls);
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
        Object.assign(view[pos], {dmax: false, gmax: false});
        drawHud(pos);
        return say(T.dynamaxEnd(who(a)), animate, cls);
      }
      if (b === 'confusion') return say(T.confusionEnd(who(a)), animate, cls);
      if (b.includes('Encore')) return say(T.encoreEnd(who(a)), animate, cls);
      if (b.includes('Taunt')) return say(T.tauntEnd(who(a)), animate, cls);
      if (b === 'Disable') return say(T.disableEnd(who(a)), animate, cls);
      if (b.includes('Heal Block')) return say(T.healBlockEnd(who(a)), animate, cls);
      if (/Future Sight|Doom Desire/.test(b)) { // el ataque llega: animación desde el otro lado y luego el daño (siguiente línea)
        const mv = b.replace('move: ', '');
        if (animate) await animateMove(mv, img(opposite(pos)), img(pos));
        return say(T.foresawHit(who(a), moveName(mv)), animate, cls);
      }
      if (b.includes('Substitute')) { // el muñeco se rompe y vuelve el Pokémon
        view[pos].sub = false;
        await swapSprite(pos, animate);
        return say(T.subEnd(who(a)), animate, cls);
      }
      return null;
    case '-activate':
      if (b.includes('confusion')) return say(T.confusedAct(who(a)), animate, cls);
      if (b.includes('Substitute')) { // el golpe se lo lleva el muñeco
        if (animate) { const im = img(pos); im.classList.remove('hit'); void im.offsetWidth; im.classList.add('hit'); sfx('hit'); }
        return say(T.subHit, animate);
      }
      if (/Protect|Detect|Shield|Bunker|Silk Trap|Bulwark|Obstruct|Max Guard|Wide Guard|Quick Guard/.test(b)) { if (animate) shield(pos); return say(T.protect(who(a)), animate, cls); }
      if (b === 'trapped') return say(T.trapped(who(a)), animate, cls);
      if (b.includes('Poltergeist')) return say(T.poltergeist(who(a), itemName(c)), animate, cls);
      if (/Heal Bell|Aromatherapy/.test(b)) { if (animate) sfx('heal'); return say(T.healBell, animate, cls); }
      if (b.startsWith('ability: ')) { // habilidades que saltan por su cuenta: Disfraz, Cara de Hielo, Momia…
        if (animate) { popup(cls, `<small>${parseId(a).name}</small>${abilityName(b.slice(9))}`); sfx('item'); }
        return b.includes('Disguise') ? say(T.disguise(who(a)), animate, cls) : b.includes('Ice Face') ? say(T.iceFace(who(a)), animate, cls) : null;
      }
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
  const hud = $(`.hud${slotSel(side)}`), bar = hud.querySelector('.bar i'), num = hud.querySelector('.hp');
  const paint = pct => {
    bar.style.width = pct + '%';
    bar.className = pct > 50 ? '' : pct > 20 ? 'mid' : 'low';
    num.textContent = side[1] === '1' ? `${Math.round(maxhp * pct / 100)}/${maxhp}` : Math.ceil(pct) + '%';
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
  $('.weather-badge').title = T.fieldHint;
}
// Al tocar el indicador: una ficha con lo que hace cada clima o efecto que hay ahora en el campo.
const fieldKey = id => (id === 'Snowscape' ? 'Snow' : id);
$('.weather-badge').onclick = e => {
  e.stopPropagation(); // no cuenta como "saltar animación"
  const ids = [view.weather, ...view.field].filter(id => id && FIELD_INFO[fieldKey(id)]);
  if (!ids.length) return;
  sfx('click');
  $('#field-list').innerHTML = ids.map(id => {
    const [name, text] = FIELD_INFO[fieldKey(id)];
    return `<section>${itemIcon(FIELD_ICON[id])}<div><b>${name}</b><p>${text}</p></div></section>`;
  }).join('');
  $('#dlg-field').showModal();
};

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

function drawHud(pos, dur = 0, fromHp) {
  const v = view[pos], side = pos.slice(0, 2), mine = side === 'p1', cls = mine ? 'me' : 'foe';
  if (!v?.species) return;
  const im = img(pos);
  const shown = v.sub ? 'substitute' : v.gmax && dex.species.get(`${v.species}-Gmax`).exists ? `${v.species}-Gmax` : v.species;
  im.classList.toggle('dynamax', v.dmax);
  im.dataset.status = v.hp > 0 ? v.status : ''; // cada problema de estado tiñe y mueve el sprite a su manera
  $(`.zzz${slotSel(pos)}`).hidden = v.status !== 'slp' || v.hp <= 0;
  if (im.dataset.species !== shown) {
    const s = v.sub ? subSprite(mine) : spriteOf(shown, mine);
    im.src = s.url;
    im.alt = v.species;
    im.dataset.species = shown;
    im.style.setProperty('--w', s.w);
  }
  const hud = $(`.hud${slotSel(pos)}`);
  if (DOUBLE) hud.hidden = v.hp <= 0; // sin Pokémon en ese hueco, sin marcador
  hud.querySelector('.name').textContent = v.name;
  const g = hud.querySelector('.gender');
  g.textContent = v.gender === 'M' ? '♂' : v.gender === 'F' ? '♀' : '';
  g.className = 'gender ' + v.gender.toLowerCase();
  hud.querySelector('.lvl').textContent = T.level + v.level;
  const tera = view.tera[side][v.name];
  hud.querySelector('.types').innerHTML = tera ? `<span class="tera-tag">${T.teraLabel}</span>${typeBadge(tera)}` : (v.types || dex.species.get(v.species).types).map(typeBadge).join('');
  const pct = Math.max(0, 100 * v.hp / v.maxhp);
  animateBar(pos, fromHp != null ? Math.max(0, 100 * fromHp / v.maxhp) : pct, pct, dur, v.maxhp);
  const boosts = Object.entries(v.boosts).filter(([, n]) => n)
    .map(([s, n]) => `<span class="boost ${n > 0 ? 'up' : 'down'}">${T.statShort[s]} ${n > 0 ? '+' : ''}${n}</span>`).join('');
  hud.querySelector('.status').innerHTML = (v.status ? `<span class="st st-${v.status}">${T.statusTag[v.status]}</span>` : '') + boosts;
  if (mine) lowHpAlarm(POS.some(p => p[1] === '1' && view[p].hp > 0 && view[p].hp / view[p].maxhp <= 0.2) && !battle?.ended);
  const out = faintedMarks(side, mine ? team() : B.team);
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
      <div class="tp-sub">${it} · ${abilityName(p.ability)}${GIMMICKS.includes('tera') ? ` · ${T.teraLabel} ${typeBadge(p.teraType)}${p.terastallized ? ' ✓' : ''}` : ''}</div>
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
// Detalles de los ataques (descripción entera, potencia, precisión, prioridad, contacto): sobre todo para el móvil,
// donde por defecto la descripción va recortada. Se recuerda la elección.
const movesFull = () => ls.get('redle:moveinfo') === '1';
function drawMovesToggle() {
  $('#moves').classList.toggle('full', movesFull());
  $('#btn-moves-info').textContent = movesFull() ? T.movesInfoOff : T.movesInfoOn;
  $('#btn-moves-info').setAttribute('aria-pressed', movesFull());
}
$('#btn-moves-info').onclick = () => { sfx('click'); ls.set('redle:moveinfo', movesFull() ? '0' : '1'); drawMovesToggle(); };

// Precisión real con lo que hay en el campo, para que no sorprenda (Gravedad ×5/3; Trueno/Vendaval con lluvia o
// sol; Ventisca con granizo o nieve). null si no cambia.
function realAcc(move) {
  if (move.accuracy === true || move.category === 'Status' && move.target === 'self') return null;
  const w = battle.field.effectiveWeather(), why = [];
  let acc = move.accuracy;
  if (['thunder', 'hurricane'].includes(move.id) && w === 'raindance') { acc = 100; why.push('RainDance'); }
  else if (['thunder', 'hurricane'].includes(move.id) && w === 'sunnyday') { acc = 50; why.push('SunnyDay'); }
  if (move.id === 'blizzard' && ['hail', 'snow', 'snowscape'].includes(w)) { acc = 100; why.push('Hail'); }
  if (battle.field.pseudoWeather.gravity && acc < 100) { acc = Math.min(100, Math.floor(acc * 5 / 3)); why.push('Gravity'); }
  return acc !== move.accuracy ? {acc, why: why.at(-1)} : null;
}
// Un botón de ataque. `hintHtml`: la pista de eficacia (una en individuales; una por rival en dobles).
function moveButton(m, hintHtml, maxMove) {
  const move = dex.moves.get(maxMove || m.id);
  const cat = move.category === 'Status' ? T.status : move.category === 'Physical' ? T.physical : T.special;
  const power = move.isMax ? dex.moves.get(m.id).maxMove?.basePower : move.basePower; // potencia real del Maxiataque
  const real = realAcc(move);
  const accTxt = move.accuracy === true ? '' : real ? `${T.acc} <s>${move.accuracy}</s> <span class="acc-real">${real.acc}</span>` : `${T.acc} ${move.accuracy}`;
  const info = [cat, power && move.category !== 'Status' ? `${T.power} ${power}` : '', accTxt,
    move.priority ? `${T.priority} ${move.priority > 0 ? '+' : ''}${move.priority}` : '', move.flags?.contact ? T.contact : ''].filter(Boolean).join(' · ');
  const accTag = real ? `<span class="acc-tag" title="${T.accNote}">${itemIcon(FIELD_ICON[real.why])}${real.acc}%</span>` : '';
  // Descripción como en los juegos al elegir un ataque (los Maxiataques no tienen texto oficial).
  const desc = move.isMax ? (move.id === 'maxguard' ? T.maxGuardDesc : T.maxDesc(typeName(move.type))) : moveDesc(move.id);
  const b = el('button', `move t-${move.type.toLowerCase()}`,
    `<b>${m.id === 'recharge' ? T.recharge : moveName(move.id)}</b><span class="line">${typeBadge(move.type)}${accTag}<span>PP ${m.pp ?? '-'}/${m.maxpp ?? '-'}</span></span><span class="info">${info}</span>${desc ? `<span class="desc">${desc}</span>` : ''}${hintHtml}`);
  b.disabled = !!m.disabled || m.pp === 0;
  if (desc) b.title = desc;
  return b;
}

// Dobles: se elige para cada Pokémon y el turno sale al completar los dos.
let turnPicks = [];
// Huecos que tienen que decidir este turno.
function actingSlots(req) {
  const me = battle.p1.active;
  if (!req.forceSwitch) return [0, 1].filter(i => !me[i].fainted && !me[i].volatiles.commanding);
  const forced = [0, 1].filter(i => req.forceSwitch[i]);
  if (forced.some(i => battle.p1.slotConditions[i]?.revivalblessing)) return forced;
  return forced.slice(0, battle.p1.pokemon.filter(p => !p.fainted && !p.isActive).length); // sin banquillo para los dos, uno se queda vacío
}
function pickSlot(text, slots) {
  turnPicks.push(text);
  if (turnPicks.length < slots.length) return drawControls();
  const choice = [0, 1].map(i => turnPicks[slots.indexOf(i)] ?? 'pass').join(', ');
  turnPicks = [];
  choose(choice);
}
function drawDoubleControls() {
  drawMovesToggle();
  $('.forfeit-btn')?.remove();
  const req = battle.p1.activeRequest, moves = $('#moves'), switches = $('#switches');
  moves.innerHTML = switches.innerHTML = '';
  document.querySelector('.mon.acting')?.classList.remove('acting');
  if (!req || req.wait) return;
  const slots = actingSlots(req);
  if (turnPicks.length >= slots.length) turnPicks = [];
  const i = slots[turnPicks.length], me = battle.p1.active[i], ally = battle.p1.active[1 - i];
  const foes = battle.p2.active.filter(p => p && !p.fainted), allyIn = ally && !ally.fainted;
  const revive = !!(req.forceSwitch && battle.p1.slotConditions[i]?.revivalblessing);
  const chosen = turnPicks.filter(t => t.startsWith('switch')).map(t => +t.split(' ')[1] - 1);
  if (!req.forceSwitch) img(i ? 'p1b' : 'p1a').classList.add('acting');
  $('#prompt').textContent = revive ? T.revivePick : req.forceSwitch ? T.who : `${T.what(me.name)}${slots.length > 1 ? ` (${turnPicks.length + 1}/2)` : ''}`;
  switches.classList.toggle('revive', revive);
  const back = () => {
    if (!turnPicks.length) return;
    const b = el('button', 'linklike undo-btn', T.undo);
    b.onclick = () => { sfx('click'); turnPicks.pop(); drawControls(); };
    moves.append(b);
  };
  const r = req.active?.[i];
  if (!req.forceSwitch) {
    r.moves.forEach((m, j) => {
      const move = dex.moves.get(m.id), kind = m.target; // sin `target`: atado a un ataque, no se elige objetivo
      const damaging = kind && move.category !== 'Status' && kind !== 'self';
      const chips = damaging ? foes.map(f => { const x = typeMultiplier(me, f, m.id); return `<i class="${x > 1 ? 'good' : x < 1 ? 'bad' : ''}">${icon(f.species.name)}×${x}</i>`; }).join('') : '';
      const hurtsAlly = kind === 'allAdjacent' && allyIn && typeMultiplier(me, ally, m.id) !== 0;
      const b = moveButton(m, `${chips ? `<span class="vs-hints">${chips}</span>` : ''}${hurtsAlly ? `<span class="ally-warn">${T.hitsAlly}</span>` : ''}`);
      b.onclick = () => {
        sfx('click');
        const text = `move ${j + 1}`, aim = t => pickSlot(`${text} ${t}`, slots), allyLoc = -(2 - i), selfLoc = -(i + 1);
        if (kind === 'adjacentAlly') return allyIn ? aim(allyLoc) : pickSlot(text, slots);
        if (kind === 'adjacentAllyOrSelf') return aim(allyIn ? allyLoc : selfLoc);
        if (!['normal', 'any', 'adjacentFoe'].includes(kind)) return pickSlot(text, slots);
        const friendly = allyIn && kind !== 'adjacentFoe' && (move.category === 'Status' || move.id === 'pollenpuff');
        if (foes.length === 1 && !friendly) return aim(battle.p2.active.indexOf(foes[0]) + 1);
        drawTargets(m, foes, friendly ? ally : null, aim, allyLoc, me);
      };
      moves.append(b);
    });
  }
  back();
  const trapped = !req.forceSwitch && r.trapped;
  battle.p1.pokemon.forEach((p, n) => {
    const b = el('button', 'sw' + (p.isActive ? ' active' : '') + (p.fainted ? (revive ? ' revivable' : ' out') : ''),
      `${icon(p.species.name)}<span>${p.name}</span><i style="--hp:${Math.round(100 * p.hp / p.maxhp)}%"></i>${revive && p.fainted ? `<em>${T.reviveTag}</em>` : ''}`);
    b.disabled = revive ? !p.fainted : p.fainted || p.isActive || trapped || chosen.includes(n);
    b.title = `${p.name} · ${p.hp}/${p.maxhp} · ${p.moveSlots.map(m => moveName(m.id)).join(', ')}`;
    b.onclick = () => { sfx('click'); pickSlot(`switch ${n + 1}`, slots); };
    switches.append(b);
  });
  if (!REPLAY) {
    const f = el('button', 'forfeit-btn', T.forfeit);
    f.onclick = () => { if (confirm(T.forfeitConfirm)) { turnPicks = []; choose('forfeit'); } };
    switches.after(f);
  }
}
// ¿A quién? Un botón por objetivo, con su vida y lo eficaz que será.
function drawTargets(m, foes, ally, aim, allyLoc, me) {
  const moves = $('#moves'), switches = $('#switches');
  moves.innerHTML = switches.innerHTML = '';
  $('#prompt').innerHTML = T.pickTarget(moveName(m.id));
  const target = (p, loc, cls) => {
    const x = typeMultiplier(me, p, m.id), pct = Math.ceil(100 * p.hp / p.maxhp);
    const hint = x === null ? '' : x === 0 ? T.noEffect : x > 1 ? T.superEff : x < 1 ? T.notVery : '';
    const b = el('button', `target ${cls}`, `${icon(p.species.name)}<span><b>${p.name}</b><i style="--hp:${pct}%"></i></span><small>${pct}%</small>${hint ? `<em class="${x > 1 ? 'good' : 'bad'}">${hint}</em>` : ''}`);
    b.onclick = () => { sfx('click'); aim(loc); };
    moves.append(b);
  };
  for (const f of foes) target(f, battle.p2.active.indexOf(f) + 1, 'foe');
  if (ally) target(ally, allyLoc, 'ally');
  const b = el('button', 'linklike undo-btn', T.undo);
  b.onclick = () => { sfx('click'); drawControls(); };
  moves.append(b);
}

function drawControls() {
  if (DOUBLE) return drawDoubleControls();
  drawMovesToggle();
  $('.forfeit-btn')?.remove();
  const req = battle.p1.activeRequest;
  const moves = $('#moves'), switches = $('#switches');
  moves.innerHTML = switches.innerHTML = '';
  if (!req || req.wait) return;
  const me = battle.p1.active[0], foe = battle.p2.active[0];
  // Revival Blessing (Bendición): hay que elegir a un Pokémon debilitado para revivirlo.
  const revive = !!(req.forceSwitch && battle.p1.slotConditions[0]?.revivalblessing); // booleano: toggle(x, undefined) alterna la clase
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
      const mult = typeMultiplier(me, foe, m.id);
      const hint = mult === null ? '' : mult === 0 ? T.noEffect : mult > 1 ? T.superEff : mult < 1 ? T.notVery : '';
      const b = moveButton(m, hint ? `<em class="${mult > 1 ? 'good' : 'bad'}">${hint}</em>` : '', maxMode && r.maxMoves?.maxMoves?.[i] ? r.maxMoves.maxMoves[i].move : '');
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
document.querySelectorAll('.hud.me').forEach(h => { h.onclick = () => { $('.tabs button[data-tab=team-panel]').click(); $('.tabs').scrollIntoView({behavior: 'smooth', block: 'start'}); }; });

// Ficha del rival: solo lo que se ha visto en combate.
document.querySelectorAll('.hud.foe').forEach(h => { h.onclick = () => foeCard(view[h.classList.contains('b') ? 'p2b' : POS[POS.length / 2]]); });
function foeCard(v) {
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
}

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
  d.dexNew = dexNewToday(won);
  save();
  if (won) { award(MODE); if (!LIGA) awardFeats(d, attempt()); if (SEASON) award(`season:${SEASON.id}:${TODAY.slice(0, 4)}`); }
  bumpStreak();
  sendResult(myResult());
  backup();
}
// Resultado de hoy tal y como se envía (y se compara para el puesto del día).
const myResult = () => {
  const d = day();
  // Liga: si eres Campeón, se guarda la repetición del combate contra el Campeón (ronda 5), la más espectacular.
  const champ = d.rounds?.[LEAGUE.rounds - 1];
  return LIGA ? {day: TODAY, mode: MODE, won: d.result === 'win', turns: null, reached: d.reached, kos: null,
      replay: d.result === 'win' && champ ? encodeReplay({m: MODE, d: DATE, r: LEAGUE.rounds - 1, p: champ.picks, c: champ.choices}) : null}
    : {day: TODAY, mode: MODE, won: d.result === 'win', turns: d.turns, reached: null, kos: d.red.filter(a => !a).length, tries: attempt(),
      // Si ganas, tu repetición queda para que otros vean cómo se hizo (solo tras jugar su intento).
      replay: d.result === 'win' ? encodeReplay({m: MODE, d: DATE, r: 0, a: attempt(), p: d.picks, c: d.choices}) : null};
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
  const left = maxTries() - attempt();
  if (!LIGA && r.result === 'loss' && left > 0) {
    if (animate) jingle('lose'); else playMusic(null);
    $('#prompt').textContent = T.triesLeft(left);
    $('#moves').append(ballBtn(T.tryAgain(attempt() + 1, maxTries()), retry), ballBtn('▶ ' + T.replay, watchReplay, 'ballbtn alt'));
    return;
  }
  closeDay(r.result === 'win', LIGA ? (r.result === 'win' ? LEAGUE.rounds : round()) : 0);
  if (animate) jingle(r.result === 'win' ? 'win' : 'lose');
  else playMusic(null);
  $('#prompt').textContent = LIGA ? (day().result === 'win' ? T.leagueWon : T.leagueLost(round() + 1)) : r.result === 'win' ? T.won : T.lost;
  $('#moves').append(ballBtn(T.seeResult, showResult),
    ballBtn('▶ ' + T.replay, watchReplay, 'ballbtn alt'), ...practiceOptions().map(([txt, fn]) => ballBtn(txt, fn, 'ballbtn alt')));
  if (animate) {
    const hallOfFame = r.result === 'win' && day().result === 'win' && !PRACTICE;
    resultTimer = setTimeout(hallOfFame ? () => fameScene().then(showResult) : showResult, 2500);
  }
}

// ---------- Salón de la Fama y Pokédex ----------
// Salen del historial guardado: el equipo de cada día se puede recalcular, así que no hace falta guardar nada más
// (y funcionan con las victorias de antes de que existieran).
function playedDays() {
  const out = [];
  for (const id of MODES) for (const [date, d] of Object.entries(readJSON(keyOf(id)).days || {})) {
    if (!/^\d{4}-\d\d-\d\d$/.test(date) || !(d.result || d.started || d.rounds?.length)) continue;
    out.push({id, date, d, won: d.result === 'win', team: poolOf(id, date).map(s => s.species)});
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
const fameRival = ({id, date}) => (id === 'liga' ? T.league : BOSSES[id]?.name || duoOf(date).name);
const fameFaces = ({id, date}) => (id === 'liga' ? `<span class="liga-icon">${itemIcon('Master Ball')}</span>`
  : (BOSSES[id] ? [id] : duoOf(date).trainers).map(t => `<img src="${trainerImg(t)}" alt="" width="40" height="40">`).join(''));
const fameLink = ({id, date, d}) => {
  const liga = id === 'liga', r = liga ? d.rounds?.[LEAGUE.rounds - 1] : d;
  if (!r?.choices?.length) return '';
  const hash = encodeReplay({m: id, d: date, r: liga ? LEAGUE.rounds - 1 : 0, ...(d.attempt > 1 ? {a: d.attempt} : {}), p: r.picks, c: r.choices});
  return `<a class="watch" href="?vs=${id}#r=${hash}" target="_blank" rel="noopener">▶ ${T.watch}</a>`;
};
function drawFame() {
  const wins = playedDays().filter(e => e.won), fmt = d => new Date(d + 'T12:00:00').toLocaleDateString(LANG, {day: 'numeric', month: 'short', year: 'numeric'});
  $('#fame-list').innerHTML = !wins.length ? `<p class="wins-empty">${T.fameEmpty}</p>` : wins.map((e, i) => `<section class="fame-entry">
      <div class="fame-who"><span class="duo-faces">${fameFaces(e)}</span><div><b>${T.fameEntry(i + 1)}</b><small>${fameRival(e)} · ${fmt(e.date)}${e.d.turns ? ` · ${T.topTurns(e.d.turns)}` : ''}</small></div>${fameLink(e)}</div>
      <div class="icons">${e.team.map(s => icon(s)).join('')}</div></section>`).reverse().join('');
}
// Como al llegar a la cima en los juegos: tu equipo pasa uno a uno entre destellos y queda inscrito. Un toque lo salta.
function fameScene() {
  const box = $('#fame'), big = $('.fame-mon'), plate = $('.fame-plate'), row = $('.fame-row'), end = $('.fame-end'), sets = team();
  const url = s => Sprites.getPokemon(s, {gen: 'ani'}).url;
  for (const set of sets) new Image().src = url(set.species);
  return new Promise(async done => {
    let skip = matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.onclick = () => { skip = true; };
    row.innerHTML = '';
    end.hidden = true;
    big.hidden = plate.hidden = false;
    box.classList.remove('flash');
    $('.fame-title').textContent = T.fameTitle;
    box.hidden = false;
    for (const set of sets) {
      if (!skip) {
        big.src = url(set.species);
        plate.innerHTML = `<b>${set.name || set.species}</b><small>${T.level}${set.level}</small>`;
        for (const e of [big, plate]) { e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); }
        box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
        sfx('item');
        cry(cryId(set.species));
        await sleep(1000); // sin prisas: es el momento de gloria
      }
      row.append(el('img', 'fame-small', null));
      row.lastChild.src = url(set.species);
      row.lastChild.alt = set.species;
    }
    big.hidden = plate.hidden = true;
    end.hidden = false;
    $('.fame-end p').innerHTML = `${T.fameWelcome(esc(ls.get('redle:nick') || T.anon))}<br><small>${T.fameEntry(playedDays().filter(e => e.won).length)} · ${B.name}</small>`;
    $('.fame-end button').textContent = T.fameContinue;
    $('.fame-end button').onclick = e => { e.stopPropagation(); box.hidden = true; done(); };
  });
}

// Lo que este reto añade a la Pokédex: si ganas, los que pasan a color; si pierdes, los que ves por primera vez.
function dexNewToday(won) {
  const base = s => dex.species.get(s).baseSpecies;
  const before = playedDays().filter(e => !(e.id === MODE && e.date === TODAY) && (e.won || !won));
  const known = new Set(before.flatMap(e => e.team.map(base)));
  return [...new Set(POOL.map(s => base(s.species)))].filter(s => !known.has(s));
}
function drawDexNew(d) {
  const box = $('#dex-new'), list = d?.closed || d?.result ? d.dexNew || [] : [];
  box.hidden = !list.length || !!PRACTICE;
  if (box.hidden) return;
  box.innerHTML = `<button class="linklike">${(d.result === 'win' ? T.dexNewWon : T.dexNewSeen)(list.length)} →</button><div class="icons">${list.map(s => `<span class="dex-new-mon">${icon(s)}<em>${T.dexNewTag}</em></span>`).join('')}</div>`;
  box.querySelector('button').onclick = () => {
    const first = pokedexList().find(p => p.name === list[0]);
    if (first) { dexRegion = first.gen; dexPick = first.name; }
    sfx('click'); drawDex(); $('#dlg-dex').showModal();
  };
}

let dexRegion = 1, dexPick = '';
function drawDex() {
  const days = playedDays(), wins = new Map(), mvps = new Map(), seen = new Set(), base = s => dex.species.get(s).baseSpecies;
  for (const e of days) {
    for (const s of e.team) { seen.add(base(s)); if (e.won) wins.set(base(s), (wins.get(base(s)) || 0) + 1); }
    if (e.d.mvp) mvps.set(base(e.d.mvp), (mvps.get(base(e.d.mvp)) || 0) + 1);
  }
  const all = pokedexList(), inRegion = all.filter(p => p.gen === dexRegion), pick = all.find(p => p.name === dexPick);
  $('#dex-count').textContent = T.dexCount(all.filter(p => wins.has(p.name)).length, all.filter(p => seen.has(p.name)).length, all.length);
  $('#dex-tabs').innerHTML = T.regions.map((r, i) => `<button class="${i + 1 === dexRegion ? 'on' : ''}" data-r="${i + 1}">${r}</button>`).join('');
  $('#dex-tabs').querySelectorAll('button').forEach(b => { b.onclick = () => { sfx('click'); dexRegion = +b.dataset.r; drawDex(); }; });
  const known = pick && seen.has(pick.name), times = pick && wins.get(pick.name);
  $('#dex-card').innerHTML = !pick ? `<p>${T.dexHint}</p>` : `<img class="${known ? '' : 'shadow'}" src="${Sprites.getPokemon(pick.name, {gen: 'ani'}).url}" alt="">
    <div><small>N.º ${String(pick.num).padStart(4, '0')}</small><b>${known ? pick.name : '???'}</b>
      <div class="types">${known ? dex.species.get(pick.name).types.map(typeBadge).join('') : ''}</div>
      <p>${!known ? T.dexUnknown : times ? T.dexWon(times) + (mvps.get(pick.name) ? ` ${T.dexMvp(mvps.get(pick.name))}` : '') : T.dexSeen}</p></div>`;
  $('#dex-grid').innerHTML = inRegion.map(p => `<button class="dx${wins.has(p.name) ? ' won' : seen.has(p.name) ? ' seen' : ''}${p.name === dexPick ? ' on' : ''}" data-n="${p.name}" aria-label="${seen.has(p.name) ? p.name : '???'}">${icon(p.name)}</button>`).join('');
  $('#dex-grid').querySelectorAll('button').forEach(b => { b.onclick = () => { sfx('click'); dexPick = b.dataset.n; drawDex(); }; });
}

// Otro intento: se guarda el anterior y se vuelve a la pantalla de equipo (se puede elegir otro líder).
function retry() {
  const d = day();
  (d.tries ||= []).push({turns: d.turns, kos: d.red.filter(a => !a).length});
  for (const k of ['result', 'turns', 'mine', 'red', 'mvp', 'started']) delete d[k];
  d.choices = [];
  d.attempt = (d.attempt || 1) + 1;
  save();
  sfx('switch');
  resetView();
  renderDraft();
  window.scrollTo({top: 0, behavior: 'smooth'});
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
  const hash = encodeReplay({m: MODE, d: DATE, r: round(), ...(attempt() > 1 ? {a: attempt()} : {}), p: r.picks, c: r.choices});
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
    const pos = a.slice(0, 3), side = a.slice(0, 2); // hueco del campo: p1a, p1b… (en individuales, siempre el a)
    if (cmd === 'switch' || cmd === 'drag') { active[pos] = parseId(a).name; const [h, m] = c.split(' ')[0].split('/').map(Number); hp[pos] = [h, m]; }
    else if (cmd === 'move') attacker = pos;
    else if (cmd === '-damage' || cmd === '-heal') {
      const [h, m] = b.split(' ')[0].split('/').map(Number), [prev, max] = hp[pos] || [h, m];
      const lost = Math.max(0, prev - h) / (m || max) * 100;
      hp[pos] = [b.includes('fnt') ? 0 : h, m || max];
      if (cmd !== '-damage' || c.includes('[from]')) continue;
      const hitter = stats.get(active[attacker]), target = stats.get(active[pos]);
      if (side === 'p2' && attacker?.startsWith('p1') && hitter) hitter.dmg += lost;
      if (side === 'p1' && target) target.taken += lost;
    } else if (cmd === 'faint' && side === 'p2' && attacker?.startsWith('p1') && stats.get(active[attacker])) stats.get(active[attacker]).kos++;
  }
  return [...stats.values()];
}

const triesTag = () => (maxTries() > 1 ? ` ${day().result === 'win' ? attempt() : 'X'}/${maxTries()}` : '');
const mvpOf = rows => rows.reduce((m, r) => (r.kos * 1000 + r.dmg > m.kos * 1000 + m.dmg ? r : m), rows[0]);

function shareText() {
  const d = day(), url = `${location.origin}${location.pathname}?vs=${MODE}`;
  if (LIGA) {
    const marks = LINEUP.map((_, i) => d.rounds[i]?.result === 'win' ? '✅' : d.rounds[i]?.result === 'loss' ? '❌' : '⬜').join('');
    return `Redle ${T.league} #${DAY} 🏟️\n${T.leagueShare(d.reached)}\n${marks}\n${LINEUP.map(id => BOSSES[id].name).join(' · ')}\n${globalLine()}${streakLine()}${url}`;
  }
  const mine = d.mine.map(f => (f === 0 ? '🟥' : f < 0.5 ? '🟨' : '🟩')).join('');
  const red = d.red.map(a => (a ? '🔴' : '⚫')).join('');
  const left = d.red.filter(Boolean).length;
  const head = d.result === 'win' ? T.shareWin(d.turns) : `${T.shareLoss(d.turns)} · ${T.shareLeft(left)}`;
  return `Redle #${DAY} ${STAGE.emoji} vs ${B.name}${triesTag()}\n${head}\n${T.you}: ${mine}\n${T.red}: ${red}\n${d.mvp ? `${T.mvp}: ${d.mvp}\n` : ''}${globalLine()}${streakLine()}${url}`;
}
let todayWinPct = null; // % del día que ganó, para picar a quien lo lea
const globalLine = () => todayWinPct === null ? '' : T.shareGlobal(todayWinPct, LIGA) + '\n';
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
  const d = store.days[DATE], done = d?.closed ? d.result : null;
  $('#result-title').textContent = !done ? T.stats : LIGA ? (done === 'win' ? T.leagueWon : T.leagueLost(d.reached + 1)) : done === 'win' ? T.won : T.lost;
  $('#result-body').innerHTML = !done ? '' : LIGA
    ? `<div class="lineup small-lineup">${LINEUP.map((id, i) => `<figure class="${d.rounds[i]?.result === 'win' ? 'beaten' : d.rounds[i]?.result === 'loss' ? 'lost' : ''}"><img src="${trainerImg(id)}" alt="" width="48" height="48"><figcaption><b>${BOSSES[id].name}</b></figcaption></figure>`).join('')}</div><p>${done === 'win' ? T.leagueWonSub : T.leagueLostSub}</p>`
    : `<div class="result-faces">${(B.trainers || [OPP]).map(t => `<img class="result-red ${done}" src="${trainerImg(t)}" alt="${B.name}" width="96" height="96">`).join('')}</div><p>${done === 'win' ? T.wonSub : T.lostSub}</p>`;
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
  drawDexNew(d);
  // Lo primero al acabar: volver a intentarlo, grande y a mano. El resto de opciones van abajo.
  const [again, ...others] = done ? practiceOptions() : [];
  $('#result-again').replaceChildren(...(again ? [ballBtn(`${T.again}<small>${T.againNote}</small>`, again[1], 'ballbtn again')] : []));
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
    for (const [txt, fn] of others) add(txt, fn);
    if (PRACTICE) add(T.backToday, goToday);
  }
  drawGlobal(done);
  drawInstall(done);
  tickCountdown();
  if (!$('#dlg-stats').open) $('#dlg-stats').showModal();
}

// Estadísticas de todos los jugadores de hoy en este modo (solo tras jugar, para no condicionar).
async function drawGlobal(done) {
  if (done && newMedals.length) $('#result-body').insertAdjacentHTML('beforeend', `<p class="new-medals">${newMedals.map(id => `<span>${T.newMedal(medalTitle(id))}</span>`).join('')}</p>`);
  const box = $('#global');
  box.innerHTML = '';
  if (!done || REPLAY) return;
  if (PRACTICE) return drawWins(box); // en práctica ya jugaste el reto: puedes ver cómo ganaron otros
  box.innerHTML = '<i class="sk sk-line"></i><i class="sk sk-line short"></i>'; // esqueleto mientras responde Supabase
  const [all, rank, top, wins] = await Promise.all([dailyStats(TODAY), dailyRank(myResult()), dailyTop(TODAY, MODE), dailyWins(TODAY, MODE)]);
  const g = all?.[MODE];
  if (!g || !g.players) { box.innerHTML = ''; return; }
  const pct = n => Math.round(100 * n / g.players);
  if (g.players >= 10) todayWinPct = pct(g.wins); // con pocos jugadores el % no dice nada
  if (LIGA) {
    const mine = day().reached, worse = g.reached.slice(0, mine).reduce((a, b) => a + b, 0);
    box.innerHTML = `<h3>${itemIcon('Poke Ball')} ${T.globalTitle}</h3><p>${T.globalPlayers(g.players)} · ${T.globalChampions(g.wins, pct(g.wins))}</p>
      <div class="dist">${g.reached.map((n, i) => `<div class="${i === mine ? 'me' : ''}"><i style="height:${Math.max(4, pct(n))}%"></i><span>${i}/5</span></div>`).join('')}</div>
      <p>${T.globalBetter(pct(worse))}</p>`;
  } else {
    box.innerHTML = `<h3>${itemIcon('Poke Ball')} ${T.globalTitle}</h3><p>${T.globalPlayers(g.players)} · ${T.globalWins(pct(g.wins))}${g.avgTurns ? ` · ${T.globalTurns(g.avgTurns)}` : ''}</p>`;
  }
  if (rank) box.insertAdjacentHTML('beforeend', `<p class="rank">${T.rankLine(rank.pos, Math.max(rank.total, rank.pos))}</p>`);
  if (Array.isArray(top) && top.length) box.insertAdjacentHTML('beforeend', `<h4>${T.topTitle}</h4><ol class="top">${top.map(r =>
    `<li class="${r.me ? 'me' : ''}"><span>${r.nickname ? esc(r.nickname) : T.anon}</span><em>${LIGA ? `${r.reached ?? 0}/5` : r.won ? T.topTurns(r.turns) + (r.tries > 1 ? ` · ${r.tries}/3` : '') : T.topKos(r.kos ?? 0)}</em></li>`).join('')}</ol>`);
  await drawWins(box, wins);
}

// Victorias con su repetición (solo después de haber jugado tu intento, así que no hay spoilers). Si hoy nadie ha
// ganado todavía, las de ayer, para que siempre haya algo que mirar y aprender.
async function drawWins(box, today) {
  const ok = list => (list || []).filter(w => /^[\w-]{1,6000}$/.test(w.replay || ''));
  let wins = ok(today ?? await dailyWins(TODAY, MODE)), title = LIGA ? T.winsTitleLiga : T.winsTitle;
  if (!wins.length) {
    wins = ok(await dailyWins(YESTERDAY, MODE));
    title = wins.length ? T.winsYesterday : '';
  }
  if (!wins.length) return box.insertAdjacentHTML('beforeend', `<p class="wins-empty">${T.winsNone}</p>`);
  box.insertAdjacentHTML('beforeend', `<h4>${title}</h4><ul class="wins">${wins.map(w =>
    `<li><span>${w.nickname ? esc(w.nickname) : T.anon}</span><em>${LIGA ? T.champion : T.topTurns(w.turns)}${w.tries > 1 ? ` · ${w.tries}/3` : ''}</em><a class="watch" href="?vs=${MODE}#r=${w.replay}" target="_blank" rel="noopener">▶ ${T.watch}</a></li>`).join('')}</ul>`);
}

// ---------- medallas, tarjeta de entrenador, apodo, código de entrenador y sugerencias ----------
const esc = t => String(t).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const MODES = [...Object.keys(BOSSES), 'liga', DOUBLES.id];
const STREAK_MEDALS = [[7, 'Poke Ball'], [30, 'Ultra Ball'], [100, 'Master Ball']]; // racha de días: Poké, Ultra y Master Ball
const medals = () => readJSON('redle:medals');
const newMedals = []; // las conseguidas en esta visita, para celebrarlas en el resultado
function award(id, quiet) {
  const m = medals();
  if (m[id]) return;
  m[id] = TODAY; ls.set('redle:medals', JSON.stringify(m));
  if (!quiet) newMedals.push(id);
}
// Hazañas: cómo ganaste, no solo a quién. [id, objeto, se cumple con el día ganado y su intento]
const FEATS = [
  ['first', 'Quick Claw', (d, a) => a === 1],
  ['flawless', 'Full Restore', d => d.mine?.length && d.mine.every(f => f > 0)],
  ['clutch', 'Focus Sash', d => d.mine?.filter(f => f > 0).length === 1],
  ['fast', 'Choice Scarf', d => d.turns > 0 && d.turns <= 15],
];
function awardFeats(d, attempt, quiet) {
  for (const [id, , ok] of FEATS) if (ok(d, attempt)) award(id, quiet);
  if (Object.keys(BOSSES).every(id => medals()[id])) award('all', quiet);
}
// Medallas de lo ganado antes de que existieran (en el historial guardado de cada modo y la mejor racha).
for (const id of MODES) for (const d of Object.values(readJSON(keyOf(id)).days || {})) if (d.result === 'win') {
  award(id, true);
  if (id !== 'liga') awardFeats(d, d.attempt || 1, true);
}
for (const [n] of STREAK_MEDALS) if ((readJSON('redle:streak').best || 0) >= n) award('streak' + n, true);

const medalTitle = id => id.startsWith('season:') ? `${T.season[id.split(':')[1]]?.[0]} ${id.split(':')[2]}` : BOSSES[id] ? T.medalOf(BOSSES[id].name) : id === 'liga' ? T.medalLiga : id === DOUBLES.id ? T.medalDoubles : id.startsWith('streak') ? T.medalStreak(+id.slice(6)) : T.feat[id];

// Una medalla por rival (su sprite en color si le has ganado alguna vez), la de Campeón de la Liga y las de racha.
const medalList = () => [
  ...Object.values(BOSSES).map(b => [b.id, T.medalOf(b.name), `<img src="${trainerImg(b.id)}" alt="" width="40" height="40">`]),
  ['liga', T.medalLiga, itemIcon('Master Ball')],
  [DOUBLES.id, T.medalDoubles, itemIcon('Muscle Band')],
  ...STREAK_MEDALS.map(([n, item]) => ['streak' + n, T.medalStreak(n), `${itemIcon(item)}<small>${n}</small>`]),
  ...FEATS.map(([id, item]) => [id, T.feat[id], itemIcon(item)]),
  ['all', T.feat.all, itemIcon('Star Piece')],
  // Las de temporada solo aparecen si las tienes: son un recuerdo, no algo que falte por conseguir.
  ...Object.keys(medals()).filter(id => id.startsWith('season:')).map(id => [id, medalTitle(id), itemIcon(SEASONS.find(s => s.id === id.split(':')[1])?.medal || 'Star Piece')]),
];
function medalsHtml() {
  const m = medals();
  const list = medalList();
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
  const m = medals(), total = medalList().length;
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
  $('#btn-fame').textContent = T.fameTitle;
  $('#btn-dex').textContent = T.dexTitle;
  $('#btn-copy-code').textContent = T.copy;
}
$('#btn-trainer').onclick = () => { drawTrainer(); $('#dlg-trainer').showModal(); };
$('#btn-fame').onclick = () => { sfx('click'); drawFame(); $('#dlg-fame').showModal(); };
$('#btn-dex').onclick = () => { sfx('click'); drawDex(); $('#dlg-dex').showModal(); };
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
// Las que llevan fecha futura no salen hasta ese día (se puede subir el código antes de que entren en vigor).
const NEWS_NOW = NEWS.filter(n => n.date <= TODAY);
const hasNews = () => (+ls.get('redle:news') || 0) < NEWS_NOW[0].id;
function drawNewsDot() {
  document.querySelectorAll('.news-dot').forEach(d => { d.hidden = !hasNews(); });
  $('#btn-news-top').classList.toggle('has-news', hasNews());
}
function openNews() {
  const seen = +ls.get('redle:news') || 0;
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString(LANG, {day: 'numeric', month: 'long'});
  $('#news-list').innerHTML = NEWS_NOW.map(n => `<section class="${n.id > seen ? 'unseen' : ''}"><h3>${fmt(n.date)}${n.id > seen ? ` <em>${T.newsNew}</em>` : ''}</h3>
    <ul>${(LANG === 'es' ? n.es : n.en).map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('');
  ls.set('redle:news', NEWS_NOW[0].id);
  drawNewsDot();
  $('#dlg-news').showModal();
}
$('#btn-news').onclick = $('#btn-news-top').onclick = openNews;
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

// Instalar Redle como app, para volver cada día con un toque. Se ofrece al terminar un reto (cuando más apetece
// volver mañana), salvo si ya está instalada o se dijo que no. Android/Chrome: el aviso del navegador; iPhone: cómo hacerlo.
let installEvent = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; });
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
function drawInstall(done) {
  const box = $('#install-box');
  box.hidden = !done || PRACTICE || REPLAY || installed() || ls.get('redle:install') === 'no' || !(installEvent || isIOS());
  if (box.hidden) return;
  $('#install-text').textContent = installEvent ? T.installText : T.installIOS;
  $('#btn-install').hidden = !installEvent;
}
$('#btn-install').onclick = async () => {
  if (!installEvent) return;
  installEvent.prompt();
  const {outcome} = await installEvent.userChoice.catch(() => ({}));
  installEvent = null;
  if (outcome === 'accepted') $('#install-box').hidden = true;
};
$('#btn-install-no').onclick = () => { ls.set('redle:install', 'no'); $('#install-box').hidden = true; };

// Resultado como imagen (1080x1080) para redes: dibujado a mano porque el CDN de Showdown no deja usar sus sprites en
// un canvas exportable (sin CORS). Poké Balls, bloques de vida, las fuentes de Redle y el color del rival.
async function shareImage() {
  const d = day(), S = 1080, cv = el('canvas'), g = cv.getContext('2d');
  cv.width = cv.height = S;
  await Promise.all(['900 40px Nunito', '40px "Luckiest Guy"', '700 40px "Pixelify Sans"'].map(f => document.fonts.load(f).catch(() => {})));
  const css = getComputedStyle(document.body), dex = css.getPropertyValue('--dex').trim() || '#dc0a2d', dark = css.getPropertyValue('--dex-dark').trim() || '#8f0a1c';
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, dex); bg.addColorStop(1, dark);
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.fillStyle = '#ffffff10';
  for (let x = -S; x < S; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x + 30 + S, S); g.lineTo(x + S, S); g.fill(); }
  const text = (t, x, y, font, color = '#fff', stroke = '#0006', align = 'center') => {
    g.font = font; g.textAlign = align; g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = stroke; g.strokeText(t, x, y); g.fillStyle = color; g.fillText(t, x, y);
  };
  const ball = (x, y, r, on) => {
    g.save(); g.lineWidth = r * 0.16; g.strokeStyle = '#2b2b2b';
    g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fillStyle = on ? '#ff3b3b' : '#555'; g.fill(); g.stroke();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI); g.fillStyle = on ? '#fff' : '#888'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.32, 0, 2 * Math.PI); g.fillStyle = on ? '#fff' : '#999'; g.fill(); g.stroke(); g.restore();
  };
  const strip = s => String(s).replace(/^[^\p{L}\p{N}¡¿]+/u, '');
  text(`REDLE #${DAY}`, S / 2, 150, '110px "Luckiest Guy"', '#ffcb05', '#2a3f8f');
  text(LIGA ? T.league : `vs ${B.name}${triesTag()}`, S / 2, 250, '700 72px "Pixelify Sans"');
  const head = LIGA ? strip(T.leagueShare(d.reached)) : d.result === 'win' ? strip(T.shareWin(d.turns)) : `${strip(T.shareLoss(d.turns))}`;
  text(head, S / 2, 360, '900 54px Nunito', '#fff', '#0007');
  if (LIGA) {
    // Los 5 rivales: Poké Ball encendida = vencido.
    LINEUP.forEach((id, i) => { const x = S / 2 + (i - 2) * 180; ball(x, 560, 70, d.rounds[i]?.result === 'win'); text(BOSSES[id].name, x, 680, '700 38px "Pixelify Sans"'); });
  } else {
    // Tu equipo: bloques con la vida que les quedó. El rival: Poké Balls (apagada = debilitado).
    text(T.you, 120, 520, '900 44px Nunito', '#fff', '#0007', 'left');
    d.mine.forEach((f, i) => {
      const x = 330 + i * 115, color = f === 0 ? '#e8402f' : f < 0.5 ? '#ffcb05' : '#47d35a';
      g.fillStyle = '#2b2b2b'; g.fillRect(x - 6, 470, 102, 72); g.fillStyle = color; g.fillRect(x, 476, 90, 60);
    });
    text(B.name, 120, 680, '900 44px Nunito', '#fff', '#0007', 'left');
    d.red.forEach((a, i) => ball(375 + i * 115, 665, 44, !!a));
    if (!d.result || d.result === 'loss') text(T.shareLeft(d.red.filter(Boolean).length), S / 2, 800, '900 42px Nunito', '#ffe08a', '#0007');
    else if (d.mvp) text(`${T.mvp}: ${d.mvp}`, S / 2, 800, '900 46px Nunito', '#ffe08a', '#0007');
  }
  const st = playStreak().n;
  if (st > 1) text(strip(T.shareStreak(st)), S / 2, 890, '900 42px Nunito', '#fff', '#0007');
  g.fillStyle = '#ffcb05'; g.strokeStyle = '#2b2b2b'; g.lineWidth = 8;
  g.beginPath(); g.roundRect ? g.roundRect(S / 2 - 300, 940, 600, 100, 50) : g.rect(S / 2 - 300, 940, 600, 100); g.fill(); g.stroke(); // roundRect: iOS 16+
  text('redle.pages.dev', S / 2, 1008, '900 54px Nunito', '#2b2b2b', '#ffcb05');
  return new Promise(res => cv.toBlob(res, 'image/png'));
}
$('#btn-share-img').onclick = async () => {
  const blob = await shareImage(), file = new File([blob], `redle-${DAY}.png`, {type: 'image/png'});
  try {
    if (navigator.canShare?.({files: [file]})) return await navigator.share({files: [file], text: shareText()});
  } catch { return; }
  const a = el('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); // en el ordenador: descargar
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
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
// La frase del día, la misma para todo el mundo. Los domingos avisa de los dobles; en temporada, se turna con la suya.
$('#splash').textContent = SUNDAY ? T.splashSunday : SEASON && DAY % 2 ? T.season[SEASON.id][1] : T.splash[DAY * 7 % T.splash.length];
if (SEASON) {
  const left = seasonDaysLeft(TODAY, SEASON);
  document.body.classList.add('season-' + SEASON.id);
  $('#season').innerHTML = `${itemIcon(SEASON.medal)}<span><b>${T.season[SEASON.id][0]}</b> · ${T.seasonLeft(left)} ${T.seasonMedal}</span>`;
  $('#season-fx').replaceChildren(...Array.from({length: innerWidth < 600 ? 8 : 14}, (_, i) => {
    const im = el('img');
    im.src = `${SD}fx/${SEASON.fx[i % SEASON.fx.length]}.png`;
    im.alt = '';
    im.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * -14).toFixed(1)}s;--t:${(10 + Math.random() * 8).toFixed(1)}s;--s:${(0.5 + Math.random() * 0.7).toFixed(2)}`;
    return im;
  }));
}
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
for (const [id, key] of [['btn-help', 'aHelp'], ['btn-settings', 'settings'], ['btn-mute', 'aSound'], ['btn-stats', 'stats'], ['btn-news-top', 'newsLink']]) $('#' + id).setAttribute('aria-label', T[key]);
$('#loading').remove();
document.querySelectorAll('img').forEach(im => { if (im.complete) im.classList.add('ok'); }); // las que llegaron antes
// Las descripciones llegan aparte: si ya hay botones de ataque en pantalla, se repintan con ellas.
loadMoveDescs().then(() => { if (battle && !busy && !battle.ended && !REPLAY) drawControls(); }).catch(() => {});

const midDay = !LOCKED && !!rec().started; // antes de pintar: startBattle y renderDraft no lo cambian
if (LOCKED) renderTeaser();
else if (REPLAY || midDay) startBattle(false);
else renderDraft();
// Si vuelves y hay algo que no has visto, se abre una vez. Nunca a mitad de combate ni en una repetición, y a quien
// llega por primera vez no se le molesta: para esos casos queda el botón "!" parpadeando.
if (hasNews() && ls.get('redle:welcome') && !REPLAY && !PRACTICE && !midDay) openNews();
