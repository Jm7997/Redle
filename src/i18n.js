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
export const RULE_ICON = {inverse: 'Ring Target', trickroom: 'Room Service', gravity: 'Iron Ball', sun: 'Heat Rock', rain: 'Damp Rock', sand: 'Smooth Rock', snow: 'Icy Rock'};

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
    yourTeam: 'Tu equipo', foeTeam: 'Equipo rival', fieldTitle: 'En el campo de batalla', movesInfoOn: 'Detalles de los ataques ▾', movesInfoOff: 'Menos detalles ▴', priority: 'Prioridad', contact: 'Contacto', todayRule: 'Regla del día', fieldHint: 'Toca para ver qué hace', accNote: 'Precisión con lo que hay en el campo', newsLink: 'Novedades', newsTitle: 'Novedades', newsNew: 'Nuevo', revivePick:'¿A quién quieres revivir?', reviveTag: 'Revivir', revived: w => `¡${w} ha revivido!`, trainYou: 'Entrenamiento al azar', trainYouTip: 'IVs, EVs y naturaleza al azar cada día.', trainYouTipIV: 'IVs perfectos; EVs y naturaleza al azar cada día.', trainYouTipFull: 'Entrenado del todo, pero a su aire: IVs perfectos y EVs y naturaleza al azar.', trainYouTipHalf: 'IVs perfectos y unos cuantos EVs repartidos a su aire.', trainYouTipNone: 'IVs perfectos, pero sin EVs: llegan sin entrenar.', trainYouTipMax: 'Has llegado a la Liga tras toda la aventura: IVs perfectos y EVs a medida.', trainBoss: 'Entrenado al máximo', trainBossTip: 'IVs perfectos, EVs a medida y objeto.', leadTag: '★ Empieza', you2: 'Tú', history: 'Historial',
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
    share: 'Compartir resultado', shareImg: 'Compartir como imagen', installTitle: '¿Vuelves mañana? ', installText: 'Instala Redle en tu móvil y tenlo a un toque, como una app.', installIOS: 'En Safari, pulsa Compartir y luego «Añadir a pantalla de inicio» para tenerlo como una app.', installBtn: 'Instalar', installNo: 'No, gracias', copied: '¡Copiado!', close: 'Cerrar', seeResult: 'Ver resultado',
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
    super: '¡Es muy eficaz!', resisted: 'No es muy eficaz...', immune: w => `No afecta a ${w}...`, typeImmune: (w, t, m) => `No afecta a ${w}... ¡Los tipo ${t} no reciben ataques de tipo ${m}!`, abilityImmune: (w, a) => `No afecta a ${w}... ¡Le protege su habilidad, ${a}!`, pranksterDark: w => `¡${w} es de tipo Siniestro: los movimientos de estado potenciados por Bromista no le afectan!`, crit: '¡Un golpe crítico!',
    miss: w => `¡${w} esquiva el ataque!`, fail: '¡Pero falla!', faint: w => `¡${w} se ha debilitado!`,
    st: {brn: w => `¡${w} se ha quemado!`, par: w => `¡${w} está paralizado! Quizás no pueda moverse.`, slp: w => `¡${w} se ha dormido!`, psn: w => `¡${w} ha sido envenenado!`, tox: w => `¡${w} ha sido gravemente envenenado!`, frz: w => `¡${w} se ha congelado!`},
    cure: {slp: w => `¡${w} se ha despertado!`, frz: w => `¡${w} ya no está congelado!`, _: w => `${w} se ha recuperado de su estado.`},
    prepareMove: {'Solar Beam': w => `¡${w} está absorbiendo luz!`, 'Solar Blade': w => `¡${w} está absorbiendo luz!`, Fly: w => `¡${w} ha volado muy alto!`, Bounce: w => `¡${w} ha saltado muy alto!`, Dig: w => `¡${w} se ha escondido bajo tierra!`, Dive: w => `¡${w} se ha sumergido!`, 'Phantom Force': w => `¡${w} se ha desvanecido!`, 'Shadow Force': w => `¡${w} se ha desvanecido!`},
    illusionEnd: w => `¡La ilusión de ${w} se ha roto!`, noDrop: w => `¡Las características de ${w} no bajan!`, noDropBy: (w, a) => `¡${a} evita que bajen las características de ${w}!`, typeChange: (w, t) => `¡${w} ahora es de tipo ${t}!`, disabled: (w, m) => `¡${m} de ${w} ha quedado anulado!`, healBlock: w => `¡${w} no puede curarse!`, healBlockEnd: w => `¡${w} ya puede volver a curarse!`, saltCure: w => `¡${w} está en salazón!`, lighter: w => `¡${w} se ha vuelto más ligero!`, confusionEnd: w => `¡${w} ya no está confuso!`, encoreEnd: w => `¡${w} deja de repetir su ataque!`, tauntEnd: w => `¡${w} ya no cae en la Mofa!`, disableEnd: w => `¡${w} ya puede volver a usar su ataque!`, trapped: w => `¡${w} no puede escapar!`, poltergeist: (w, i) => `¡${i} de ${w} va a por él!`, healBell: '¡Un sonido relajante cura al equipo!', disguise: w => `¡El disfraz de ${w} ha servido de señuelo!`, iceFace: w => `¡La cara de hielo de ${w} ha parado el golpe!`,
    lastWord: {red: '<b>Red:</b> ...', blue: '<b>Blue:</b> ¡No te emociones! ¡Aún me queda el mejor!', lance: '<b>Lance:</b> Un dragón nunca se rinde. Yo tampoco.', steven: '<b>Steven:</b> Esta piedra no se ha pulido en un día. Veamos si aguantas.', wallace: '<b>Wallace:</b> Reservaba lo más hermoso para el final.', cynthia: '<b>Cynthia:</b> Hacía tiempo que nadie me llevaba tan lejos.', iris: '<b>Iris:</b> ¡Aún no! ¡Mis dragones no saben perder!', leon: '<b>Leon:</b> ¡Esto sí que es un combate de campeones!', dobles: '<b>¡Sin banquillo!</b> A tus rivales solo les quedan estos dos.'},
    cant: {Truant: w => `¡${w} está holgazaneando!`, Disable: w => `¡${w} no puede usar ese ataque!`, Taunt: w => `¡${w} no puede usar ese ataque por la Mofa!`, slp: w => `${w} está dormido como un tronco.`, par: w => `¡${w} está paralizado y no se puede mover!`, frz: w => `¡${w} está congelado!`, flinch: w => `¡${w} retrocede!`, recharge: w => `${w} tiene que recargar.`, _: w => `${w} no puede moverse.`},
    boost: (w, s, n) => `¡${s} de ${w} ${n >= 2 ? 'sube mucho' : 'sube'}!`, maxedStat: (w, s) => `¡${w} ha perdido PS y ha maximizado su ${s}!`, unboost: (w, s, n) => `¡${s} de ${w} ${n >= 2 ? 'baja mucho' : 'baja'}!`,
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
    ate: (w, i) => `¡${w} se ha comido su ${i}!`, harvest: (w, i) => `¡${w} ha cosechado una ${i}!`, recycled: (w, i) => `¡${w} ha reciclado su ${i}!`, pickedUp: (w, i) => `¡${w} ha recogido una ${i}!`, stole: (w, i) => `¡${w} ha robado: ${i}!`, obtained: (w, i) => `¡${w} ha obtenido: ${i}!`, balloon: w => `¡${w} flota en el aire con su Globo Helio!`, frisk: (w, t, i) => `¡${w} ha cacheado a ${t} y ha descubierto su ${i}!`, usedItem: (w, i) => `${w} ha usado su ${i}.`,
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
    yourTeam: 'Your team', foeTeam: 'Rival team', fieldTitle: 'On the battlefield', movesInfoOn: 'Move details ▾', movesInfoOff: 'Fewer details ▴', priority: 'Priority', contact: 'Contact', todayRule: "Today's rule", fieldHint: 'Tap to see what it does', accNote: 'Accuracy with the current field effects', newsLink: "What's new", newsTitle: "What's new", newsNew: 'New', revivePick:'Which Pokémon will you revive?', reviveTag: 'Revive', revived: w => `${w} was revived and is ready to fight again!`, trainYou: 'Random training', trainYouTip: 'Random IVs, EVs and nature every day.', trainYouTipIV: 'Perfect IVs; random EVs and nature every day.', trainYouTipFull: 'Fully trained, but its own way: perfect IVs, random EVs and nature.', trainYouTipHalf: 'Perfect IVs and a few EVs spread its own way.', trainYouTipNone: 'Perfect IVs, but no EVs: they arrive untrained.', trainYouTipMax: 'You reached the League after a whole adventure: perfect IVs and tailored EVs.', trainBoss: 'Fully trained', trainBossTip: 'Perfect IVs, tailored EVs and an item.', leadTag: '★ Lead', you2: 'You', history: 'History',
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
    share: 'Share result', shareImg: 'Share as image', installTitle: 'Coming back tomorrow? ', installText: 'Install Redle on your phone and open it with one tap, like an app.', installIOS: 'In Safari, tap Share and then “Add to Home Screen” to have it like an app.', installBtn: 'Install', installNo: 'No thanks', copied: 'Copied!', close: 'Close', seeResult: 'See result',
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
    super: "It's super effective!", resisted: "It's not very effective...", immune: w => `It doesn't affect ${w}...`, typeImmune: (w, t, m) => `It doesn't affect ${w}... ${t} types can't be hit by ${m} moves!`, abilityImmune: (w, a) => `It doesn't affect ${w}... its ${a} protects it!`, pranksterDark: w => `${w} is Dark-type: Prankster-boosted status moves don't affect it!`, crit: 'A critical hit!',
    miss: w => `${w} avoided the attack!`, fail: 'But it failed!', faint: w => `${w} fainted!`,
    st: {brn: w => `${w} was burned!`, par: w => `${w} is paralyzed! It may be unable to move!`, slp: w => `${w} fell asleep!`, psn: w => `${w} was poisoned!`, tox: w => `${w} was badly poisoned!`, frz: w => `${w} was frozen solid!`},
    cure: {slp: w => `${w} woke up!`, frz: w => `${w} thawed out!`, _: w => `${w} was cured of its status.`},
    prepareMove: {'Solar Beam': w => `${w} absorbed light!`, 'Solar Blade': w => `${w} absorbed light!`, Fly: w => `${w} flew up high!`, Bounce: w => `${w} sprang up!`, Dig: w => `${w} burrowed its way under the ground!`, Dive: w => `${w} hid underwater!`, 'Phantom Force': w => `${w} vanished instantly!`, 'Shadow Force': w => `${w} vanished instantly!`},
    illusionEnd: w => `${w}'s illusion wore off!`, noDrop: w => `${w}'s stats were not lowered!`, noDropBy: (w, a) => `${a} prevents ${w}'s stats from being lowered!`, typeChange: (w, t) => `${w} is now ${t} type!`, disabled: (w, m) => `${w}'s ${m} was disabled!`, healBlock: w => `${w} was prevented from healing!`, healBlockEnd: w => `${w} can heal again!`, saltCure: w => `${w} is being salt cured!`, lighter: w => `${w} became nimble!`, confusionEnd: w => `${w} snapped out of confusion!`, encoreEnd: w => `${w}'s encore ended!`, tauntEnd: w => `${w} shook off the taunt!`, disableEnd: w => `${w}'s move is no longer disabled!`, trapped: w => `${w} can no longer escape!`, poltergeist: (w, i) => `${w} is about to be attacked by its ${i}!`, healBell: 'A soothing sound heals the team!', disguise: w => `${w}'s disguise served it as a decoy!`, iceFace: w => `${w}'s ice face took the hit!`,
    lastWord: {red: '<b>Red:</b> ...', blue: "<b>Blue:</b> Don't get excited! I saved the best for last!", lance: '<b>Lance:</b> A dragon never gives up. Neither do I.', steven: '<b>Steven:</b> This stone took years to polish. Let\'s see if you can crack it.', wallace: '<b>Wallace:</b> I was saving the most beautiful for last.', cynthia: "<b>Cynthia:</b> It's been a long time since anyone pushed me this far.", iris: "<b>Iris:</b> Not yet! My dragons don't know how to lose!", leon: "<b>Leon:</b> Now THAT'S a champion time!", dobles: '<b>No bench left!</b> Your rivals are down to these two.'},
    cant: {Truant: w => `${w} is loafing around!`, Disable: w => `${w} can't use that move!`, Taunt: w => `${w} can't use that move after the taunt!`, slp: w => `${w} is fast asleep.`, par: w => `${w} is paralyzed! It can't move!`, frz: w => `${w} is frozen solid!`, flinch: w => `${w} flinched!`, recharge: w => `${w} must recharge!`, _: w => `${w} can't move!`},
    boost: (w, s, n) => `${w}'s ${s} ${n >= 2 ? 'rose sharply' : 'rose'}!`, maxedStat: (w, s) => `${w} cut its own HP and maximized its ${s}!`, unboost: (w, s, n) => `${w}'s ${s} ${n >= 2 ? 'harshly fell' : 'fell'}!`,
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
    ate: (w, i) => `${w} ate its ${i}!`, harvest: (w, i) => `${w} harvested one ${i}!`, recycled: (w, i) => `${w} found one ${i}!`, pickedUp: (w, i) => `${w} found one ${i}!`, stole: (w, i) => `${w} stole ${i}!`, obtained: (w, i) => `${w} obtained one ${i}.`, balloon: w => `${w} floats in the air with its Air Balloon!`, frisk: (w, t, i) => `${w} frisked ${t} and found its ${i}!`, usedItem: (w, i) => `${w} used its ${i}.`,
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

