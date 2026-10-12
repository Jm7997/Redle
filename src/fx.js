// Animaciones de combate al estilo Showdown: imágenes de efectos (fuego, rayos, hojas, rocas…)
// servidas por su CDN, movidas con Web Animations API.
import {Dex} from '@pkmn/sim';

const dex = Dex.forGen(9);
const FX = 'https://play.pokemonshowdown.com/fx/';
const IMAGES = ['fireball', 'bluefireball', 'flareball', 'waterwisp', 'electroball', 'lightning', 'leaf1', 'leaf2', 'energyball', 'iceball', 'icicle',
  'mistball', 'shadowball', 'blackwisp', 'poisonwisp', 'mudwisp', 'rock1', 'rock2', 'rock3', 'fist', 'foot', 'feather', 'wisp', 'shine', 'pokeball',
  'impact', 'sword', 'petal', 'web', 'angry', 'heart'];
let arena, speed = 1;
const ms = n => n / speed;

export function setupFx(el) {
  arena = el;
  for (const n of IMAGES) new Image().src = FX + n + '.png'; // precarga
}
export function setSpeed(s) { speed = s; }
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const settle = anims => Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => {});

export function center(img) {
  const a = arena.getBoundingClientRect(), r = img.getBoundingClientRect();
  return {x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height * 0.55, s: Math.max(0.6, r.height / 120)};
}

// Una imagen de efecto animada por fotogramas clave [{x, y, scale, opacity, rotate}].
function sprite(name, frames, opts) {
  const img = document.createElement('img');
  img.src = FX + name + '.png';
  img.className = 'fx';
  img.alt = '';
  arena.append(img);
  const a = img.animate(frames.map(f => ({
    transform: `translate(${f.x}px, ${f.y}px) translate(-50%, -50%) scale(${f.scale ?? 1}) rotate(${f.rotate ?? 0}deg)`,
    opacity: f.opacity ?? 1, ...(f.offset != null ? {offset: f.offset} : {}),
  })), {fill: 'backwards', easing: 'ease-out', ...opts, duration: ms(opts.duration), delay: ms(opts.delay || 0)});
  a.finished.then(() => img.remove(), () => img.remove());
  return a;
}

// Ráfaga de proyectiles del atacante al objetivo.
function stream(from, to, names, {count = 6, gap = 60, size = 0.8, dur = 420, spin = 0, wobble = 12} = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const w = () => rnd(-wobble, wobble);
    out.push(sprite(Array.isArray(names) ? pick(names) : names, [
      {x: from.x, y: from.y, scale: size * 0.5 * from.s, opacity: 0},
      {x: from.x + (to.x - from.x) * 0.15, y: from.y + (to.y - from.y) * 0.15, scale: size * 0.7 * from.s, offset: 0.12},
      {x: to.x + w(), y: to.y + w(), scale: size * to.s, rotate: spin, opacity: 0.9},
    ], {duration: dur, delay: i * gap, easing: 'ease-in'}));
  }
  return settle(out);
}

// Estallido sobre el objetivo.
function burst(at, names, {count = 6, radius = 50, size = 0.7, dur = 500} = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rnd(-0.3, 0.3), r = radius * at.s;
    out.push(sprite(Array.isArray(names) ? pick(names) : names, [
      {x: at.x, y: at.y, scale: size * 0.3 * at.s},
      {x: at.x + Math.cos(ang) * r, y: at.y + Math.sin(ang) * r, scale: size * at.s, opacity: 0, rotate: rnd(-90, 90)},
    ], {duration: dur, delay: i * 15}));
  }
  return settle(out);
}

// Un golpe que crece y se desvanece en el objetivo.
function impact(at, name = 'impact', size = 1.1, dur = 380) {
  return sprite(name, [
    {x: at.x, y: at.y, scale: 0.3 * at.s, opacity: 1},
    {x: at.x, y: at.y, scale: size * at.s, opacity: 1, offset: 0.4},
    {x: at.x, y: at.y, scale: size * 1.2 * at.s, opacity: 0},
  ], {duration: dur}).finished.catch(() => {});
}

