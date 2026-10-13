import {defineConfig} from 'vite';

// @pkmn/sim trae datos que el juego no usa en el navegador: qué movimientos aprende cada Pokémon
// (learnsets/legality, solo para validar equipos) y los "mods" de las generaciones 1-8 (aquí todo es
// Gen 9). Se cambian por módulos vacíos al compilar la web: el bundle pasa de ~7,7 MB a ~2 MB.
// `npm run test:bundle` compila el juego con este mismo recorte y juega combates para comprobarlo.
const UNUSED = /@pkmn[\\/]sim[\\/]build[\\/]esm[\\/]data[\\/](learnsets|legality|mods[\\/]gen[1-8][a-z]*[\\/]index)\.mjs$/;
export const stripUnusedData = {
  name: 'strip-unused-pkmn-data',
  enforce: 'pre',
  load(id) {
    if (!UNUSED.test(id)) return null;
    if (id.includes('learnsets')) return 'export const Learnsets = {};';
    if (id.includes('legality')) return 'export const Legality = {};';
    return 'export {};';
  },
};

// Política de seguridad de contenidos: solo scripts propios; imágenes y audio también de Showdown.
// Va como <meta> solo en la compilación (en desarrollo rompería la recarga en caliente de Vite).
// 'unsafe-inline' en estilos hace falta por los style="" que pinta el juego (iconos, variables CSS).
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://play.pokemonshowdown.com; " +
  "media-src https://play.pokemonshowdown.com; font-src 'self'; connect-src 'self' https://abliyzbjjkkbabmihfey.supabase.co; object-src 'none'; base-uri 'self'; form-action 'none'";
const cspMeta = {
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: html => html.replace('<head>', `<head>
  <meta http-equiv="Content-Security-Policy" content="${CSP}">`),
};

export default defineConfig({
  plugins: [stripUnusedData, cspMeta],
  build: {chunkSizeWarningLimit: 3000},
});