// Descripciones de ataques, habilidades y objetos (texto de los juegos, vía PokéAPI). Solo se descarga el idioma en uso.
const descs = {}, info = {a: {}, i: {}};
export const loadDescs = () => Promise.all([
  (es ? import('./move-desc-es.json') : import('./move-desc-en.json')).then(m => Object.assign(descs, m.default)),
  (es ? import('./info-desc-es.json') : import('./info-desc-en.json')).then(m => Object.assign(info, m.default)),
]);
export const moveDesc = id => descs[toID(id)] || '';
export const abilityDesc = id => info.a[toID(id)] || '';
export const itemDesc = id => info.i[toID(id)] || '';

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
// Qué hace cada clima y efecto de campo, contado como en los juegos (para la ficha que sale al tocar el indicador).
export const FIELD_INFO = es ? {
  Hail: ['Granizo', 'Cae granizo sin parar: cada turno hiere a quien no sea de tipo Hielo, y Ventisca no falla nunca.'],
  Snow: ['Nieve', 'Los tipo Hielo aguantan mejor los golpes físicos y Ventisca no falla nunca.'],
  SunnyDay: ['Sol', 'Los ataques de Fuego arden con más fuerza y los de Agua pierden la mitad. Trueno y Vendaval fallan más.'],
  RainDance: ['Lluvia', 'El Agua golpea más fuerte y el Fuego se apaga a la mitad. Trueno y Vendaval no fallan nunca.'],
  Sandstorm: ['Tormenta de arena', 'Cada turno araña a quien no sea Roca, Tierra o Acero, y los tipo Roca resisten mejor los ataques especiales.'],
  'Electric Terrain': ['Campo Eléctrico', 'Quien pisa el suelo no puede dormirse y sus ataques Eléctricos chispean con más fuerza.'],
  'Grassy Terrain': ['Campo de Hierba', 'La hierba cura un poco cada turno a quien pisa el suelo, potencia los ataques Planta y amortigua Terremoto.'],
  'Misty Terrain': ['Campo de Niebla', 'La niebla protege de los problemas de estado a quien pisa el suelo y debilita los ataques Dragón contra él.'],
  'Psychic Terrain': ['Campo Psíquico', 'Los ataques Psíquicos se potencian y nadie que pise el suelo puede recibir ataques con prioridad.'],
  'Trick Room': ['Espacio Raro', 'Las dimensiones están del revés: los Pokémon más lentos atacan primero.'],
  Gravity: ['Gravedad', 'La gravedad aprieta fuerte: nadie puede levitar ni volar, los ataques de Tierra alcanzan a todos y todos los ataques aciertan mucho más (Canto, Hipnosis…).'],
  'Inverse Battle': ['Combate inverso', 'La tabla de tipos va del revés: lo muy eficaz apenas hace daño y lo que antes no afectaba ahora es muy eficaz.'],
} : {
  Hail: ['Hail', 'Hail keeps falling: every turn it hurts anyone who isn\'t Ice-type, and Blizzard never misses.'],
  Snow: ['Snow', 'Ice types take physical hits better, and Blizzard never misses.'],
  SunnyDay: ['Harsh sunlight', 'Fire attacks burn hotter and Water attacks are halved. Thunder and Hurricane miss more often.'],
  RainDance: ['Rain', 'Water attacks hit harder and Fire attacks are halved. Thunder and Hurricane never miss.'],
  Sandstorm: ['Sandstorm', 'Every turn it buffets anyone who isn\'t Rock, Ground or Steel, and Rock types resist special attacks better.'],
  'Electric Terrain': ['Electric Terrain', 'Grounded Pokémon can\'t fall asleep and their Electric attacks crackle with extra power.'],
  'Grassy Terrain': ['Grassy Terrain', 'The grass heals grounded Pokémon a little each turn, powers up Grass attacks and softens Earthquake.'],
  'Misty Terrain': ['Misty Terrain', 'The mist protects grounded Pokémon from status conditions and weakens Dragon attacks against them.'],
  'Psychic Terrain': ['Psychic Terrain', 'Psychic attacks are powered up and grounded Pokémon can\'t be hit by priority moves.'],
  'Trick Room': ['Trick Room', 'The dimensions are twisted: slower Pokémon move first.'],
  Gravity: ['Gravity', 'Gravity pulls hard: nothing can levitate or fly, Ground attacks hit everyone and every move is much more accurate (Sing, Hypnosis…).'],
  'Inverse Battle': ['Inverse battle', 'The type chart is flipped: super effective barely hurts, and what used to have no effect is now super effective.'],
};
export const ruleHtml = rule => RULE_TEXT[rule] ? `${itemIcon(RULE_ICON[rule])} <b>${es ? 'Regla del día' : "Today's rule"}: ${RULE_TEXT[rule][0]}</b> — ${RULE_TEXT[rule][1]}` : '';