// Objetos que caen sobre el objetivo (rocas, rayos, pétalos…).
function rain(at, names, {count = 5, dur = 450, size = 0.8, spread = 40} = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = at.x + rnd(-spread, spread) * at.s;
    out.push(sprite(Array.isArray(names) ? pick(names) : names, [
      {x, y: at.y - 160 * at.s, scale: size * at.s, opacity: 0},
      {x, y: at.y - 110 * at.s, opacity: 1, offset: 0.2},
      {x, y: at.y + rnd(-10, 15), scale: size * at.s, opacity: 0.2, rotate: rnd(-40, 40)},
    ], {duration: dur, delay: i * 90, easing: 'ease-in'}));
  }
  return settle(out);
}

// Columna de rayos sobre el objetivo.
function bolts(at, n = 3) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = at.x + rnd(-25, 25) * at.s;
    out.push(sprite('lightning', [
      {x, y: at.y - 60 * at.s, scale: 1.4 * at.s, opacity: 0},
      {x, y: at.y - 60 * at.s, scale: 1.4 * at.s, opacity: 1, offset: 0.1},
      {x, y: at.y - 60 * at.s, scale: 1.4 * at.s, opacity: 0},
    ], {duration: 260, delay: i * 120}));
  }
  return settle(out);
}

// Brillo alrededor del usuario (movimientos de estado sobre sí mismo).
function shine(at, name = 'shine') {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const x = at.x + rnd(-45, 45) * at.s, y = at.y + rnd(-45, 30) * at.s;
    out.push(sprite(name, [{x, y, scale: 0.1, opacity: 0}, {x, y, scale: 0.7 * at.s, opacity: 1, offset: 0.5}, {x, y: y - 20, scale: 0.2, opacity: 0}],
      {duration: 600, delay: i * 80}));
  }
  return settle(out);
}

// Fondo oscurecido o teñido durante los ataques especiales (como en Showdown).
export function tint(color, dur = 900, opacity = 0.45) {
  if (!arena) return;
  const f = document.createElement('div');
  f.className = 'fx-flash';
  f.style.background = color;
  arena.append(f);
  f.animate([{opacity: 0}, {opacity, offset: 0.2}, {opacity, offset: 0.75}, {opacity: 0}], {duration: ms(dur)}).finished.then(() => f.remove());
}
export function flash(color, dur = 160) { tint(color, dur, 0.7); }

export function shake(el, px = 8) {
  return el.animate([0, 1, 2, 3, 4, 5].map(i => ({transform: `translateX(${i % 2 ? px : -px}px)`})).concat({transform: 'none'}), {duration: ms(380)}).finished.catch(() => {});
}

function lunge(img, from, to) {
  const dx = (to.x - from.x) * 0.5, dy = (to.y - from.y) * 0.5;
  return img.animate([{transform: 'none'}, {transform: `translate(${dx}px, ${dy}px)`, offset: 0.45}, {transform: 'none'}],
    {duration: ms(420), easing: 'ease-in-out'}).finished.catch(() => {});
}

