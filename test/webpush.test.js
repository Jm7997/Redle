// El cifrado de los avisos de Pelipper (supabase/functions/pelipper-push/webpush.js), descifrado desde el lado del
// navegador tal como dice RFC 8291, y la firma VAPID verificada con la clave pública.
import test from 'node:test';
import assert from 'node:assert/strict';
import {encrypt, vapidKeys, vapidAuth, b64u, unb64u} from '../supabase/functions/pelipper-push/webpush.js';

const subtle = globalThis.crypto.subtle, enc = new TextEncoder();
const hmac = async (key, data) => new Uint8Array(await subtle.sign('HMAC', await subtle.importKey('raw', key, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']), data));
const cat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

test('un aviso cifrado se descifra en el navegador (aes128gcm, RFC 8291)', async () => {
  const ua = await subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
  const uaPublic = new Uint8Array(await subtle.exportKey('raw', ua.publicKey)), authSecret = crypto.getRandomValues(new Uint8Array(16));
  const msg = JSON.stringify({title: '✉️ ¡Correo urgente de Pelipper!', body: 'Reto del día #41: Red te espera.'});
  const body = await encrypt(msg, {p256dh: b64u(uaPublic), auth: b64u(authSecret)});
  // Cabecera: salt(16) · rs(4) · idlen(1) · clave pública del servidor(65) · texto cifrado
  const salt = body.slice(0, 16), idlen = body[20], asPublic = body.slice(21, 21 + idlen), text = body.slice(21 + idlen);
  assert.equal(idlen, 65);
  const as = await subtle.importKey('raw', asPublic, {name: 'ECDH', namedCurve: 'P-256'}, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({name: 'ECDH', public: as}, ua.privateKey, 256));
  const ikm = await hmac(await hmac(authSecret, shared), cat(enc.encode('WebPush: info\0'), uaPublic, asPublic, [1]));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), [1]))).slice(0, 12);
  const plain = new Uint8Array(await subtle.decrypt({name: 'AES-GCM', iv: nonce}, await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), text));
  assert.equal(plain.at(-1), 2, 'último registro');
  assert.equal(new TextDecoder().decode(plain.slice(0, -1)), msg);
});

test('la firma VAPID es un JWT ES256 válido para el servicio de avisos', async () => {
  const keys = await vapidKeys();
  const [, jwt, k] = (await vapidAuth('https://updates.push.services.mozilla.com/wpush/v2/abc', keys)).match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, keys.publicKey);
  const [h, c, s] = jwt.split('.');
  const pub = await subtle.importKey('raw', unb64u(keys.publicKey), {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
  assert.ok(await subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, pub, unb64u(s), enc.encode(`${h}.${c}`)));
  const claims = JSON.parse(new TextDecoder().decode(unb64u(c)));
  assert.equal(claims.aud, 'https://updates.push.services.mozilla.com');
  assert.ok(claims.exp > Date.now() / 1000);
});
