// Novedades que se ven en la web ("Novedades" en el pie). La más reciente, arriba; `id` creciente.
// Para publicar una nueva: añadirla al principio con el siguiente id, en los dos idiomas. Quien no la haya visto
// verá un punto rojo junto al enlace hasta que abra la lista.
export const NEWS = [
  {
    id: 4, date: '2026-10-18',
    es: ['Tu equipo trae ahora <b>IVs perfectos</b>. Los EVs y la naturaleza siguen siendo al azar, así que el reto sigue siendo duro, pero más justo. ¡Gracias por vuestros comentarios!'],
    en: ['Your team now has <b>perfect IVs</b>. EVs and nature are still random, so it stays tough, but fairer. Thanks for your feedback!'],
  },
  {
    id: 3, date: '2026-10-16',
    es: ['Arreglado <b>Revival Blessing</b>: ahora puedes elegir a qué Pokémon debilitado revivir. ¡Gracias a quienes lo avisasteis!',
      'La <b>Hierba Blanca</b> ya quita las bajadas también en el marcador.'],
    en: ['Fixed <b>Revival Blessing</b>: you can now choose which fainted Pokémon to revive. Thanks to everyone who reported it!',
      '<b>White Herb</b> now clears stat drops on the HP bar too.'],
  },
  {
    id: 2, date: '2026-10-15',
    es: ['<b>Lance</b> usa ahora su equipo clásico de HeartGold/SoulSilver, con sus tres Dragonite.',
      'IA más lista: tiene en cuenta habilidades como <b>Surcavientos</b>, el clima y los campos, y intenta frenar tus mejoras de estadísticas.',
      'Aviso en la pantalla de equipos: tu equipo trae <b>entrenamiento al azar</b> y el rival, al máximo.'],
    en: ['<b>Lance</b> now uses his classic HeartGold/SoulSilver team, three Dragonite included.',
      'Smarter AI: it accounts for abilities like <b>Wind Rider</b>, weather and terrains, and tries to stop your stat boosts.',
      'New note on the team screen: your team has <b>random training</b>, the rival is fully trained.'],
  },
  {
    id: 1, date: '2026-10-14',
    es: ['Cada rival con los <b>sprites de su juego</b> (HGSS, RSE, Platino, NB…).',
      'Se ven las trampas, barreras, climas y campos, el muñeco del <b>Sustituto</b>, la burbuja de <b>Protección</b> y los problemas de estado.',
      'Mensajes que faltaban: <b>Premonición</b>, Deseo, Mofa, Otra Vez, Bostezo y Canto Mortal.',
      'Repeticiones con <b>pausa y saltos de turno</b>, medallas, tarjeta de entrenador y top del día.'],
    en: ['Each rival uses the <b>sprites from their own game</b> (HGSS, RSE, Platinum, BW…).',
      'Hazards, screens, weather and terrains are now shown, plus the <b>Substitute</b> doll, the <b>Protect</b> bubble and status conditions.',
      'Missing messages added: <b>Future Sight</b>, Wish, Taunt, Encore, Yawn and Perish Song.',
      'Replays with <b>pause and turn skipping</b>, badges, a trainer card and a daily top.'],
  },
];
