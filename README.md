# Redle ⛰️

**Juega en https://redle.pages.dev**

Un combate Pokémon diario al estilo Wordle contra los campeones de verdad, con **sus equipos de los juegos**:
Red, Blue, Lance, Steven, Wallace, Cynthia, Iris y Leon.

1. Cada día recibes un equipo de 6 Pokémon por rival, el mismo para todo el mundo.
2. Ves tu equipo y el del rival, y eliges quién empieza.
3. Tienes un solo intento por rival. Algunos días hay una **regla del día** (combate inverso, Espacio Raro, clima…).
4. Compartes el resultado y, si quieres, un **enlace a la repetición** de tu combate.

**Modo Liga**: otro equipo (Gen 1-9) contra 5 rivales seguidos, 4 del Alto Mando y el Campeón, elegidos cada día.

```
Redle #12 ⛰️ vs Red
🏆 ¡Red derrotado en 23 turnos!
Tú:  🟩🟩🟨🟥🟥🟥
Red: ⚫⚫⚫⚫⚫⚫
```

## Jugar en local

Solo hace falta [Node.js](https://nodejs.org) 18 o superior. Funciona en Windows, macOS y Linux.

```sh
npm install
npm run dev
```

## Publicarlo

Es una web estática que se publica en **Cloudflare Pages** conectada a este repositorio:

- Comando de compilación: `npm test && npm run test:bundle && npm run build`
- Carpeta de salida: `dist`
- Variable de entorno: `NODE_VERSION = 22`

Cada push a `main` se publica solo. Las cabeceras de seguridad están en `public/_headers`. GitHub Actions
(`.github/workflows/tests.yml`) pasa los tests en cada push.

## Créditos y aviso

Es un proyecto fan, no oficial y sin ánimo de lucro (detalles y licencias en [THIRD_PARTY.md](THIRD_PARTY.md)), inspirado en
[dailyred](https://github.com/amoi-builds/dailyred). Los combates usan el simulador libre de
[Pokémon Showdown](https://github.com/smogon/pokemon-showdown) (MIT) a través de [@pkmn](https://github.com/pkmn).
Pokémon y sus personajes son © Nintendo, Game Freak y Creatures. Este proyecto no está afiliado a ellos.
