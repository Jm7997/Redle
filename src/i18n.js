// Idiomas: textos de la interfaz y del combate en español o inglés.
// Los nombres de Pokémon son iguales en ambos (en España se usan los ingleses).
import {Dex} from '@pkmn/sim';
import {Icons} from '@pkmn/img';
import ES from './names-es.json';

const dex = Dex.forGen(9);
const pref = (() => { try { return localStorage.getItem('redle:lang'); } catch { return null; } })();
export const LANG = pref || (navigator.language?.startsWith('es') ? 'es' : 'en');
export function setLang(l) { try { localStorage.setItem('redle:lang', l); } catch {} location.reload(); }

// Iconos de objeto de los juegos (hoja de iconos de Showdown) en lugar de emojis.
export function itemIcon(name) { return `<span class="icon-item" style="${Icons.getItem(name).style}"></span>`; }
// Cada clima y efecto de campo con el objeto que lo representa en los juegos.
export const FIELD_ICON = {Hail: 'Icy Rock', Snowscape: 'Icy Rock', Snow: 'Icy Rock', SunnyDay: 'Heat Rock', RainDance: 'Damp Rock',
  Sandstorm: 'Smooth Rock', 'Electric Terrain': 'Electric Seed', 'Grassy Terrain': 'Grassy Seed', 'Misty Terrain': 'Misty Seed', 'Psychic Terrain': 'Psychic Seed', 'Inverse Battle': 'Ring Target', 'Trick Room': 'Room Service', Gravity: 'Iron Ball'};
const RULE_ICON = {inverse: 'Ring Target', trickroom: 'Room Service', gravity: 'Iron Ball', sun: 'Heat Rock', rain: 'Damp Rock', sand: 'Smooth Rock', snow: 'Icy Rock'};

const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const es = LANG === 'es';

const TYPES_ES = {Normal: 'Normal', Fire: 'Fuego', Water: 'Agua', Grass: 'Planta', Electric: 'Eléctrico', Ice: 'Hielo', Fighting: 'Lucha', Poison: 'Veneno', Ground: 'Tierra', Flying: 'Volador', Psychic: 'Psíquico', Bug: 'Bicho', Rock: 'Roca', Ghost: 'Fantasma', Dragon: 'Dragón', Dark: 'Siniestro', Steel: 'Acero', Fairy: 'Hada', Stellar: 'Astral'};
export const typeName = t => (es ? TYPES_ES[t] : t) || t;

export function moveName(idOrName) {
  const move = dex.moves.get(idOrName);
  if (toID(idOrName).startsWith('hiddenpower') && toID(idOrName) !== 'hiddenpower') {
    return `${es ? 'Poder Oculto' : 'Hidden Power'} ${typeName(move.type)}`;
  }
  return (es && ES.moves[move.id]) || move.name || idOrName;
}
export const itemName = id => (es && ES.items[toID(id)]) || dex.items.get(id).name || '';
export const abilityName = id => (es && ES.abilities[toID(id)]) || dex.abilities.get(id).name || id;

