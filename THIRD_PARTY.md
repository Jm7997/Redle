# Terceros y licencias

Redle es un proyecto fan no oficial y sin ánimo de lucro. Pokémon y todos los nombres, personajes,
imágenes y sonidos relacionados son marcas y © de Nintendo, Creatures Inc. y GAME FREAK inc.
Redle no está afiliado, patrocinado ni aprobado por ellos.

## Código y datos incluidos en el proyecto

| Qué | Para qué | Licencia |
|---|---|---|
| [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) vía [`@pkmn/sim`](https://github.com/pkmn/ps) | Motor de combate | MIT |
| [`@pkmn/randoms`](https://github.com/pkmn/ps) | Sets de Random Battle (equipo diario) | MIT |
| [`@pkmn/img`](https://github.com/pkmn/img) | Rutas de sprites e iconos de Showdown | MIT |
| [PokéAPI](https://github.com/PokeAPI/pokeapi) (CSV) | Nombres en español de movimientos, objetos y habilidades (`src/names-es.json`) | BSD-3-Clause |
| [pret/pokeheartgold](https://github.com/pret/pokeheartgold), [pret/pokeplatinum](https://github.com/pret/pokeplatinum), [pret/pokeemerald](https://github.com/pret/pokeemerald), [pret/pokeruby](https://github.com/pret/pokeruby), [Serebii](https://www.serebii.net) | Referencia de los equipos de los rivales (solo especie, habilidad y ataques; no se copia código) | — |
| Pixelify Sans, Nunito (`public/fonts`) | Tipografía | SIL Open Font License 1.1 |
| Luckiest Guy (`public/fonts`) | Logo | Apache 2.0 |

`public/og.png` y los iconos `public/icon-*.png` son dibujo propio (Pokéball y texto).

## Recursos que NO están en el repositorio

Sprites, iconos, fondos de combate, efectos de ataques, gritos y música se cargan en el navegador
desde el CDN de Pokémon Showdown (`play.pokemonshowdown.com`), igual que hace su propio cliente.
No se redistribuyen en este repositorio.
