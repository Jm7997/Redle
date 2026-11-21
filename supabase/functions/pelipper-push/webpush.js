// Web Push sin dependencias (WebCrypto: funciona igual en Deno, en Supabase, y en Node, para probarlo).
// - Cifrado del mensaje: RFC 8291 + RFC 8188 (aes128gcm).
// - Firma del remitente: VAPID, RFC 8292 (JWT ES256).
const enc = new TextEncoder();
const subtle = globalThis.crypto.subtle;

export const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};
const hmac = async (key, data) => new Uint8Array(await subtle.sign('HMAC', await subtle.importKey('raw', key, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']), data));

// Claves VAPID nuevas: la pública (para la web, en base64url) y la privada (JWK, se guarda en la base de datos).
export async function vapidKeys() {
  const pair = await subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  return {publicKey: b64u(await subtle.exportKey('raw', pair.publicKey)), privateJwk: await subtle.exportKey('jwk', pair.privateKey)};
}

// Cifra `payload` (texto) para la suscripción {keys: {p256dh, auth}}: devuelve el cuerpo listo para enviar.
export async function encrypt(payload, {p256dh, auth}, {salt = crypto.getRandomValues(new Uint8Array(16)), serverKeys} = {}) {
  const uaPublic = unb64u(p256dh), authSecret = unb64u(auth);
  const as = serverKeys || await subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
  const asPublic = new Uint8Array(await subtle.exportKey('raw', as.publicKey));
  const ua = await subtle.importKey('raw', uaPublic, {name: 'ECDH', namedCurve: 'P-256'}, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({name: 'ECDH', public: ua}, as.privateKey, 256));
  // IKM = HKDF(auth, ecdh, "WebPush: info" || 0 || ua_public || as_public)
  const prkKey = await hmac(authSecret, shared);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, [1]));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), [1]))).slice(0, 12);
  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const text = new Uint8Array(await subtle.encrypt({name: 'AES-GCM', iv: nonce}, key, concat(enc.encode(payload), [2])));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, [asPublic.length], asPublic, text);
}

// Cabecera Authorization de VAPID para el servicio de avisos de esa suscripción.
export async function vapidAuth(endpoint, {publicKey, privateJwk}, subject = 'https://redle.pages.dev') {
  const header = b64u(enc.encode(JSON.stringify({typ: 'JWT', alg: 'ES256'})));
  const claims = b64u(enc.encode(JSON.stringify({aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject})));
  const key = await subtle.importKey('jwk', privateJwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
  const sig = await subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${publicKey}`;
}

// Envía un aviso. Devuelve el código HTTP (201 = entregado; 404/410 = esa suscripción ya no existe).
export async function sendPush(sub, payload, vapid, ttl = 12 * 3600) {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'normal',
      Authorization: await vapidAuth(sub.endpoint, vapid)},
    body: await encrypt(payload, sub),
  });
  return res.status;
}