// Qué dibuja cada tipo en un ataque a distancia.
const RANGED = {
  Fire: (f, t) => stream(f, t, ['fireball', 'flareball'], {count: 7, size: 0.9}).then(() => burst(t, 'fireball', {count: 5})),
  Water: (f, t) => stream(f, t, 'waterwisp', {count: 9, gap: 45, size: 0.8}).then(() => burst(t, 'waterwisp', {count: 5, size: 0.6})),
  Electric: (f, t) => { tint('#000', 1100, 0.5); return stream(f, t, 'electroball', {count: 2, size: 0.8, gap: 120}).then(() => { flash('#fff7a0'); return bolts(t, 3); }); },
  Grass: (f, t) => stream(f, t, ['leaf1', 'leaf2'], {count: 9, gap: 45, size: 0.6, spin: 360, wobble: 25}),
  Ice: (f, t) => { tint('#bfefff', 1000, 0.3); return stream(f, t, 'iceball', {count: 5, size: 0.8}).then(() => burst(t, 'icicle', {count: 6, size: 0.6})); },
  Psychic: (f, t) => { tint('#ff79c0', 1100, 0.35); return impact(t, 'mistball', 1.8, 700).then(() => impact(t, 'mistball', 1.4, 400)); },
  Ghost: (f, t) => { tint('#1b0a2e', 1100, 0.55); return stream(f, t, 'shadowball', {count: 1, size: 1.4, dur: 520}).then(() => burst(t, 'blackwisp', {count: 6})); },
  Dark: (f, t) => { tint('#000', 1000, 0.55); return stream(f, t, 'blackwisp', {count: 8, gap: 45}); },
  Poison: (f, t) => stream(f, t, 'poisonwisp', {count: 8, gap: 50}).then(() => burst(t, 'poisonwisp', {count: 4})),
  Ground: (f, t) => { shake(arena, 10); return burst(t, ['mudwisp', 'rock1', 'rock2'], {count: 8, radius: 60}); },
  Rock: (f, t) => rain(t, ['rock1', 'rock2', 'rock3'], {count: 6, size: 0.9}),
  Dragon: (f, t) => { tint('#2a1f6b', 1000, 0.4); return stream(f, t, 'bluefireball', {count: 7, size: 0.9}).then(() => burst(t, 'bluefireball', {count: 5})); },
  Flying: (f, t) => stream(f, t, 'feather', {count: 7, gap: 50, size: 0.7, spin: 180, wobble: 25}),
  Bug: (f, t) => stream(f, t, 'energyball', {count: 6, size: 0.5, gap: 50}),
  Steel: (f, t) => stream(f, t, 'iceball', {count: 3, size: 0.8}).then(() => shine(t)),
  Fighting: (f, t) => impact(t, 'fist', 1.1, 420),
  Fairy: (f, t) => { tint('#ffb8f0', 1000, 0.3); return stream(f, t, 'mistball', {count: 4, size: 0.7}).then(() => shine(t)); },
  Normal: (f, t) => stream(f, t, 'wisp', {count: 5, size: 0.7}).then(() => impact(t)),
};
// Imagen del golpe en ataques de contacto.
function contactImage(move, type) {
  if (/kick|stomp|step/i.test(move.name)) return 'foot';
  if (type === 'Fighting' || /punch/i.test(move.name)) return 'fist';
  if (/slash|cut|claw|blade|scratch|leaf blade|x-scissor/i.test(move.name)) return 'sword';
  return 'impact';
}
// Movimientos de estado sobre el rival: qué cae encima.
const STATUS_ON_FOE = {Grass: 'petal', Poison: 'poisonwisp', Electric: 'lightning', Psychic: 'mistball', Ghost: 'blackwisp', Dark: 'angry', Bug: 'web', Fire: 'fireball', Water: 'waterwisp', Ice: 'iceball', Fairy: 'heart'};

// Animación del movimiento `moveName` de `userImg` hacia `targetImg`.
export async function animateMove(moveName, userImg, targetImg) {
  if (reduced() || !arena) return;
  const move = dex.moves.get(moveName);
  const type = move.type;
  const from = center(userImg), to = center(targetImg);
  if (move.category === 'Status') {
    const self = ['self', 'allySide', 'allies', 'adjacentAllyOrSelf'].includes(move.target) || move.target === 'all' && !move.status;
    if (self) { userImg.animate([{filter: 'none'}, {filter: 'brightness(1.8) drop-shadow(0 0 12px #fff)'}, {filter: 'none'}], {duration: ms(700)}); return shine(from); }
    return rain(to, STATUS_ON_FOE[type] || 'wisp', {count: 5, size: 0.6, spread: 50});
  }
  if (move.flags?.contact) {
    await lunge(userImg, from, to);
    if (type === 'Ground') shake(arena, 8);
    const extra = {Fire: 'fireball', Electric: 'electroball', Ice: 'iceball', Water: 'waterwisp', Grass: 'leaf1', Poison: 'poisonwisp', Ghost: 'shadowball', Dark: 'blackwisp', Dragon: 'bluefireball'}[type];
    if (extra) burst(to, extra, {count: 5});
    return impact(to, contactImage(move, type));
  }
  return (RANGED[type] || RANGED.Normal)(from, to);
}

