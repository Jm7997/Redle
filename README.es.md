# Redle ⛰️

[English](README.md) · **Español**

**Juega en https://redle.pages.dev**

Un combate Pokémon diario al estilo Wordle contra los campeones de verdad, con **sus equipos de los juegos**:
Red, Blue, Lance, Steven, Wallace, Cynthia, Iris y Leon. Sin ROM ni emulador: funciona en el navegador, en el móvil o en el ordenador.

1. Cada día recibes un equipo de 6 Pokémon por rival, el mismo para todo el mundo.
2. Ves tu equipo y el del rival, y eliges quién empieza.
3. Tienes un solo intento por rival. Algunos días hay una **regla del día** (combate inverso, Espacio Raro, clima…).
4. Compartes el resultado y, si quieres, un **enlace a la repetición** de tu combate.

```
Redle #12 ⛰️ vs Red
💀 Red ganó (turno 23) · le dejé a 2 Pokémon
Tú: 🟩🟩🟨🟥🟥🟥
Red: ⚫⚫⚫⚫🔴🔴
MVP: Azumarill
🔥 5 días seguidos
```

## Qué tiene

- **8 rivales** con sus equipos exactamente como en los juegos (especies, habilidades y ataques), endurecidos a nivel 100 con IVs perfectos, EVs y objetos. Está pensado para ser **muy difícil**.
- **Cada rival se juega con los sprites de su juego**: HGSS para Red, Blue y Lance; RSE para Steven y Wallace; Platino para Cynthia; Negro/Blanco para Iris.
- **Modo Liga**: un equipo de Gen 1-9 contra 5 rivales seguidos (4 del Alto Mando y el Campeón), elegidos cada día. Tu equipo se cura entre combates.
- **Mecánicas por generación**: contra Leon, reglas de 8.ª gen con Dinamax (su Charizard siempre se gigamaxiza). En la Liga hay Teracristalización, Megaevolución y Dinamax para los dos bandos.
- **Estadísticas globales y puesto del día**: al terminar ves cómo le ha ido hoy a todo el mundo y tu puesto, sin cuentas ni nombres.
- **Modo práctica** tras el reto del día: el mismo equipo otra vez, o equipos aleatorios si ganaste.
- Descripciones de los ataques de los juegos, español e inglés, tema claro y oscuro, música de combate y gritos.

## Jugar en local

Solo hace falta [Node.js](https://nodejs.org) 18 o superior. Funciona en Windows, macOS y Linux.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # tests de la lógica, con cientos de combates simulados
npm run build    # web estática en dist/
```

## Publicarlo

Es una web estática que se publica en **Cloudflare Pages** conectada a este repositorio:

- Comando de compilación: `npm test && npm run test:bundle && npm run build`
- Carpeta de salida: `dist`
- Variable de entorno: `NODE_VERSION = 22`

Cada push a `main` se publica solo. Las cabeceras de seguridad están en `public/_headers`. GitHub Actions
(`.github/workflows/tests.yml`) pasa los tests en cada push. Las estadísticas globales usan un proyecto gratuito de
Supabase (esquema en `supabase/migrations/`).

## Privacidad

Sin cookies, analítica ni cuentas. El progreso y los ajustes se guardan en tu navegador (`localStorage`). Para las
estadísticas globales cada navegador envía su resultado del día con un identificador anónimo aleatorio, y la web solo
puede leer totales.

## Créditos y aviso

Es un proyecto fan, no oficial y sin ánimo de lucro (detalles y licencias en [THIRD_PARTY.md](THIRD_PARTY.md)), inspirado en
[dailyred](https://github.com/amoi-builds/dailyred). Los combates usan el simulador libre de
[Pokémon Showdown](https://github.com/smogon/pokemon-showdown) (MIT) a través de [@pkmn](https://github.com/pkmn).
Sprites, sonidos y música se cargan desde el CDN de Showdown; ninguno está incluido en este repositorio.
Pokémon y sus personajes son © Nintendo, Game Freak y Creatures. Este proyecto no está afiliado a ellos.
