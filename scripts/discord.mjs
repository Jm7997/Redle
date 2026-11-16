// Publicar en Discord como Pelipper. Los avisos del reto van al foro (secreto DISCORD_WEBHOOK, cada mensaje abre un
// hilo con `thread_name`); las novedades y el resumen semanal van al canal de novedades si existe su webhook
// (DISCORD_NEWS_WEBHOOK, canal de texto normal) y, si no, también al foro, en su propio hilo.
export const SD = 'https://play.pokemonshowdown.com/';
// Retrato de Pelipper de Mundo Misterioso (PMD SpriteCollab, CC BY-NC 4.0: uso sin ánimo de lucro y con crédito).
export const AVATAR = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/0279/Happy.png';
export const FOOTER = 'Pelipper reparte el correo de Redle · Retrato: PMD SpriteCollab (CC BY-NC 4.0)';

// HTML de las novedades → Markdown de Discord (negritas; el resto de etiquetas fuera).
export const md = html => html.replace(/<\/?b>/g, '**').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');

// Madrid: la fecha del reto y la hora (para no publicar la víspera).
export const madridHour = () => +new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23'}).format(new Date());

export async function post({forum, thread, ...message}) {
  const news = !forum && process.env.DISCORD_NEWS_WEBHOOK, hook = news || process.env.DISCORD_WEBHOOK;
  if (!hook) throw new Error('Falta el secreto DISCORD_WEBHOOK');
  const res = await fetch(`${hook}?wait=true`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: 'Pelipper', avatar_url: AVATAR, ...(news ? {} : {thread_name: thread}), ...message}),
  });
  if (!res.ok) throw new Error(`Discord respondió ${res.status}: ${await res.text()}`);
}