// Domingo de dobles: nombre de cada dupla y su idea, contada como la contaría un entrenador.
const DUO_TEXT = es ? {
  kanto: ['Los dos de Pueblo Paleta', 'Blue llama al sol y Red lo aprovecha: con el campo soleado, sus plantas van a toda velocidad.'],
  hoenn: ['Los Campeones de Hoenn', 'La lluvia de Wallace acelera a sus Pokémon y el acero de Steven aguanta lo que venga.'],
  storm: ['Tormenta de dragones', 'Terremoto a discreción: los compañeros de Garchomp vuelan o levitan, así que solo tiemblas tú.'],
  tailwind: ['Viento en las alas', 'Viento Afín desde el primer turno y dos Campeones que ya no te dejan atacar primero.'],
  twisted: ['Dimensiones del revés', 'Espacio Raro nada más empezar: aquí los lentos y pesados atacan antes que nadie.'],
  peak: ['Los reyes de la cima', 'La leyenda del Monte Plateado y el Campeón invicto de Galar. Sin trucos: pegan muy fuerte.'],
  intimidate: ['Mirada de Kanto', 'Intimidación por partida doble: tus físicos pegarán como si llevaran guantes de boxeo.'],
  beauty: ['Belleza en combate', 'Ludicolo trae la lluvia y Togekiss atrae los golpes. Elegantes, pero sin piedad.'],
  tamers: ['Domadores de dragones', 'Iris y Leon se reparten el campo: dragones al ataque y dos muros que los protegen.'],
  frozen: ['El mar helado', 'Lluvia para Wallace y el frío de Red: un temporal de Agua y Hielo.'],
  fortress: ['La fortaleza', 'Claydol retuerce el tiempo y los golpes más pesados de Kanto y Hoenn caen primero.'],
  dragons: ['El clan del dragón', 'Lance e Iris, maestros de dragones: Viento Afín y dragones por todas partes.'],
} : {
  kanto: ['The Pallet Town pair', 'Blue calls the sun and Red cashes in: under harsh sunlight their Grass types move at full speed.'],
  hoenn: ['The Hoenn Champions', "Wallace's rain speeds up his team and Steven's steel takes whatever comes."],
  storm: ['Dragon storm', "Earthquake all day: Garchomp's partners fly or levitate, so you're the only one shaking."],
  tailwind: ['Wind beneath their wings', 'Tailwind from turn one and two Champions who will never let you move first.'],
  twisted: ['Twisted dimensions', 'Trick Room right away: here the slow and heavy strike before anyone else.'],
  peak: ['Kings of the summit', 'The legend of Mt. Silver and the unbeaten Champion of Galar. No tricks: they just hit very hard.'],
  intimidate: ['The Kanto stare', 'Double Intimidate: your physical attackers will feel like they are wearing boxing gloves.'],
  beauty: ['Beauty in battle', 'Ludicolo brings the rain and Togekiss draws the hits. Elegant, but merciless.'],
  tamers: ['Dragon tamers', 'Iris and Leon split the field: dragons on the attack and two walls keeping them safe.'],
  frozen: ['The frozen sea', "Rain for Wallace and Red's cold: a storm of Water and Ice."],
  fortress: ['The fortress', 'Claydol twists time and the heaviest hitters of Kanto and Hoenn land first.'],
  dragons: ['Clan of the dragon', 'Lance and Iris, dragon masters: Tailwind and dragons everywhere.'],
};

