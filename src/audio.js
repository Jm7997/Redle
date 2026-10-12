// Sonido: música de combate y gritos desde el CDN de Showdown; golpes y efectos sintetizados con WebAudio.
let ctx, master, musicGain, sfxGain, track, alarm;
const prefs = (() => { try { return JSON.parse(localStorage.getItem('redle:audio')) || {}; } catch { return {}; } })();
export const audio = {music: prefs.music ?? true, sfx: prefs.sfx ?? true};
const savePrefs = () => { try { localStorage.setItem('redle:audio', JSON.stringify(audio)); } catch {} };
const MUSIC_VOL = 0.3, SFX_VOL = 0.8;

// El navegador solo permite sonido tras un gesto del usuario.
function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = audio.music ? MUSIC_VOL : 0; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = audio.sfx ? SFX_VOL : 0; sfxGain.connect(master);
}
addEventListener('pointerdown', init, {passive: true});

export function setMusic(on) { audio.music = on; savePrefs(); if (musicGain) musicGain.gain.value = on ? MUSIC_VOL : 0; if (bgm) { bgm.volume = on ? MUSIC_EL_VOL : 0; if (on) bgm.play().catch(() => {}); } }
export function setSfx(on) { audio.sfx = on; savePrefs(); if (sfxGain) sfxGain.gain.value = on ? SFX_VOL : 0; }