const STRINGS = {
  es: {
    title: 'Redle',
    yourTeam: 'Tu equipo', leadTag: '★ Empieza', you2: 'Tú', history: 'Historial',
    go: '¡Listo, a pelear!',
    footer: 'Proyecto fan no oficial y sin ánimo de lucro. Pokémon © Nintendo, Creatures y GAME FREAK. No afiliado.',
    legalTitle: 'Aviso legal y privacidad',
    legalBody: `<p><b>Proyecto fan no oficial y sin ánimo de lucro.</b> Pokémon y todos los nombres, personajes, imágenes y sonidos relacionados son marcas y © de Nintendo, Creatures Inc. y GAME FREAK inc. Redle no está afiliado, patrocinado ni aprobado por ellos. Si eres titular de algún derecho y quieres que se retire algo, escríbenos a <b>seross000sss@gmail.com</b> y lo haremos.</p>
<p><b>Privacidad.</b> Redle no usa cookies, ni analítica, ni publicidad, ni cuentas con correo o contraseña. Tu progreso, estadísticas y ajustes se guardan en tu navegador (almacenamiento local) y puedes borrarlos con el botón de abajo. Para las <b>estadísticas globales</b>, al terminar cada reto se envía de forma anónima solo el resultado (día, modo, si ganaste, turnos o ronda) junto a un identificador aleatorio de este navegador, a nuestra base de datos en <b>Supabase</b> (UE, Irlanda). No incluye nombre, email ni nada que te identifique. Ese identificador es también tu <b>código de entrenador</b>: con él se guarda una copia de tu progreso (estadísticas, rachas y medallas) para recuperarlo en otro dispositivo. Si eliges un <b>apodo</b>, se muestra en el top del día. Si nos envías una <b>sugerencia</b>, guardamos tu mensaje, el contacto que quieras dejar y datos técnicos para entender fallos (modo, día, idioma, navegador y tamaño de pantalla). El botón de abajo lo borra todo, en tu navegador y en el servidor.</p>
<p><b>Servicios de terceros.</b> Para mostrar sprites, fondos, efectos, gritos y música, tu navegador los descarga de <b>play.pokemonshowdown.com</b> (Smogon), que recibe tu dirección IP como cualquier web que visitas. Las fuentes tipográficas se sirven desde esta misma web.</p>
<p><b>Créditos.</b> Combates: simulador de <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noopener">Pokémon Showdown</a> (MIT) vía <a href="https://github.com/pkmn" target="_blank" rel="noopener">@pkmn</a> (MIT). Nombres en español: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a> (BSD-3). Equipos de los rivales: decompilaciones de <a href="https://github.com/pret" target="_blank" rel="noopener">pret</a>. Fuentes: Pixelify Sans y Nunito (OFL), Luckiest Guy (Apache 2.0).</p>`,
    wipe: 'Borrar mis datos de Redle', wipeConfirm: '¿Seguro? Se borrarán tu progreso, estadísticas, rachas, medallas, apodo y ajustes, en este navegador y en el servidor.',
    howTitle: 'Cómo se juega',
    howNote: 'Mecánicas actuales (Escarlata/Púrpura): tabla de tipos con el tipo Hada y cada movimiento es físico o especial por sí mismo. Pulsa el marcador del rival para ver lo que sabes de él, y el tuyo para ver las estadísticas de tu equipo. Toca el combate para saltar las animaciones.',
    gotIt: '¡Entendido!',
    stats: 'Estadísticas', played: 'Jugadas', winPct: 'Victorias', streak: 'Racha', best: 'Mejor racha de victorias', mvp: 'MVP',
    lostSub: 'Vuelve mañana a por la revancha.',
    share: 'Compartir resultado', copied: '¡Copiado!', close: 'Cerrar', seeResult: 'Ver resultado',
    next: (h, m, s) => `Nuevo reto en ${h}h ${m}m ${s}s`, you: 'Tú',
    settings: 'Ajustes', language: 'Idioma', theme: 'Tema', auto: 'Auto', light: 'Claro', dark: 'Oscuro',
    music: 'Música', sfx: 'Efectos', speed: 'Velocidad', normal: 'Normal', fast: 'Rápida', on: 'Sí', off: 'No',
    turn: n => `Turno ${n}`, who: 'Elige a quién enviar', what: n => `¿Qué hará ${n}?`,
    physical: 'Físico', special: 'Especial', status: 'Estado', power: 'Pot.', acc: 'Prec.',
    superEff: 'Muy eficaz', notVery: 'Poco eficaz', noEffect: 'Sin efecto',
    foeInfo: 'Lo que sabes del rival', revealed: 'Movimientos vistos', none: 'Ninguno todavía', level: 'Nv.',
    // combate
    go1: n => `¡Adelante, ${n}!`,
    foe: n => `${n} enemigo`, uses: (u, m) => `¡${u} usa ${m}!`,
    lost_: (w, p) => `${w} pierde un ${p}% de sus PS.`, gained: (w, p) => `${w} recupera un ${p}% de sus PS.`,
    super: '¡Es muy eficaz!', resisted: 'No es muy eficaz...', immune: w => `No afecta a ${w}...`, crit: '¡Un golpe crítico!',
    miss: w => `¡${w} esquiva el ataque!`, fail: '¡Pero falla!', faint: w => `¡${w} se ha debilitado!`,
    st: {brn: w => `¡${w} se ha quemado!`, par: w => `¡${w} está paralizado! Quizás no pueda moverse.`, slp: w => `¡${w} se ha dormido!`, psn: w => `¡${w} ha sido envenenado!`, tox: w => `¡${w} ha sido gravemente envenenado!`, frz: w => `¡${w} se ha congelado!`},
    cure: {slp: w => `¡${w} se ha despertado!`, frz: w => `¡${w} ya no está congelado!`, _: w => `${w} se ha recuperado de su estado.`},
    cant: {slp: w => `${w} está dormido como un tronco.`, par: w => `¡${w} está paralizado y no se puede mover!`, frz: w => `¡${w} está congelado!`, flinch: w => `¡${w} retrocede!`, recharge: w => `${w} tiene que recargar.`, _: w => `${w} no puede moverse.`},
    boost: (w, s, n) => `¡${s} de ${w} ${n >= 2 ? 'sube mucho' : 'sube'}!`, unboost: (w, s, n) => `¡${s} de ${w} ${n >= 2 ? 'baja mucho' : 'baja'}!`,
    stat: {atk: 'El Ataque', def: 'La Defensa', spa: 'El Ataque Especial', spd: 'La Defensa Especial', spe: 'La Velocidad', accuracy: 'La Precisión', evasion: 'La Evasión'},
    leftovers: w => `${w} recupera PS gracias a los Restos.`, poisonDmg: w => `El veneno resta PS a ${w}.`, burnDmg: w => `La quemadura resta PS a ${w}.`,
    recoil: w => `${w} sufre daño de retroceso.`, weatherDmg: w => `El tiempo daña a ${w}.`, hailDmg: w => `¡El granizo golpea a ${w}!`, hailUpkeep: 'Sigue granizando.', maxDesc: t => `Maxiataque de tipo ${t}. Su potencia depende del ataque original.`, maxGuardDesc: 'Protege de casi cualquier ataque durante un turno.',
    hpShort: 'PS', teraLabel: 'Tera', teraBtn: 'Teracristalizar', megaBtn: 'Megaevolución', dmaxBtn: 'Dinamax', gmaxBtn: 'Gigamax', gmaxTag: 'Gigamax',
    megaEvolved: (w, m) => `¡${w} ha megaevolucionado en ${m}!`, dynamaxed: w => `¡${w} se ha dinamaxizado!`, gigantamaxed: w => `¡${w} se ha gigamaxizado!`, dynamaxEnd: w => `${w} ha vuelto a su tamaño normal.`,
    terastallized: (w, t) => `¡${w} se ha teracristalizado en tipo ${t}!`, forfeit: 'Rendirse',
    forfeitConfirm: '¿Seguro que te rindes? El combate cuenta como derrota y podrás practicar con el mismo equipo.', aHelp: 'Cómo se juega', aSound: 'Activar o silenciar el sonido', recharge: 'Recargar',
    weatherBadge: {Hail: 'Granizo', SunnyDay: 'Sol', RainDance: 'Lluvia', Sandstorm: 'Arena', Snowscape: 'Nieve', Snow: 'Nieve'},
    fieldStart: {'Electric Terrain': '¡Se ha formado un campo de corriente eléctrica!', 'Grassy Terrain': '¡El terreno de combate se ha cubierto de hierba!', 'Misty Terrain': '¡La niebla ha envuelto el terreno de combate!', 'Psychic Terrain': '¡El terreno de combate se ha vuelto muy extraño!', 'Inverse Battle': '¡El combate es inverso! La tabla de tipos va al revés.', 'Trick Room': '¡Las dimensiones se han retorcido! Los lentos atacan primero.', Gravity: '¡La gravedad se ha intensificado!'},
    fieldBadge: {'Electric Terrain': 'Campo Eléctrico', 'Grassy Terrain': 'Campo de Hierba', 'Misty Terrain': 'Campo de Niebla', 'Psychic Terrain': 'Campo Psíquico', 'Inverse Battle': 'Inverso', 'Trick Room': 'Espacio Raro', Gravity: 'Gravedad'}, drain: w => `${w} absorbe energía.`,
    weather: {SunnyDay: 'El sol pega con fuerza.', RainDance: 'Ha empezado a llover.', Sandstorm: 'Se ha levantado una tormenta de arena.', Hail: 'Ha empezado a granizar.', Snowscape: 'Ha empezado a nevar.', Snow: 'Ha empezado a nevar.', none: 'El tiempo vuelve a la normalidad.'},
    sub: w => `¡${w} ha creado un sustituto!`, subEnd: w => `El sustituto de ${w} ha desaparecido.`, subHit: 'El sustituto recibe el golpe.',
    confused: w => `¡${w} está confuso!`, confusedAct: w => `${w} está confuso...`, seeded: w => `¡${w} ha sido infectado!`,
    wishCame: w => `¡El deseo de ${w} se ha hecho realidad!`, healingWish: w => `¡${w} recibe los efectos del deseo y se recupera!`,
    foresaw: (w, m) => `¡${w} ha previsto un ataque con ${m}!`, foresawHit: (w, m) => `¡${w} ha recibido el ataque de ${m}!`,
    taunted: w => `¡${w} se ha dejado engañar por la Mofa!`, encored: w => `¡${w} sufre los efectos de Otra Vez!`, drowsy: w => `¡${w} se está adormilando!`, perish: (w, n) => `Cuenta atrás de ${w}: ${n}.`,
    statusTag: {brn: 'QUE', par: 'PAR', slp: 'DOR', psn: 'ENV', tox: 'TÓX', frz: 'CON'},
    statShort: {atk: 'Atq', def: 'Def', spa: 'AtE', spd: 'DfE', spe: 'Vel', accuracy: 'Pre', evasion: 'Eva'},
    ate: (w, i) => `¡${w} se ha comido su ${i}!`, usedItem: (w, i) => `${w} ha usado su ${i}.`,
    prepare: w => `${w} está cogiendo fuerzas...`, protect: w => `¡${w} se está protegiendo!`, hitcount: n => `¡Ha golpeado ${n} veces!`,
    sideStart: (m, ally) => `¡${m} actúa en el campo ${ally ? 'aliado' : 'rival'}!`,
    hazardStart: {stealthrock: a => `¡${a ? 'Tu equipo' : 'El equipo rival'} está rodeado de piedras puntiagudas!`, spikes: a => `¡${a ? 'Tu equipo' : 'El equipo rival'} está rodeado de púas!`, toxicspikes: a => `¡${a ? 'Tu equipo' : 'El equipo rival'} está rodeado de púas tóxicas!`, stickyweb: a => `¡Una red viscosa se extiende bajo ${a ? 'tu equipo' : 'el equipo rival'}!`}, sideEnd: m => `${m} ha dejado de actuar.`,
    clearBoosts: 'Se han anulado todos los cambios de características.', mimic: w => `${w} se ha transformado.`,
    ability: (w, a) => `${a} de ${w}`, nothing: 'No ha pasado nada.', youTeam: 'Tu equipo', hpLeft: 'PS',
    battleTab: 'Combate', noItem: 'Sin objeto',
    replay: 'Ver repetición', retrySame: 'Reintentar con este equipo', practiceRandom: 'Practicar con equipo aleatorio', newRandom: 'Otro equipo aleatorio',
    practiceBadge: 'Práctica', backToday: 'Volver al reto de hoy',
    summary: 'Resumen del combate', kos: 'K.O.', dmg: 'Daño hecho', taken: 'Recibido',
  },
  en: {
    title: 'Redle',
    yourTeam: 'Your team', leadTag: '★ Lead', you2: 'You', history: 'History',
    go: 'Ready, battle!',
    footer: 'Unofficial non-profit fan project. Pokémon © Nintendo, Creatures and GAME FREAK. Not affiliated.',
    legalTitle: 'Legal notice & privacy',
    legalBody: `<p><b>Unofficial, non-profit fan project.</b> Pokémon and all related names, characters, images and sounds are trademarks and © of Nintendo, Creatures Inc. and GAME FREAK inc. Redle is not affiliated with, sponsored or endorsed by them. If you hold any rights and want something removed, write to <b>seross000sss@gmail.com</b> and we will take it down.</p>
<p><b>Privacy.</b> Redle uses no cookies, analytics, ads or email/password accounts. Your progress, stats and settings are stored in your browser (local storage) and you can delete them with the button below. For the <b>global stats</b>, after each challenge only the result (day, mode, whether you won, turns or round) is sent anonymously with a random ID for this browser to our database on <b>Supabase</b> (EU, Ireland). It contains no name, email or anything that identifies you. That ID is also your <b>trainer code</b>: a copy of your progress (stats, streaks and badges) is saved with it so you can restore it on another device. If you choose a <b>nickname</b>, it is shown in the daily top. If you send us <b>feedback</b>, we store your message, any contact you choose to leave and technical details to understand bugs (mode, day, language, browser and screen size). The button below deletes everything, in your browser and on the server.</p>
<p><b>Third-party services.</b> To show sprites, backgrounds, effects, cries and music, your browser downloads them from <b>play.pokemonshowdown.com</b> (Smogon), which receives your IP address like any website you visit. Fonts are served from this site.</p>
<p><b>Credits.</b> Battles: <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noopener">Pokémon Showdown</a> simulator (MIT) via <a href="https://github.com/pkmn" target="_blank" rel="noopener">@pkmn</a> (MIT). Spanish names: <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a> (BSD-3). Rival teams: <a href="https://github.com/pret" target="_blank" rel="noopener">pret</a> decompilations. Fonts: Pixelify Sans and Nunito (OFL), Luckiest Guy (Apache 2.0).</p>`,
    wipe: 'Delete my Redle data', wipeConfirm: 'Are you sure? This deletes your progress, stats, streaks, badges, nickname and settings, in this browser and on the server.',
    howTitle: 'How to play',
    howNote: "Current mechanics (Scarlet/Violet): today's type chart with Fairy, and each move is physical or special on its own. Tap the foe's panel to see what you know about it, and yours to see your team's stats. Tap the battle to skip animations.",
    gotIt: 'Got it!',
    stats: 'Statistics', played: 'Played', winPct: 'Win %', streak: 'Streak', best: 'Best win streak', mvp: 'MVP',
    lostSub: 'Come back tomorrow for a rematch.',
    share: 'Share result', copied: 'Copied!', close: 'Close', seeResult: 'See result',
    next: (h, m, s) => `New challenge in ${h}h ${m}m ${s}s`, you: 'You',
    settings: 'Settings', language: 'Language', theme: 'Theme', auto: 'Auto', light: 'Light', dark: 'Dark',
    music: 'Music', sfx: 'Sound effects', speed: 'Speed', normal: 'Normal', fast: 'Fast', on: 'On', off: 'Off',
    turn: n => `Turn ${n}`, who: 'Choose who to send out', what: n => `What will ${n} do?`,
    physical: 'Physical', special: 'Special', status: 'Status', power: 'Pow.', acc: 'Acc.',
    superEff: 'Super effective', notVery: 'Not very effective', noEffect: 'No effect',
    foeInfo: 'What you know about the foe', revealed: 'Moves seen', none: 'None yet', level: 'Lv.',
    go1: n => `Go! ${n}!`,
    foe: n => `The opposing ${n}`, uses: (u, m) => `${u} used ${m}!`,
    lost_: (w, p) => `${w} lost ${p}% of its HP.`, gained: (w, p) => `${w} restored ${p}% of its HP.`,
    super: "It's super effective!", resisted: "It's not very effective...", immune: w => `It doesn't affect ${w}...`, crit: 'A critical hit!',
    miss: w => `${w} avoided the attack!`, fail: 'But it failed!', faint: w => `${w} fainted!`,
    st: {brn: w => `${w} was burned!`, par: w => `${w} is paralyzed! It may be unable to move!`, slp: w => `${w} fell asleep!`, psn: w => `${w} was poisoned!`, tox: w => `${w} was badly poisoned!`, frz: w => `${w} was frozen solid!`},
    cure: {slp: w => `${w} woke up!`, frz: w => `${w} thawed out!`, _: w => `${w} was cured of its status.`},
    cant: {slp: w => `${w} is fast asleep.`, par: w => `${w} is paralyzed! It can't move!`, frz: w => `${w} is frozen solid!`, flinch: w => `${w} flinched!`, recharge: w => `${w} must recharge!`, _: w => `${w} can't move!`},
    boost: (w, s, n) => `${w}'s ${s} ${n >= 2 ? 'rose sharply' : 'rose'}!`, unboost: (w, s, n) => `${w}'s ${s} ${n >= 2 ? 'harshly fell' : 'fell'}!`,
    stat: {atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness'},
    leftovers: w => `${w} restored a little HP using its Leftovers!`, poisonDmg: w => `${w} was hurt by poison!`, burnDmg: w => `${w} was hurt by its burn!`,
    recoil: w => `${w} was damaged by the recoil!`, weatherDmg: w => `${w} is buffeted by the weather!`, hailDmg: w => `${w} is pelted by hail!`, hailUpkeep: 'Hail continues to fall.', maxDesc: t => `${t}-type Max Move. Its power depends on the original move.`, maxGuardDesc: 'Protects from almost any attack for one turn.',
    hpShort: 'HP', teraLabel: 'Tera', teraBtn: 'Terastallize', megaBtn: 'Mega Evolution', dmaxBtn: 'Dynamax', gmaxBtn: 'Gigantamax', gmaxTag: 'Gigantamax',
    megaEvolved: (w, m) => `${w} has Mega Evolved into ${m}!`, dynamaxed: w => `${w} Dynamaxed!`, gigantamaxed: w => `${w} Gigantamaxed!`, dynamaxEnd: w => `${w} returned to normal!`,
    terastallized: (w, t) => `${w} terastallized into the ${t} type!`, forfeit: 'Forfeit',
    forfeitConfirm: 'Are you sure you want to forfeit? It counts as a loss and you can practice with the same team.', aHelp: 'How to play', aSound: 'Toggle sound', recharge: 'Recharge',
    weatherBadge: {Hail: 'Hail', SunnyDay: 'Sun', RainDance: 'Rain', Sandstorm: 'Sand', Snowscape: 'Snow', Snow: 'Snow'},
    fieldStart: {'Electric Terrain': 'An electric current ran across the battlefield!', 'Grassy Terrain': 'Grass grew to cover the battlefield!', 'Misty Terrain': 'Mist swirled around the battlefield!', 'Psychic Terrain': 'The battlefield got weird!', 'Inverse Battle': 'This is an inverse battle! The type chart is flipped.', 'Trick Room': 'The dimensions were twisted! Slower Pokémon move first.', Gravity: 'Gravity intensified!'},
    fieldBadge: {'Electric Terrain': 'Electric Terrain', 'Grassy Terrain': 'Grassy Terrain', 'Misty Terrain': 'Misty Terrain', 'Psychic Terrain': 'Psychic Terrain', 'Inverse Battle': 'Inverse', 'Trick Room': 'Trick Room', Gravity: 'Gravity'}, drain: w => `${w} had its energy drained!`,
    weather: {SunnyDay: 'The sunlight turned harsh!', RainDance: 'It started to rain!', Sandstorm: 'A sandstorm kicked up!', Hail: 'It started to hail!', Snowscape: 'It started to snow!', Snow: 'It started to snow!', none: 'The weather returned to normal.'},
    sub: w => `${w} put in a substitute!`, subEnd: w => `${w}'s substitute faded!`, subHit: 'The substitute took damage for it!',
    confused: w => `${w} became confused!`, confusedAct: w => `${w} is confused!`, seeded: w => `${w} was seeded!`,
    wishCame: w => `${w}'s wish came true!`, healingWish: w => `The healing wish came true for ${w}!`,
    foresaw: (w, m) => `${w} foresaw an attack with ${m}!`, foresawHit: (w, m) => `${w} took the ${m} attack!`,
    taunted: w => `${w} fell for the taunt!`, encored: w => `${w} must do an encore!`, drowsy: w => `${w} grew drowsy!`, perish: (w, n) => `${w}'s perish count fell to ${n}.`,
    statusTag: {brn: 'BRN', par: 'PAR', slp: 'SLP', psn: 'PSN', tox: 'TOX', frz: 'FRZ'},
    statShort: {atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva'},
    ate: (w, i) => `${w} ate its ${i}!`, usedItem: (w, i) => `${w} used its ${i}.`,
    prepare: w => `${w} is gathering power...`, protect: w => `${w} protected itself!`, hitcount: n => `Hit ${n} times!`,
    sideStart: (m, ally) => `${m} now protects ${ally ? 'your' : 'the opposing'} team!`,
    hazardStart: {stealthrock: a => `Pointed stones float in the air around ${a ? 'your' : 'the opposing'} team!`, spikes: a => `Spikes were scattered on the ground all around ${a ? 'your' : 'the opposing'} team!`, toxicspikes: a => `Poison spikes were scattered on the ground all around ${a ? 'your' : 'the opposing'} team!`, stickyweb: a => `A sticky web has been laid out on the ground around ${a ? 'your' : 'the opposing'} team!`}, sideEnd: m => `${m} wore off.`,
    clearBoosts: 'All stat changes were eliminated!', mimic: w => `${w} transformed!`,
    ability: (w, a) => `${w}'s ${a}`, nothing: 'Nothing happened.', youTeam: 'Your team', hpLeft: 'HP',
    battleTab: 'Battle', noItem: 'No item',
    replay: 'Watch replay', retrySame: 'Retry with this team', practiceRandom: 'Practice with a random team', newRandom: 'Another random team',
    practiceBadge: 'Practice', backToday: "Back to today's challenge",
    summary: 'Battle summary', kos: 'KOs', dmg: 'Damage dealt', taken: 'Taken',
  },
};

export const T = STRINGS[LANG];

// Descripciones de los ataques (texto oficial de los juegos, vía PokéAPI). Solo se descarga el idioma en uso.
const descs = {};
export const loadMoveDescs = () => (es ? import('./move-desc-es.json') : import('./move-desc-en.json')).then(m => Object.assign(descs, m.default));
export const moveDesc = id => descs[toID(id)] || '';

// Textos que dependen del rival. `team` es la lista de especies separada por comas.
// Textos que dependen del rival: lugar, frases y la regla de su escenario (stage).
const BOSS_TEXT = {
  es: {
    blue: {place: 'el Gimnasio de Ciudad Verde', where: 'Ciudad Verde', f: false, challenge: '¡Blue quiere luchar!', wonSub: '¿Quién es ahora el mejor entrenador del mundo?', title: 'el Líder'},
    red: {place: 'la cima del Monte Plateado', where: 'Monte Plateado', f: false, challenge: '¡Red quiere luchar!', wonSub: 'La cima es tuya. Por hoy.', title: 'la leyenda',
      stage: itemIcon('Icy Rock') + ' <b>En la cima graniza todo el combate</b>: cada turno daña a los Pokémon que no son de tipo Hielo, y la Ventisca (la llevan Lapras, Snorlax y Blastoise) <b>nunca falla</b>.'},
    lance: {place: 'la sala del Campeón de la Liga Johto', where: 'Liga Johto', f: false, challenge: '¡El Campeón Lance quiere luchar!', wonSub: 'Has domado a los dragones. Por hoy.', title: 'el Campeón'},
    steven: {place: 'la sala del Campeón de la Liga Hoenn', where: 'Liga Hoenn', f: false, challenge: '¡El Campeón Steven quiere luchar!', wonSub: 'Hasta el acero se rompe. Por hoy.', title: 'el Campeón'},
    wallace: {place: 'la sala del Campeón de la Liga Hoenn', where: 'Arrecípolis', f: false, challenge: '¡El Campeón Wallace quiere luchar!', wonSub: 'Has superado su elegancia. Por hoy.', title: 'el Campeón'},
    cynthia: {place: 'la sala de la Campeona de la Liga Sinnoh', where: 'Liga Sinnoh', f: true, challenge: '¡La Campeona Cynthia quiere luchar!', wonSub: 'Eres el nuevo Campeón de Sinnoh. Por hoy.', title: 'la Campeona'},
    iris: {place: 'la sala de la Campeona de la Liga Teselia', where: 'Liga Teselia', f: true, challenge: '¡La Campeona Iris quiere luchar!', wonSub: 'Los dragones de Iris han caído. Por hoy.', title: 'la Campeona'},
    leon: {place: 'el Estadio Puntera de Galar', where: 'Galar', f: false, challenge: '¡El Campeón Leon quiere luchar!', wonSub: 'Has acabado con el reinado de Leon. Por hoy.', title: 'el Campeón'},
  },
  en: {
    blue: {place: 'the Viridian City Gym', where: 'Viridian City', challenge: 'Blue wants to battle!', wonSub: "Who's the best trainer in the world now?", title: 'the Leader'},
    red: {place: 'the summit of Mt. Silver', where: 'Mt. Silver', challenge: 'Red wants to battle!', wonSub: 'The summit is yours. For today.', title: 'the legend',
      stage: itemIcon('Icy Rock') + ' <b>It hails for the whole battle at the summit</b>: every turn it hurts Pokémon that are not Ice-type, and Blizzard (Lapras, Snorlax and Blastoise know it) <b>never misses</b>.'},
    lance: {place: "the Johto League Champion's room", where: 'Johto League', challenge: 'Champion Lance wants to battle!', wonSub: 'You tamed the dragons. For today.', title: 'the Champion'},
    steven: {place: "the Hoenn League Champion's room", where: 'Hoenn League', challenge: 'Champion Steven wants to battle!', wonSub: 'Even steel breaks. For today.', title: 'the Champion'},
    wallace: {place: "the Hoenn League Champion's room", where: 'Sootopolis', challenge: 'Champion Wallace wants to battle!', wonSub: 'You outshone his elegance. For today.', title: 'the Champion'},
    cynthia: {place: "the Sinnoh League Champion's room", where: 'Sinnoh League', challenge: 'Champion Cynthia wants to battle!', wonSub: "You are Sinnoh's new Champion. For today.", title: 'the Champion'},
    iris: {place: "the Unova League Champion's room", where: 'Unova League', challenge: 'Champion Iris wants to battle!', wonSub: "Iris's dragons have fallen. For today.", title: 'the Champion'},
    leon: {place: 'Wyndon Stadium in Galar', where: 'Galar', challenge: 'Champion Leon wants to battle!', wonSub: "You ended Leon's reign. For today.", title: 'the Champion'},
  },
};
const ORD = n => (es ? `${n}.ª` : `${n}`);
const gensText = ([lo, hi]) => es
  ? (lo === hi ? `Tus Pokémon son de la <b>${ORD(lo)} generación</b>.` : `Tus Pokémon son de las <b>generaciones ${lo} a ${hi}</b>.`)
  : (lo === hi ? `Your Pokémon are from <b>Generation ${lo}</b>.` : `Your Pokémon are from <b>Generations ${lo} to ${hi}</b>.`);

// Reglas del día (mismas para todos los combates de ese día).
export const RULE_TEXT = es ? {
  inverse: ['Combate inverso', 'la tabla de tipos va al revés: lo muy eficaz es poco eficaz y las inmunidades reciben el doble.'],
  trickroom: ['Espacio Raro', 'todo el combate: <b>los más lentos atacan primero</b>.'],
  gravity: ['Gravedad', 'todo el combate: nadie levita, los ataques aciertan más y no se pueden usar movimientos que vuelan o saltan.'],
  sun: ['Sol abrasador', 'todo el combate: potencia el Fuego y debilita el Agua.'],
  rain: ['Lluvia', 'todo el combate: potencia el Agua y debilita el Fuego.'],
  sand: ['Tormenta de arena', 'todo el combate: daña a los que no son Roca, Tierra o Acero.'],
  snow: ['Nevada', 'todo el combate: sube la Defensa de los tipo Hielo.'],
} : {
  inverse: ['Inverse battle', 'the type chart is flipped: super effective becomes not very effective and immunities take double.'],
  trickroom: ['Trick Room', 'all battle long: <b>slower Pokémon move first</b>.'],
  gravity: ['Gravity', 'all battle long: nothing levitates, moves are more accurate and flying or jumping moves cannot be used.'],
  sun: ['Harsh sunlight', 'all battle long: powers up Fire and weakens Water.'],
  rain: ['Rain', 'all battle long: powers up Water and weakens Fire.'],
  sand: ['Sandstorm', 'all battle long: hurts anything that is not Rock, Ground or Steel.'],
  snow: ['Snow', 'all battle long: raises the Defense of Ice types.'],
};
export const ruleHtml = rule => RULE_TEXT[rule] ? `${itemIcon(RULE_ICON[rule])} <b>${es ? 'Regla del día' : "Today's rule"}: ${RULE_TEXT[rule][0]}</b> — ${RULE_TEXT[rule][1]}` : '';

export function setBoss(id, name, team, gens) {
  const b = BOSS_TEXT[LANG][id];
  const itemsText = es ? `${itemIcon('Leftovers')} <b>Todos los Pokémon de ${name} llevan objeto</b>.` : `${itemIcon('Leftovers')} <b>All of ${name}'s Pokémon hold an item</b>.`;
  const rule = gensText(gens);
  Object.assign(T, es ? {
    lead: `${name} te espera en ${b.place}. Este es tu equipo de hoy, el mismo para todo el mundo. <b>Toca el Pokémon que quieres que empiece</b> y pulsa ¡Listo!`,
    stageRules: [b.stage, itemsText].filter(Boolean).join('<br>'),
    bossTeam: `El equipo de ${name}`, challenge: b.challenge, where: b.where, wonSub: b.wonSub, bossTitle: b.title,
    how: ['Cada día recibes un <b>equipo de 6 Pokémon</b> nuevo, el mismo para todo el mundo.', `Mira tu equipo y el de ${name}, y <b>elige quién empieza</b>.`,
      `Derrota al equipo de <b>${name}</b>, el mismo que en los juegos: ${team}. Todos a nivel 100 y con objeto.`, rule, b.stage,
      'Algunos días hay una <b>regla del día</b> (combate inverso, Espacio Raro, clima…).',
      'Solo tienes <b>un intento</b>. Recargar la página no lo reinicia.', 'Comparte tu resultado y vuelve mañana para no romper la racha.',
      'En <b>Liga</b> te enfrentas a 5 rivales seguidos con otro equipo (Gen 1-9).'],
    won: `¡Has ganado a ${name}!`, lost: `${name} sigue ${b.f ? 'invicta' : 'invicto'}...`,
    shareWin: t => `🏆 ¡${name} ${b.f ? 'derrotada' : 'derrotado'} en ${t} turnos!`, shareLoss: t => `💀 ${name} ganó (turno ${t})`, red: name,
    redSends: n => `¡${name} envía a ${n}!`, win: `¡Has derrotado a ${name}!`, lose: `${name} te ha derrotado...`,
  } : {
    lead: `${name} awaits you at ${b.place}. This is today's team, the same for everyone. <b>Tap the Pokémon you want to lead</b> and press Ready!`,
    stageRules: [b.stage, itemsText].filter(Boolean).join('<br>'),
    bossTeam: `${name}'s team`, challenge: b.challenge, where: b.where, wonSub: b.wonSub, bossTitle: b.title,
    how: ['Every day you get a new <b>team of 6 Pokémon</b>, the same for everyone.', `Check your team and ${name}'s, and <b>choose your lead</b>.`,
      `Defeat <b>${name}</b>'s team, the same as in the games: ${team}. All at level 100 and holding items.`, rule, b.stage,
      'Some days there is a <b>rule of the day</b> (inverse battle, Trick Room, weather…).',
      'You get <b>one attempt</b>. Reloading the page does not reset it.', 'Share your result and come back tomorrow to keep your streak.',
      'In <b>League</b> you face 5 rivals in a row with another team (Gens 1-9).'],
    won: `You beat ${name}!`, lost: `${name} remains undefeated...`,
    shareWin: t => `🏆 Beat ${name} in ${t} turns!`, shareLoss: t => `💀 ${name} won (turn ${t})`, red: name,
    redSends: n => `${name} sent out ${n}!`, win: `You defeated ${name}!`, lose: `${name} defeated you...`,
  });
}

// Modo Liga y repeticiones.
Object.assign(T, es ? {
  globalTitle: 'Hoy, entre todos', globalPlayers: n => `${n.toLocaleString('es')} ${n === 1 ? 'jugador' : 'jugadores'}`,
  globalWins: p => `ha ganado el <b>${p}%</b>`, globalTurns: t => `media de ${t} turnos al ganar`,
  globalChampions: (n, p) => `<b>${n}</b> ${n === 1 ? 'campeón' : 'campeones'} (${p}%)`, globalBetter: p => `Has llegado más lejos que el <b>${p}%</b>.`,
  league: 'Liga', leagueWhere: 'Alto Mando y Campeón',
  leagueLead: (round, name, title) => `<b>Ronda ${round} de 5</b>: ${round === 5 ? `el <b>Campeón</b> de hoy es ${name}` : `Alto Mando: <b>${name}</b>`}. Este es tu equipo de Liga (Gen 1-9), el mismo para todo el mundo; se cura entre combates. <b>Toca el Pokémon que quieres que empiece</b> y pulsa ¡Listo!`,
  eliteN: n => `Alto Mando ${n}`, champion: 'Campeón',
  leagueChallenge: (round, name) => round === 5 ? `¡El Campeón ${name} quiere luchar!` : `¡${name}, del Alto Mando, quiere luchar!`,
  nextRival: name => `Siguiente rival: ${name}`,
  leagueWon: '¡Eres el Campeón de la Liga!', leagueLost: n => `Fin de la Liga en la ronda ${n}`,
  leagueWonSub: 'Has vencido a los 5. Hoy la Liga es tuya.', leagueLostSub: 'Vuelve mañana a por otro intento.',
  leagueShare: n => n === 5 ? '🏆 ¡Campeón de la Liga!' : `🏅 ${n}/5 rivales vencidos`,
  bestRound: 'Mejor ronda', champions: 'Veces campeón',
  shareReplay: 'Compartir repetición', replayCopied: '¡Enlace copiado!',
  replayBanner: (name, date) => `▶ Repetición de un combate contra <b>${name}</b> del ${date}.`, playToday: 'Jugar el reto de hoy',
  feedbackLink: 'Enviar sugerencia o fallo', feedbackTitle: 'Sugerencias y fallos', feedbackIntro: 'Cuéntame qué mejorarías o qué ha fallado. Lo leo todo.',
  fbBug: 'Fallo', fbIdea: 'Idea', fbOther: 'Otro', fbMessage: 'Tu mensaje', fbContact: 'Contacto opcional (Reddit, Discord…) si quieres respuesta',
  fbSend: 'Enviar', fbThanks: '¡Gracias! Mensaje enviado.', fbError: 'No se pudo enviar (sin conexión o demasiados mensajes hoy).', fbShort: 'Escribe un poco más.',
  trainerBtn: 'Tarjeta de entrenador', trainerTitle: 'Tarjeta de entrenador', medalsTitle: 'Medallas', medalOf: n => `Ganar a ${n}`,
  medalLiga: 'Campeón de la Liga', medalStreak: n => `${n} días seguidos`, anon: 'Entrenador anónimo',
  cardWins: 'Victorias', cardPlayed: 'Combates', cardStreak: 'Racha', cardBest: 'Mejor racha', cardMvp: 'MVP favorito',
  nickLabel: 'Apodo para el top del día', nickHint: '3-16 letras o números. Déjalo vacío para salir como anónimo.', save: 'Guardar',
  nickSaved: 'Apodo guardado.', nickBad: 'Ese apodo no se acepta.', offline: 'Sin conexión, prueba luego.',
  codeTitle: 'Tu código de entrenador', copy: 'Copiar',
  codeHint: 'Con este código recuperas tu progreso (medallas, rachas y estadísticas) en otro móvil u ordenador. No lo compartas: quien lo tenga puede usar tu progreso.',
  restoreLabel: 'Usar el código de otro dispositivo', restoreBtn: 'Recuperar', restoreConfirm: '¿Recuperar ese progreso? Sustituirá el de este navegador.',
  restoreBad: 'Código no válido.', restoreNone: 'No hay progreso guardado con ese código.', backupNote: 'Tu progreso se guarda solo al terminar cada reto.',
  topTitle: 'Top del día', topTurns: t => `${t} turnos`, topKos: k => `${k}/6 K.O.`, shareCard: 'Compartir tarjeta',
  cardShare: (name, m, total, streak) => `Redle · Tarjeta de entrenador
${name}
🏅 Medallas: ${m}/${total}
🔥 Racha: ${streak} ${streak === 1 ? 'día' : 'días'}`,
  rPrev: '◀ Turno anterior', rNext: 'Turno siguiente ▶', rPause: 'Pausa', rPlay: 'Seguir', rEnd: 'Ir al final', rStart: 'Inicio', rTurn: 'Ir al turno', rTurnN: t => `Turno ${t}`,
  welcome: 'Cada día, el mismo reto para todo el mundo: <b>tu equipo de 6 contra un entrenador legendario</b> con su equipo de los juegos. <b>Toca quién empieza</b>, pulsa ¡Listo! y comparte tu resultado. Un intento al día por rival; después puedes practicar.',
  rulesTitle: 'Reglas de este combate', showDetails: 'Ver estadísticas y ataques ▾', hideDetails: 'Ocultar estadísticas y ataques ▴',
  leagueProgress: (round, left) => `Ronda ${round}/5 · ${left ? `${left === 1 ? 'queda 1 rival' : `quedan ${left} rivales`} después` : '¡último rival!'}`,
  shareLeft: n => `le dejé a ${n} Pokémon`, shareStreak: n => `🔥 ${n} ${n === 1 ? 'día' : 'días'} seguidos`,
  playStreak: 'Días seguidos', rankLine: (pos, total) => `Tu puesto hoy: <b>#${pos}</b> de ${total.toLocaleString('es')}`,
} : {
  globalTitle: 'Today, everyone', globalPlayers: n => `${n.toLocaleString('en')} ${n === 1 ? 'player' : 'players'}`,
  globalWins: p => `<b>${p}%</b> won`, globalTurns: t => `${t} turns on average to win`,
  globalChampions: (n, p) => `<b>${n}</b> ${n === 1 ? 'champion' : 'champions'} (${p}%)`, globalBetter: p => `You got further than <b>${p}%</b>.`,
  league: 'League', leagueWhere: 'Elite Four & Champion',
  leagueLead: (round, name, title) => `<b>Round ${round} of 5</b>: ${round === 5 ? `today's <b>Champion</b> is ${name}` : `Elite Four: <b>${name}</b>`}. This is your League team (Gens 1-9), the same for everyone; it is healed between battles. <b>Tap the Pokémon you want to lead</b> and press Ready!`,
  eliteN: n => `Elite Four ${n}`, champion: 'Champion',
  leagueChallenge: (round, name) => round === 5 ? `Champion ${name} wants to battle!` : `Elite Four ${name} wants to battle!`,
  nextRival: name => `Next rival: ${name}`,
  leagueWon: 'You are the League Champion!', leagueLost: n => `League over in round ${n}`,
  leagueWonSub: 'You beat all 5. Today the League is yours.', leagueLostSub: 'Come back tomorrow for another run.',
  leagueShare: n => n === 5 ? '🏆 League Champion!' : `🏅 ${n}/5 rivals beaten`,
  bestRound: 'Best round', champions: 'Times champion',
  shareReplay: 'Share replay', replayCopied: 'Link copied!',
  replayBanner: (name, date) => `▶ Replay of a battle against <b>${name}</b> on ${date}.`, playToday: "Play today's challenge",
  feedbackLink: 'Send feedback or report a bug', feedbackTitle: 'Feedback & bugs', feedbackIntro: 'Tell me what you would improve or what went wrong. I read everything.',
  fbBug: 'Bug', fbIdea: 'Idea', fbOther: 'Other', fbMessage: 'Your message', fbContact: 'Optional contact (Reddit, Discord…) if you want a reply',
  fbSend: 'Send', fbThanks: 'Thanks! Message sent.', fbError: "Couldn't send it (offline or too many messages today).", fbShort: 'Write a bit more.',
  trainerBtn: 'Trainer card', trainerTitle: 'Trainer card', medalsTitle: 'Badges', medalOf: n => `Beat ${n}`,
  medalLiga: 'League Champion', medalStreak: n => `${n}-day streak`, anon: 'Anonymous trainer',
  cardWins: 'Wins', cardPlayed: 'Battles', cardStreak: 'Streak', cardBest: 'Best streak', cardMvp: 'Favourite MVP',
  nickLabel: 'Nickname for the daily top', nickHint: '3-16 letters or numbers. Leave it empty to stay anonymous.', save: 'Save',
  nickSaved: 'Nickname saved.', nickBad: 'That nickname is not allowed.', offline: 'Offline, try again later.',
  codeTitle: 'Your trainer code', copy: 'Copy',
  codeHint: 'Use this code to get your progress (badges, streaks and stats) on another phone or computer. Keep it private: anyone with it can use your progress.',
  restoreLabel: 'Use a code from another device', restoreBtn: 'Restore', restoreConfirm: 'Restore that progress? It will replace the one in this browser.',
  restoreBad: 'Invalid code.', restoreNone: 'There is no saved progress for that code.', backupNote: 'Your progress is backed up automatically after each challenge.',
  topTitle: "Today's top", topTurns: t => `${t} turns`, topKos: k => `${k}/6 KOs`, shareCard: 'Share card',
  cardShare: (name, m, total, streak) => `Redle · Trainer card
${name}
🏅 Badges: ${m}/${total}
🔥 Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`,
  rPrev: '◀ Previous turn', rNext: 'Next turn ▶', rPause: 'Pause', rPlay: 'Resume', rEnd: 'Skip to end', rStart: 'Start', rTurn: 'Go to turn', rTurnN: t => `Turn ${t}`,
  welcome: 'Every day, the same challenge for everyone: <b>your team of 6 against a legendary trainer</b> with their real in-game team. <b>Tap your lead</b>, press Ready! and share your result. One try per rival per day; you can practice afterwards.',
  rulesTitle: 'Rules for this battle', showDetails: 'Show stats and moves ▾', hideDetails: 'Hide stats and moves ▴',
  leagueProgress: (round, left) => `Round ${round}/5 · ${left ? `${left} more ${left === 1 ? 'rival' : 'rivals'} after this` : 'final rival!'}`,
  shareLeft: n => `left them with ${n} Pokémon`, shareStreak: n => `🔥 ${n}-day streak`,
  playStreak: 'Day streak', rankLine: (pos, total) => `Your rank today: <b>#${pos}</b> of ${total.toLocaleString('en')}`,
});