export function setBoss(id, name, team, gens, tries = 1, duo) {
  const b = duo ? (es ? {place: DUO_TEXT[duo][0], where: DUO_TEXT[duo][0], challenge: `¡${name} quieren luchar!`, wonSub: 'Dos contra dos y no han podido contigo. Hoy mandas tú.', title: 'la dupla'}
    : {place: DUO_TEXT[duo][0], where: DUO_TEXT[duo][0], challenge: `${name} want to battle!`, wonSub: "Two on two and they couldn't stop you. Today you're in charge.", title: 'the duo'}) : BOSS_TEXT[LANG][id];
  const itemsText = es ? `${itemIcon('Leftovers')} <b>Todos los Pokémon de ${name} llevan objeto</b>.` : `${itemIcon('Leftovers')} <b>All of ${name}'s Pokémon hold an item</b>.`;
  const rule = gensText(gens);
  Object.assign(T, es ? {
    lead: `${name} te espera en ${b.place}. Este es tu equipo de hoy, el mismo para todo el mundo. <b>Toca el Pokémon que quieres que empiece</b> y pulsa ¡Listo!`,
    lead8: `${name} te espera en ${b.place}. Te tocan 8 Pokémon, los mismos para todo el mundo: <b>elige 6</b> tocándolos en orden. <b>El primero que elijas empieza.</b>`,
    stageRules: [b.stage, itemsText].filter(Boolean).join('<br>'),
    bossTeam: `El equipo de ${name}`, challenge: b.challenge, where: b.where, wonSub: b.wonSub, bossTitle: b.title,
    how: ['Cada día recibes un <b>equipo de 6 Pokémon</b> nuevo, el mismo para todo el mundo.', `Mira tu equipo y el de ${name}, y <b>elige quién empieza</b>.`,
      `Derrota al equipo de <b>${name}</b>, el mismo que en los juegos: ${team}. Todos a nivel 100 y con objeto.`, rule, b.stage,
      'Algunos días hay una <b>regla del día</b> (combate inverso, Espacio Raro, clima…).',
      tries > 1 ? `Tienes <b>${tries} intentos</b>: si pierdes, vuelves a la pantalla de equipo. Recargar la página no los reinicia.` : 'Solo tienes <b>un intento</b>. Recargar la página no lo reinicia.', 'Comparte tu resultado y vuelve mañana para no romper la racha.',
      'En <b>Liga</b> te enfrentas a 5 rivales seguidos con otro equipo (Gen 1-9).'],
    won: `¡Has ganado a ${name}!`, lost: `${name} sigue ${b.f ? 'invicta' : 'invicto'}...`,
    shareWin: t => `🏆 ¡${name} ${b.f ? 'derrotada' : 'derrotado'} en ${t} turnos!`, shareLoss: t => `💀 ${name} ganó (turno ${t})`, red: name,
    redSends: n => `¡${name} envía a ${n}!`, win: `¡Has derrotado a ${name}!`, lose: `${name} te ha derrotado...`,
  } : {
    lead: `${name} awaits you at ${b.place}. This is today's team, the same for everyone. <b>Tap the Pokémon you want to lead</b> and press Ready!`,
    lead8: `${name} awaits you at ${b.place}. You get 8 Pokémon, the same for everyone: <b>pick 6</b> by tapping them in order. <b>The first one you pick leads.</b>`,
    stageRules: [b.stage, itemsText].filter(Boolean).join('<br>'),
    bossTeam: `${name}'s team`, challenge: b.challenge, where: b.where, wonSub: b.wonSub, bossTitle: b.title,
    how: ['Every day you get a new <b>team of 6 Pokémon</b>, the same for everyone.', `Check your team and ${name}'s, and <b>choose your lead</b>.`,
      `Defeat <b>${name}</b>'s team, the same as in the games: ${team}. All at level 100 and holding items.`, rule, b.stage,
      'Some days there is a <b>rule of the day</b> (inverse battle, Trick Room, weather…).',
      tries > 1 ? `You get <b>${tries} tries</b>: if you lose, you go back to team select. Reloading the page does not reset them.` : 'You get <b>one attempt</b>. Reloading the page does not reset it.', 'Share your result and come back tomorrow to keep your streak.',
      'In <b>League</b> you face 5 rivals in a row with another team (Gens 1-9).'],
    won: `You beat ${name}!`, lost: `${name} remains undefeated...`,
    shareWin: t => `🏆 Beat ${name} in ${t} turns!`, shareLoss: t => `💀 ${name} won (turn ${t})`, red: name,
    redSends: n => `${name} sent out ${n}!`, win: `You defeated ${name}!`, lose: `${name} defeated you...`,
  });
  if (!duo) return;
  T.duoName = Object.fromEntries(Object.entries(DUO_TEXT).map(([k, v]) => [k, v[0]]));
  T.duoIdea = Object.fromEntries(Object.entries(DUO_TEXT).map(([k, v]) => [k, v[1]]));
  Object.assign(T, es ? {
    lead: `<b>${DUO_TEXT[duo][0]}.</b> ${DUO_TEXT[duo][1]} <b>Toca los dos Pokémon que quieres que empiecen</b> y pulsa ¡Listo!`,
    bossTeam: `El equipo de ${name}`, stageRules: `${itemIcon('Leftovers')} <b>Combate Doble:</b> dos Pokémon en el campo a la vez por cada lado. Los ataques que golpean a varios hacen un 25 % menos, y Terremoto también alcanza a tu compañero.`,
    won: `¡Has ganado a ${name}!`, lost: `${name} siguen invictos...`, lose: `${name} te han derrotado...`,
    shareWin: t => `🏆 ¡${name} derrotados en ${t} turnos!`, shareLoss: t => `💀 ${name} ganaron (turno ${t})`,
    how: ['Cada domingo, <b>dos rivales hacen equipo</b>: 3 Pokémon de cada uno, con sets para luchar juntos.', 'Recibes un <b>equipo de 6 para dobles</b>, el mismo para todo el mundo. <b>Elige a los dos</b> que empiezan.',
      'Cada turno eliges qué hace cada uno de tus dos Pokémon y a quién ataca.', `Tienes <b>${tries} intentos</b>: si pierdes, vuelves a la pantalla de equipo.`, 'Comparte tu resultado y vuelve el domingo que viene.'],
  } : {
    lead: `<b>${DUO_TEXT[duo][0]}.</b> ${DUO_TEXT[duo][1]} <b>Tap the two Pokémon you want to lead</b> and press Ready!`,
    bossTeam: `${name}'s team`, stageRules: `${itemIcon('Leftovers')} <b>Double Battle:</b> two Pokémon on the field per side. Moves that hit several targets deal 25% less, and Earthquake also reaches your partner.`,
    won: `You beat ${name}!`, lost: `${name} remain undefeated...`, lose: `${name} defeated you...`,
    shareWin: t => `🏆 ${name} defeated in ${t} turns!`, shareLoss: t => `💀 ${name} won (turn ${t})`,
    how: ['Every Sunday <b>two rivals team up</b>: 3 Pokémon each, with sets built to fight together.', 'You get a <b>team of 6 for doubles</b>, the same for everyone. <b>Pick the two</b> that lead.',
      'Each turn you choose what each of your two Pokémon does and who it attacks.', `You get <b>${tries} tries</b>: if you lose, you go back to team select.`, 'Share your result and come back next Sunday.'],
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
  feedbackLink: 'Enviar sugerencia o fallo', feedbackTitle: 'Buzón Pelipper',
  feedbackIntro: '¿Has visto algo raro o se te ocurre una idea? Escríbela aquí y Pelipper me la trae volando. Leo todas las cartas.',
  fbBug: '🐛 Fallo', fbIdea: '💡 Idea', fbOther: '✉️ Otro', fbMessage: 'Tu carta', fbContact: 'Contacto opcional (Reddit, Discord…) si quieres respuesta',
  fbSend: 'Enviar con Pelipper', fbThanks: '¡Pelipper ya va volando con tu carta! Gracias de corazón.',
  mailAsk: '¿Un fallo o una idea?', mailSub: 'Pelipper me trae tus cartas. Las leo todas.', mailBtn: 'Escribir',
  tipAbility: 'Habilidad', tipItem: 'Objeto',
  discordAsk: 'Únete a la comunidad', discordSub: 'Comenta el reto del día, comparte tu resultado y atrapa Pokémon en Discord.', discordBtn: 'Entrar', fbError: 'No se pudo enviar (sin conexión o demasiados mensajes hoy).', fbShort: 'Escribe un poco más.',
  trainerBtn: 'Tarjeta de entrenador', trainerTitle: 'Tarjeta de entrenador', medalsTitle: 'Medallas', medalOf: n => `Ganar a ${n}`,
  splash: ["¡Cuidado con la hierba alta!","Magikarp usa Salpicadura.","Pero no pasó nada.","Red sigue sin decir nada.","Blue siempre va un paso por delante.","Snorlax bloquea el camino.","Zubat, Zubat, Zubat…","Un Geodude salvaje te mira.","Aquí no puedes usar eso.","Confía en tu Pikachu.","Ditto imita esta frase.","Psyduck tiene dolor de cabeza.","Slowpoke llegará mañana.","La Caja de Bill está llena.","Mi Rattata es de los mejores.","Sigue sin ser muy eficaz...","¡Es muy eficaz!","Protección cada dos turnos.","Ese 95 % no era tan seguro.","Wallace recomienda Milotic.","Steven busca piedras raras.","Leon se ha vuelto a perder.","Lance y su Hiperrayo.","Un Wobbuffet te mira fijamente.","Metrónomo podría ganar esto.","Hoy es buen día para un Eevee.","Vuelve al Centro Pokémon.","¡El equipo Rocket despega!","Nada de Pociones en la cima.","Tu Pokémon quiere aprender algo.","Agárrate a tu Cinta Focus.","Cuenta otra vez los K.O.","Cynthia aún no ha sudado.","Iris tiene hambre de dragones.","Esta vez sí aciertas Hipnosis.","Nadie olvida su primer Pokémon."], splashSunday: '¡Hoy toca Combate Doble!',
  season: {halloween: ['Halloween en Redle', 'Gengar anda suelto esta noche.'], christmas: ['Navidad en Redle', 'Delibird reparte regalos… más o menos.'], valentine: ['San Valentín en Redle', 'Luvdisc busca pareja de dobles.'], pokemonday: ['Día de Pokémon', '¡Feliz Día de Pokémon!'], spring: ['Primavera en Redle', 'Deerling estrena pelaje.'], summer: ['Verano en Redle', 'Lapras te lleva a la playa.']},
  seasonLeft: n => n === 0 ? '¡Último día!' : n === 1 ? 'Termina mañana.' : `Termina en ${n} días.`, seasonMedal: 'Gana un reto y llévate su medalla de recuerdo.',
  again: '¡Otra vez!', againNote: 'Práctica con este equipo: no cuenta', dexNewWon: n => `+${n} en color en tu Pokédex`, dexNewSeen: n => `+${n} ${n === 1 ? 'visto' : 'vistos'} en tu Pokédex`, dexNewTag: 'Nuevo',
  fameTitle: 'Salón de la Fama', fameEntry: n => `Entrada n.º ${n}`, fameEmpty: 'Aquí quedarán tus equipos campeones. Gana un reto y estrena el Salón.', fameWelcome: n => `¡${n} y su equipo entran en el Salón de la Fama!`, fameContinue: 'Continuar',
  dexTitle: 'Pokédex', dexCount: (w, s, t) => `Has ganado con ${w} · has visto ${s} · de ${t}`, dexHint: 'Toca un Pokémon. Se rellena con los equipos que te van tocando: en color, con los que has ganado.', dexUnknown: 'Aún no te ha tocado en ningún equipo.', dexSeen: 'Te ha tocado, pero aún no has ganado con él.', dexWon: n => n === 1 ? 'Has ganado con él 1 vez.' : `Has ganado con él ${n} veces.`, dexMvp: n => n === 1 ? 'MVP 1 vez.' : `MVP ${n} veces.`,
  regions: ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'],
  doublesTab: 'Dobles', doublesToday: '¡Hoy!', doublesSoon: 'El domingo', medalDoubles: 'Ganar un Combate Doble', sentBy: (t, n) => `¡${t} envía a ${n}!`,
  sundayToday: n => `<b>¡Hoy es domingo de dobles!</b> ${n} te retan a la vez. Entra →`, sundayNext: n => `<b>Este domingo, Combate Doble:</b> ${n} hacen equipo →`,
  sundayTitle: 'Combate Doble del domingo', sundayIn: d => d === 1 ? '¡Mañana mismo!' : d === 0 ? '¡Es hoy!' : `Faltan ${d} días. Vuelve el domingo.`, sundayBack: 'Volver al reto de hoy',
  sundayRules: ['Dos entrenadores hacen equipo: 3 Pokémon de cada uno, con sets pensados para luchar juntos.', '6 contra 6, con <b>dos Pokémon en el campo a la vez</b>, como en el campeonato mundial.', 'Eliges a tus <b>dos</b> Pokémon de salida y a quién ataca cada uno.', 'Solo los domingos. <b>3 intentos</b> y una medalla nueva para quien gane.'],
  pickTarget: m => `¿A quién apunta <b>${m}</b>?`, undo: '← Cambiar la elección anterior', hitsAlly: '¡También a tu compañero!', redirect: w => `¡${w} atrae todos los ataques!`, helpingHand: w => `¡${w} echa una mano a su compañero!`, guardTeam: w => `¡${w} protege a su equipo!`, swapped: w => `¡${w} cambia de sitio con su compañero!`,
  medalLiga: 'Campeón de la Liga', newMedal: m => `🎖️ ¡Medalla nueva! ${m}`,
  feat: {first: '¡A la primera! Gana sin gastar intentos', flawless: 'Sin un rasguño: gana sin que se debilite ninguno', clutch: 'Por los pelos: gana con un solo Pokémon en pie', fast: 'Rápido como Ninjask: gana en 15 turnos o menos', all: 'Maestro Pokémon: gana a los 8 rivales'},
  shareGlobal: (p, liga) => liga ? `🏆 Hoy solo el ${p} % se ha coronado` : `🌍 Hoy solo ha ganado el ${p} %`, medalStreak: n => `${n} días seguidos`, anon: 'Entrenador anónimo',
  cardWins: 'Victorias', cardPlayed: 'Combates', cardStreak: 'Racha', cardBest: 'Mejor racha', cardMvp: 'MVP favorito',
  nickLabel: 'Apodo para el top del día', nickHint: '3-16 letras o números. Déjalo vacío para salir como anónimo.', save: 'Guardar',
  nickSaved: 'Apodo guardado.', nickBad: 'Ese apodo no se acepta.', offline: 'Sin conexión, prueba luego.',
  codeTitle: 'Tu código de entrenador', copy: 'Copiar',
  codeHint: 'Con este código recuperas tu progreso (medallas, rachas y estadísticas) en otro móvil u ordenador. No lo compartas: quien lo tenga puede usar tu progreso.',
  restoreLabel: 'Usar el código de otro dispositivo', restoreBtn: 'Recuperar', restoreConfirm: '¿Recuperar ese progreso? Sustituirá el de este navegador.',
  restoreBad: 'Código no válido.', restoreNone: 'No hay progreso guardado con ese código.', backupNote: 'Tu progreso se guarda solo al terminar cada reto.',
  topTitle: 'Top del día', triesLeft: n => n === 1 ? '¡Te queda un intento más! ¿Lo vuelves a intentar?' : `¡No te rindas! Te quedan ${n} intentos.`, tryAgain: (n, max) => `Intentar de nuevo (${n}/${max})`, winsTitle: 'Victorias de hoy: mira cómo lo hicieron', winsYesterday: 'Hoy nadie ha ganado todavía. Mira cómo lo hicieron ayer:', winsNone: 'Nadie ha ganado todavía… ¡a lo mejor eres tú el primero!', winsTitleLiga: 'Campeones de hoy: mira su combate contra el Campeón', watch: 'Ver', topTurns: t => `${t} turnos`, topKos: k => `${k}/6 K.O.`, shareCard: 'Compartir tarjeta',
  cardShare: (name, m, total, streak) => `Redle · Tarjeta de entrenador
${name}
🏅 Medallas: ${m}/${total}
🔥 Racha: ${streak} ${streak === 1 ? 'día' : 'días'}`,
  rPrev: '◀ Turno anterior', rNext: 'Turno siguiente ▶', rPause: 'Pausa', rPlay: 'Seguir', rEnd: 'Ir al final', rStart: 'Inicio', rTurn: 'Ir al turno', rTurnN: t => `Turno ${t}`,
  welcome: 'Cada día, el mismo reto para todo el mundo: <b>un entrenador legendario</b> con su equipo de los juegos. <b>Toca quién empieza</b>, pulsa ¡Listo! y comparte tu resultado. Después, más campeones te esperan, y contra ellos eliges 6 de 8.',
  retoSoon: '<b>⭐ Mañana llega el Reto del día:</b> cada día un campeón, 8 Pokémon y tú eliges 6. Toca para saber más →',
  retoTab: 'Reto del día', retoFirst: '⭐ Primero, el <b>reto del día</b>. Cuando lo termines, el resto de campeones te esperan.',
  retoHow: '⭐ Cada día hay un <b>reto del día</b> contra un campeón distinto, con el mismo equipo de 6 para todo el mundo. Hasta terminarlo (ganar o gastar los intentos), el resto de campeones esperan; contra ellos te tocan <b>8 Pokémon y eliges 6</b>. Tus Pokémon llegan sin EVs; a la Liga, entrenados al máximo.',
  retoLead: name => `<b>⭐ Reto del día:</b> ${name} te espera con su equipo de los juegos. Este es tu equipo, el mismo para todo el mundo: el mismo combate para todos. <b>Toca quién empieza</b> y pulsa ¡Listo!`,
  retoLead8: name => `<b>⭐ Reto del día:</b> ${name} te espera con su equipo de los juegos. Te tocan 8 Pokémon, los mismos para todo el mundo: <b>elige 6</b> tocándolos en orden. <b>El primero que elijas empieza.</b>`,
  retoFull: 'Ya tienes 6. Toca uno de los elegidos para quitarlo.', retoPickMore: n => `Elige ${n} más`,
  moreChamps: 'Más campeones te esperan', moreChampsNote: name => `Siguiente: ${name}`, nextChamp: name => `Siguiente campeón: ${name}`,
  medalReto: 'Ganar un reto del día',
  tomorrowLabel: 'Mañana, en el reto del día', tomorrowReto: name => `${name} te espera`, tomorrowDoubles: '…y es domingo: ¡Combate Doble!',
  tomorrowStreak: n => (n === 1 ? 'día seguido' : 'días seguidos'), tomorrowDex: 'en tu Pokédex',
  luckTitle: 'Informe de suerte', luckVerdict: {good: '🍀 La suerte estuvo de tu lado.', even: '⚖️ Suerte bastante repartida.', bad: '🌧️ La suerte no te acompañó.'},
  luckRow: {crit: 'Golpes críticos', miss: 'Ataques fallados', cant: 'Turnos perdidos', extra: 'Efectos de regalo'},
  luckNote: 'Turnos perdidos: parálisis, congelación, retroceso, enamoramiento o confusión. Efectos de regalo: quemaduras, parálisis o congelaciones que provoca un ataque de daño.',
  luckShare: {good: '🍀 Suerte: a mi favor', even: '⚖️ Suerte: repartida', bad: '🌧️ Suerte: en mi contra'},
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
  feedbackLink: 'Send feedback or report a bug', feedbackTitle: 'Pelipper Mail',
  feedbackIntro: 'Spotted something odd or got an idea? Write it here and Pelipper will fly it straight to me. I read every letter.',
  fbBug: '🐛 Bug', fbIdea: '💡 Idea', fbOther: '✉️ Other', fbMessage: 'Your letter', fbContact: 'Optional contact (Reddit, Discord…) if you want a reply',
  fbSend: 'Send with Pelipper', fbThanks: 'Pelipper is on its way with your letter! Thank you so much.',
  mailAsk: 'A bug or an idea?', mailSub: 'Pelipper brings me your letters. I read them all.', mailBtn: 'Write',
  tipAbility: 'Ability', tipItem: 'Item',
  discordAsk: 'Join the community', discordSub: 'Talk about the daily challenge, share your result and catch Pokémon on Discord.', discordBtn: 'Join', fbError: "Couldn't send it (offline or too many messages today).", fbShort: 'Write a bit more.',
  trainerBtn: 'Trainer card', trainerTitle: 'Trainer card', medalsTitle: 'Badges', medalOf: n => `Beat ${n}`,
  splash: ["Watch out for tall grass!","Magikarp used Splash.","But nothing happened.","Red still has nothing to say.","Blue is always one step ahead.","Snorlax is blocking the way.","Zubat, Zubat, Zubat…","A wild Geodude stares at you.","You can't use that here.","Trust your Pikachu.","Ditto is copying this line.","Psyduck has a headache.","Slowpoke will be here tomorrow.","Bill's PC is full.","My Rattata is top percentage.","It's not very effective...","It's super effective!","Protect every other turn.","That 95% was not so safe.","Wallace recommends Milotic.","Steven is looking for rare stones.","Leon got lost again.","Lance and his Hyper Beam.","A Wobbuffet stares at you.","Metronome could win this.","A good day for an Eevee.","Back to the Pokémon Center.","Team Rocket blasts off again!","No Potions at the summit.","Your Pokémon wants to learn a move.","Hold on to that Focus Sash.","Count your KOs again.","Cynthia has not broken a sweat.","Iris is hungry for dragons.","This time Hypnosis will land.","Nobody forgets their first Pokémon."], splashSunday: "It's Double Battle day!",
  season: {halloween: ['Halloween in Redle', 'Gengar is on the loose tonight.'], christmas: ['Christmas in Redle', 'Delibird is delivering presents… sort of.'], valentine: ["Valentine's in Redle", 'Luvdisc is looking for a doubles partner.'], pokemonday: ['Pokémon Day', 'Happy Pokémon Day!'], spring: ['Spring in Redle', 'Deerling has a new coat.'], summer: ['Summer in Redle', 'Lapras is taking you to the beach.']},
  seasonLeft: n => n === 0 ? 'Last day!' : n === 1 ? 'Ends tomorrow.' : `Ends in ${n} days.`, seasonMedal: 'Win a challenge to keep its souvenir badge.',
  again: 'Again!', againNote: "Practice with this team: it doesn't count", dexNewWon: n => `+${n} in color in your Pokédex`, dexNewSeen: n => `+${n} seen in your Pokédex`, dexNewTag: 'New',
  fameTitle: 'Hall of Fame', fameEntry: n => `Entry No. ${n}`, fameEmpty: 'Your champion teams will live here. Win a challenge to open the Hall.', fameWelcome: n => `${n} and their team enter the Hall of Fame!`, fameContinue: 'Continue',
  dexTitle: 'Pokédex', dexCount: (w, s, t) => `Won with ${w} · seen ${s} · of ${t}`, dexHint: 'Tap a Pokémon. It fills up with the teams you get: in color, the ones you have won with.', dexUnknown: 'It has not been on your team yet.', dexSeen: 'It was on your team, but you have not won with it yet.', dexWon: n => n === 1 ? 'You have won with it once.' : `You have won with it ${n} times.`, dexMvp: n => n === 1 ? 'MVP once.' : `MVP ${n} times.`,
  regions: ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'],
  doublesTab: 'Doubles', doublesToday: 'Today!', doublesSoon: 'On Sunday', medalDoubles: 'Win a Double Battle', sentBy: (t, n) => `${t} sent out ${n}!`,
  sundayToday: n => `<b>It's Doubles Sunday!</b> ${n} challenge you together. Go →`, sundayNext: n => `<b>This Sunday, Double Battle:</b> ${n} team up →`,
  sundayTitle: 'Sunday Double Battle', sundayIn: d => d === 1 ? 'Tomorrow!' : d === 0 ? "It's today!" : `${d} days to go. Come back on Sunday.`, sundayBack: "Back to today's challenge",
  sundayRules: ['Two trainers team up: 3 Pokémon each, with sets built to fight together.', '6 vs 6, with <b>two Pokémon on the field at once</b>, just like the World Championships.', 'You pick your <b>two</b> leads and who each one attacks.', 'Sundays only. <b>3 tries</b> and a new badge for whoever wins.'],
  pickTarget: m => `Who should <b>${m}</b> hit?`, undo: '← Change the previous choice', hitsAlly: 'Hits your partner too!', redirect: w => `${w} became the center of attention!`, helpingHand: w => `${w} is ready to help its partner!`, guardTeam: w => `${w} protected its team!`, swapped: w => `${w} swapped places with its partner!`,
  medalLiga: 'League Champion', newMedal: m => `🎖️ New badge! ${m}`,
  feat: {first: 'First try! Win without using up tries', flawless: 'Not a scratch: win without a single faint', clutch: 'By a hair: win with only one Pokémon standing', fast: 'Fast as Ninjask: win in 15 turns or fewer', all: 'Pokémon Master: beat all 8 rivals'},
  shareGlobal: (p, liga) => liga ? `🏆 Only ${p}% became Champion today` : `🌍 Only ${p}% won today`, medalStreak: n => `${n}-day streak`, anon: 'Anonymous trainer',
  cardWins: 'Wins', cardPlayed: 'Battles', cardStreak: 'Streak', cardBest: 'Best streak', cardMvp: 'Favourite MVP',
  nickLabel: 'Nickname for the daily top', nickHint: '3-16 letters or numbers. Leave it empty to stay anonymous.', save: 'Save',
  nickSaved: 'Nickname saved.', nickBad: 'That nickname is not allowed.', offline: 'Offline, try again later.',
  codeTitle: 'Your trainer code', copy: 'Copy',
  codeHint: 'Use this code to get your progress (badges, streaks and stats) on another phone or computer. Keep it private: anyone with it can use your progress.',
  restoreLabel: 'Use a code from another device', restoreBtn: 'Restore', restoreConfirm: 'Restore that progress? It will replace the one in this browser.',
  restoreBad: 'Invalid code.', restoreNone: 'There is no saved progress for that code.', backupNote: 'Your progress is backed up automatically after each challenge.',
  topTitle: "Today's top", triesLeft: n => n === 1 ? 'One more try left! Give it another go?' : `Don't give up! You have ${n} tries left.`, tryAgain: (n, max) => `Try again (${n}/${max})`, winsTitle: "Today's wins: see how they did it", winsYesterday: 'Nobody has won yet today. See how they did it yesterday:', winsNone: 'Nobody has won yet… maybe you\'ll be the first!', winsTitleLiga: "Today's champions: watch their battle against the Champion", watch: 'Watch', topTurns: t => `${t} turns`, topKos: k => `${k}/6 KOs`, shareCard: 'Share card',
  cardShare: (name, m, total, streak) => `Redle · Trainer card
${name}
🏅 Badges: ${m}/${total}
🔥 Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`,
  rPrev: '◀ Previous turn', rNext: 'Next turn ▶', rPause: 'Pause', rPlay: 'Resume', rEnd: 'Skip to end', rStart: 'Start', rTurn: 'Go to turn', rTurnN: t => `Turn ${t}`,
  welcome: 'Every day, the same challenge for everyone: <b>a legendary trainer</b> with their real in-game team. <b>Tap your lead</b>, press Ready! and share your result. Then more champions await, and against them you pick 6 of 8.',
  retoSoon: '<b>⭐ The Daily challenge starts tomorrow:</b> one champion a day, 8 Pokémon and you pick 6. Tap to learn more →',
  retoTab: 'Daily challenge', retoFirst: '⭐ First, the <b>daily challenge</b>. Once you finish it, the other champions are waiting.',
  retoHow: '⭐ Every day there is a <b>daily challenge</b> against a different champion, with the same team of 6 for everyone. Until you finish it (win or use up your tries), the other champions wait; against them you get <b>8 Pokémon and pick 6</b>. Your Pokémon arrive without EVs; at the League, fully trained.',
  retoLead: name => `<b>⭐ Daily challenge:</b> ${name} awaits with their real in-game team. This is your team, the same for everyone: the same battle for all. <b>Tap your lead</b> and press Ready!`,
  retoLead8: name => `<b>⭐ Daily challenge:</b> ${name} awaits with their real in-game team. You get 8 Pokémon, the same for everyone: <b>pick 6</b> by tapping them in order. <b>The first one you pick leads.</b>`,
  retoFull: 'You already have 6. Tap one of your picks to remove it.', retoPickMore: n => `Pick ${n} more`,
  moreChamps: 'More champions await', moreChampsNote: name => `Next: ${name}`, nextChamp: name => `Next champion: ${name}`,
  medalReto: 'Win a daily challenge',
  tomorrowLabel: "Tomorrow's daily challenge", tomorrowReto: name => `${name} awaits`, tomorrowDoubles: "…and it's Sunday: Double Battle!",
  tomorrowStreak: n => (n === 1 ? 'day in a row' : 'days in a row'), tomorrowDex: 'in your Pokédex',
  luckTitle: 'Luck report', luckVerdict: {good: '🍀 Luck was on your side.', even: '⚖️ Luck was pretty even.', bad: '🌧️ Luck was not with you.'},
  luckRow: {crit: 'Critical hits', miss: 'Missed attacks', cant: 'Lost turns', extra: 'Bonus effects'},
  luckNote: 'Lost turns: paralysis, freezing, flinching, infatuation or confusion. Bonus effects: burns, paralysis or freezes caused by a damaging move.',
  luckShare: {good: '🍀 Luck: on my side', even: '⚖️ Luck: even', bad: '🌧️ Luck: against me'},
  rulesTitle: 'Rules for this battle', showDetails: 'Show stats and moves ▾', hideDetails: 'Hide stats and moves ▴',
  leagueProgress: (round, left) => `Round ${round}/5 · ${left ? `${left} more ${left === 1 ? 'rival' : 'rivals'} after this` : 'final rival!'}`,
  shareLeft: n => `left them with ${n} Pokémon`, shareStreak: n => `🔥 ${n}-day streak`,
  playStreak: 'Day streak', rankLine: (pos, total) => `Your rank today: <b>#${pos}</b> of ${total.toLocaleString('en')}`,
});