// Pokéball lanzada al sacar un Pokémon; termina cuando el Pokémon debe aparecer.
export async function throwBall(img, fromRight) {
  if (reduced() || !arena) return;
  const at = center(img), a = arena.getBoundingClientRect();
  const sx = fromRight ? a.width + 20 : -20, sy = at.y - 40;
  await sprite('pokeball', [
    {x: sx, y: sy, scale: 0.5, rotate: 0},
    {x: (sx + at.x) / 2, y: at.y - 110, scale: 0.55, rotate: fromRight ? -360 : 360, offset: 0.5},
    {x: at.x, y: at.y, scale: 0.5, rotate: fromRight ? -720 : 720},
  ], {duration: 520, easing: 'linear'}).finished.catch(() => {});
  burst(at, 'shine', {count: 8, radius: 45, size: 0.5});
}

// Número flotante sobre el Pokémon (daño en rojo, curación en verde).
export function floatText(img, text, heal) {
  if (!arena) return;
  const at = center(img);
  const f = document.createElement('div');
  f.className = 'fx-num' + (heal ? ' heal' : '');
  f.textContent = text;
  f.style.left = at.x + 'px'; f.style.top = at.y - 30 + 'px';
  arena.append(f);
  f.animate([{transform: 'translate(-50%, 10px) scale(.6)', opacity: 0}, {transform: 'translate(-50%, -10px) scale(1.15)', opacity: 1, offset: 0.25}, {transform: 'translate(-50%, -40px)', opacity: 0}],
    {duration: ms(1100), easing: 'ease-out'}).finished.then(() => f.remove());
}

// Subida o bajada de características: el Pokémon se tiñe de rojo o azul con franjas que suben o bajan.
export function statFx(img, up) {
  if (reduced() || !arena) return Promise.resolve();
  const at = center(img), color = up ? '#ff4d3a' : '#3a7bff';
  img.animate([{filter: 'none'}, {filter: `drop-shadow(0 0 0 ${color}) brightness(1.2) sepia(1) hue-rotate(${up ? -50 : 180}deg) saturate(4)`, offset: 0.3},
    {filter: `drop-shadow(0 0 0 ${color}) brightness(1.2) sepia(1) hue-rotate(${up ? -50 : 180}deg) saturate(4)`, offset: 0.7}, {filter: 'none'}], {duration: ms(900)});
  const out = [];
  for (let i = 0; i < 6; i++) {
    const x = at.x + rnd(-40, 40) * at.s, y0 = at.y + (up ? 40 : -50) * at.s, y1 = at.y + (up ? -60 : 40) * at.s;
    const p = document.createElement('i');
    p.className = 'fx-stripe ' + (up ? 'up' : 'down');
    arena.append(p);
    const a = p.animate([{transform: `translate(${x}px, ${y0}px)`, opacity: 0}, {opacity: 0.9, offset: 0.3}, {transform: `translate(${x}px, ${y1}px)`, opacity: 0}],
      {duration: ms(800), delay: ms(i * 70), fill: 'backwards'});
    a.finished.then(() => p.remove(), () => p.remove());
    out.push(a);
  }
  return settle(out);
}

// Cartel de objeto o habilidad junto al marcador (estilo Showdown).
export function popup(side, html) {
  if (!arena) return;
  const f = document.createElement('div');
  f.className = `fx-pop ${side}`;
  f.innerHTML = html;
  arena.append(f);
  f.animate([{opacity: 0, transform: 'translateX(var(--from))'}, {opacity: 1, transform: 'none', offset: 0.12}, {opacity: 1, offset: 0.85}, {opacity: 0}],
    {duration: ms(1700)}).finished.then(() => f.remove());
}

export {shine as sparkle};
