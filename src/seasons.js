// Temporadas: decoración según la fecha (partículas, Pokémon del fondo, aviso y medalla de recuerdo).
// No toca los combates ni los equipos: el reto de cada día sigue siendo el mismo para todo el mundo.
// from / to: mes-día, ambos incluidos; una temporada puede cruzar el año nuevo.
// fx: imágenes de efectos de Showdown (fx/*.png). medal: icono de la medalla de esa temporada.
export const SEASONS = [
  {id: 'halloween', from: '10-20', to: '11-02', fx: ['wisp', 'blackwisp', 'shadowball'], medal: 'Spell Tag',
    mons: ['Gengar', 'Mimikyu', 'Gourgeist', 'Banette', 'Dusknoir', 'Chandelure', 'Spiritomb', 'Drifblim', 'Mismagius', 'Sableye']},
  {id: 'christmas', from: '12-15', to: '01-06', fx: ['iceball', 'wisp'], medal: 'Never-Melt Ice',
    mons: ['Delibird', 'Abomasnow', 'Stantler', 'Froslass', 'Glaceon', 'Vanilluxe', 'Cetitan', 'Snorlax', 'Lapras', 'Mamoswine']},
  {id: 'valentine', from: '02-07', to: '02-14', fx: ['heart'], medal: 'Rose Incense',
    mons: ['Luvdisc', 'Alomomola', 'Sylveon', 'Audino', 'Togekiss', 'Clefable', 'Blissey', 'Milotic', 'Gardevoir', 'Volbeat']},
  {id: 'pokemonday', from: '02-27', to: '02-28', fx: ['shine'], medal: 'Light Ball',
    mons: ['Pikachu', 'Venusaur', 'Charizard', 'Blastoise', 'Eevee', 'Snorlax', 'Lapras', 'Gengar', 'Dragonite', 'Mew']},
  {id: 'spring', from: '03-20', to: '04-20', fx: ['petal', 'leaf1', 'leaf2'], medal: 'Miracle Seed',
    mons: ['Cherrim', 'Lilligant', 'Sawsbuck', 'Butterfree', 'Vivillon', 'Roserade', 'Florges', 'Comfey', 'Bellossom', 'Jumpluff']},
  {id: 'summer', from: '07-01', to: '08-31', fx: ['shine', 'waterwisp'], medal: 'Mystic Water',
    mons: ['Lapras', 'Wailord', 'Vaporeon', 'Sunflora', 'Volcarona', 'Ninetales', 'Blastoise', 'Kingler', 'Dewgong', 'Sharpedo']},
];

export function seasonOf(date) {
  const md = date.slice(5);
  return SEASONS.find(s => (s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to)) || null;
}

// Días que le quedan a la temporada contando hoy como 0 (el último día da 0).
export function seasonDaysLeft(date, season) {
  const year = +date.slice(0, 4), md = date.slice(5);
  const endYear = season.from > season.to && md >= season.from ? year + 1 : year;
  return Math.round((Date.parse(`${endYear}-${season.to}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 864e5);
}
