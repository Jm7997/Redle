# Redle ⛰️

**English** · [Español](README.es.md)

**Play at https://redle.pages.dev**

A daily Wordle-style Pokémon battle against the real champions, using **their actual in-game teams**:
Red, Blue, Lance, Steven, Wallace, Cynthia, Iris and Leon. No ROM, no emulator: it runs in your browser, on phone or desktop.

1. Every day you get a team of 6 Pokémon per rival, the same for everyone.
2. Check your team and the rival's, and pick your lead.
3. One try per rival per day. Some days have a **rule of the day** (Inverse Battle, Trick Room, weather…).
4. Share your result and, if you like, a **replay link** of your battle.

```
Redle #12 ⛰️ vs Red
💀 Red won (turn 23) · left them with 2 Pokémon
You: 🟩🟩🟨🟥🟥🟥
Red: ⚫⚫⚫⚫🔴🔴
MVP: Azumarill
🔥 5-day streak
```

## Features

- **8 rivals** with their teams exactly as in the games (species, abilities and moves), hardened to level 100 with perfect IVs, EVs and held items. It is meant to be **very hard**.
- **Each rival uses the sprites from their own game**: HGSS for Red, Blue and Lance; RSE for Steven and Wallace; Platinum for Cynthia; Black/White for Iris.
- **League mode**: a team from Gens 1-9 against 5 rivals in a row (4 Elite Four and the Champion), chosen each day. You are healed between battles.
- **Gimmicks by generation**: Leon battles use Gen 8 rules with Dynamax (his Charizard always Gigantamaxes). In the League there is Tera, Mega Evolution and Dynamax for both sides.
- **Global stats and daily rank**: after playing you see how everyone did today and your rank, with no accounts or names.
- **Practice mode** after the daily challenge: the same team again, or random teams if you won.
- Real game move descriptions, Spanish and English, light and dark themes, battle music and cries.

## Run locally

You only need [Node.js](https://nodejs.org) 18 or newer. Works on Windows, macOS and Linux.

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # game logic tests, including hundreds of simulated battles
npm run build    # static site in dist/
```

## Deploy

It is a static site deployed on **Cloudflare Pages**, connected to this repository:

- Build command: `npm test && npm run test:bundle && npm run build`
- Output folder: `dist`
- Environment variable: `NODE_VERSION = 22`

Every push to `main` is published automatically. Security headers live in `public/_headers`. GitHub Actions
(`.github/workflows/tests.yml`) runs the tests on every push. Global stats use a free Supabase project
(schema in `supabase/migrations/`).

## Privacy

No cookies, no analytics, no accounts. Progress and settings are stored in your browser (`localStorage`). For the
global stats each browser sends its daily result with a random anonymous ID, and the site can only read aggregated
totals.

## Credits and disclaimer

This is an unofficial, non-profit fan project (details and licenses in [THIRD_PARTY.md](THIRD_PARTY.md)), inspired by
[dailyred](https://github.com/amoi-builds/dailyred). Battles use the open-source
[Pokémon Showdown](https://github.com/smogon/pokemon-showdown) simulator (MIT) via [@pkmn](https://github.com/pkmn).
Sprites, sounds and music are loaded from the Showdown CDN; none are included in this repository.
Pokémon and its characters are © Nintendo, Game Freak and Creatures. This project is not affiliated with them.