const hz = n => 440 * 2 ** ((n - 69) / 12);
const NOTE = {C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11};
const midi = s => { const [, n, o] = s.match(/^([A-G]#?)(\d)$/); return NOTE[n] + 12 * (+o + 1); };

function tone(dest, type, freq, t, dur, vol, slideTo) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf;
function noise(dest, t, dur, vol, freq = 1000, type = 'highpass') {
  noiseBuf ||= (() => { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t + dur);
}

// ---------- música ----------
// Música de combate de los juegos, servida por Pokémon Showdown (igual que los sprites).
// Cada rival tiene su lista de pistas (STAGES en main.js) y va cambiando cada día.
const SD = 'https://play.pokemonshowdown.com/audio/';
const MUSIC_EL_VOL = 0.4;
let bgm;

// ponytail: bucle de la pista entera (incluida la intro); usar los loopstart/loopend de Showdown si se nota.
export function playMusic(name) {
  init();
  if (track === name) return;
  track = name;
  if (bgm) { const old = bgm; fade(old, 0, 600).then(() => old.pause()); bgm = null; }
  if (!name) return;
  bgm = new Audio(SD + name + '.mp3');
  bgm.loop = true;
  bgm.volume = audio.music ? MUSIC_EL_VOL : 0;
  bgm.play().catch(() => {});
}
function fade(el, to, ms) {
  const from = el.volume, t0 = performance.now();
  return new Promise(res => {
    const tick = now => {
      const k = Math.min(1, (now - t0) / ms);
      el.volume = from + (to - from) * k;
      k < 1 ? requestAnimationFrame(tick) : res();
    };
    requestAnimationFrame(tick);
  });
}

// Fanfarria corta de fin de combate (sintetizada).
const seq = s => s.trim().split(/\s+/).map(x => { const [n, d = 1] = x.split(':'); return [n === '-' ? null : midi(n), +d]; });
const JINGLES = {
  win: {bpm: 150, notes: seq('C5 E5 G5 C6:2 G5 C6:2 D6 E6:6'), bass: seq('C3:4 G2:4 C3:7')},
  lose: {bpm: 90, notes: seq('E5:2 D#5:2 D5:2 C#5:6'), bass: seq('A2:2 G#2:2 G2:2 F#2:6')},
};
export function jingle(name) {
  playMusic(null);
  if (!ctx) return;
  const j = JINGLES[name], step = 60 / j.bpm / 2;
  for (const [part, wave, vol] of [[j.notes, 'square', 0.2], [j.bass, 'triangle', 0.45]]) {
    let t = ctx.currentTime + 0.7;
    for (const [n, d] of part) { if (n) tone(musicGain, wave, hz(n), t, step * d * 0.95, vol); t += step * d; }
  }
}

// Grito del Pokémon (al salir; más grave y lento al debilitarse, como en los juegos).
export function cry(speciesId, faint) {
  if (!audio.sfx) return Promise.resolve();
  const a = new Audio(`${SD}cries/${speciesId}.mp3`);
  a.volume = 0.55;
  if (faint) { a.preservesPitch = false; a.playbackRate = 0.75; }
  return a.play().catch(() => {});
}

// Alarma de vida baja (pitido intermitente mientras tu Pokémon tenga ≤ 20 % de PS).
export function lowHpAlarm(on) {
  if (!on) { clearInterval(alarm); alarm = null; return; }
  if (alarm || !ctx) return;
  alarm = setInterval(() => {
    if (!audio.sfx) return;
    const t = ctx.currentTime;
    tone(sfxGain, 'square', 988, t, 0.09, 0.07); tone(sfxGain, 'square', 784, t + 0.11, 0.09, 0.07);
  }, 600);
}

// ---------- efectos ----------
const ATTACK = {
  Fire: t => noise(sfxGain, t, 0.45, 0.4, 600, 'lowpass'),
  Water: t => [0, 1, 2, 3].forEach(i => tone(sfxGain, 'sine', 300 + i * 120, t + i * 0.06, 0.08, 0.3, 900)),
  Electric: t => [0, 1, 2, 3, 4].forEach(i => tone(sfxGain, 'square', i % 2 ? 1800 : 600, t + i * 0.04, 0.04, 0.15)),
  Grass: t => noise(sfxGain, t, 0.3, 0.25, 3000, 'bandpass'),
  Ice: t => [0, 1, 2].forEach(i => tone(sfxGain, 'triangle', 2000 + i * 400, t + i * 0.05, 0.15, 0.2)),
  Psychic: t => tone(sfxGain, 'sine', 300, t, 0.5, 0.3, 1200),
  Ghost: t => tone(sfxGain, 'sine', 600, t, 0.5, 0.3, 150),
  Dark: t => tone(sfxGain, 'sawtooth', 200, t, 0.3, 0.2, 80),
  Dragon: t => tone(sfxGain, 'sawtooth', 120, t, 0.4, 0.3, 400),
  Ground: t => noise(sfxGain, t, 0.5, 0.6, 200, 'lowpass'),
  Rock: t => noise(sfxGain, t, 0.35, 0.5, 400, 'lowpass'),
  Poison: t => [0, 1, 2].forEach(i => tone(sfxGain, 'sine', 200 + i * 60, t + i * 0.08, 0.1, 0.3, 500)),
};
export function sfx(kind, type) {
  if (!ctx || !audio.sfx) return;
  const t = ctx.currentTime;
  switch (kind) {
    case 'click': tone(sfxGain, 'square', 1046, t, 0.04, 0.12); break;
    case 'attack': (ATTACK[type] || (s => noise(sfxGain, s, 0.2, 0.3, 2500)))(t); break;
    case 'hit': noise(sfxGain, t, 0.15, 0.55, 300); tone(sfxGain, 'square', 180, t, 0.12, 0.3, 50); break;
    case 'super': // golpe doble y más fuerte
      noise(sfxGain, t, 0.12, 0.7, 200); tone(sfxGain, 'square', 260, t, 0.1, 0.35, 60);
      noise(sfxGain, t + 0.12, 0.25, 0.8, 150); tone(sfxGain, 'sawtooth', 200, t + 0.12, 0.25, 0.35, 40); break;
    case 'weak': noise(sfxGain, t, 0.1, 0.3, 1500); tone(sfxGain, 'square', 300, t, 0.06, 0.12, 200); break;
    case 'crit': tone(sfxGain, 'square', 1320, t, 0.06, 0.2); tone(sfxGain, 'square', 1760, t + 0.06, 0.1, 0.2); break;
    case 'faint': tone(sfxGain, 'square', 700, t, 0.8, 0.25, 60); break;
    case 'switch': // Pokéball que se abre
      tone(sfxGain, 'square', 1200, t, 0.05, 0.15); noise(sfxGain, t + 0.05, 0.15, 0.3, 3000); tone(sfxGain, 'square', 300, t + 0.1, 0.25, 0.2, 1100); break;
    case 'heal': [0, 4, 7, 12].forEach((s, i) => tone(sfxGain, 'triangle', hz(76 + s), t + i * 0.07, 0.14, 0.35)); break;
    case 'status': tone(sfxGain, 'sine', 500, t, 0.35, 0.3, 250); tone(sfxGain, 'sine', 520, t + 0.12, 0.35, 0.2, 260); break;
    case 'boost': [0, 1, 2, 3].forEach(i => tone(sfxGain, 'square', 500 + i * 220, t + i * 0.07, 0.09, 0.14)); break;
    case 'drop': [0, 1, 2, 3].forEach(i => tone(sfxGain, 'square', 1200 - i * 220, t + i * 0.07, 0.09, 0.14)); break;
    case 'item': tone(sfxGain, 'triangle', 1318, t, 0.08, 0.25); tone(sfxGain, 'triangle', 1760, t + 0.08, 0.15, 0.25); break;
    case 'miss': tone(sfxGain, 'sine', 900, t, 0.2, 0.2, 1800); break;
    case 'encounter': // destellos de inicio de combate
      for (let i = 0; i < 6; i++) tone(sfxGain, 'square', i % 2 ? 1400 : 700, t + i * 0.09, 0.07, 0.12);
      noise(sfxGain, t + 0.55, 0.6, 0.35, 2000); break;
  }
}
