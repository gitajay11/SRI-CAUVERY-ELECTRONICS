#!/usr/bin/env node
/**
 * Generates a VAPID key pair for Web Push.
 *
 * Run once per environment:  npm run vapid -w @tamizh/admin
 *
 * The public key is safe to ship to browsers — that is its whole purpose. The
 * private key is a secret: put it in .env.local (or your host's secret store)
 * and never in the repository. Rotating it invalidates every existing
 * subscription, so staff have to turn alerts back on.
 */
import { generateKeyPairSync } from 'node:crypto';

function toUrlBase64(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

// The uncompressed point (65 bytes, 0x04 prefix) is the last 65 bytes of the
// SPKI encoding; the raw scalar is the 32-byte private value inside the JWK.
const spki = publicKey.export({ type: 'spki', format: 'der' });
const jwk = privateKey.export({ format: 'jwk' });

const publicBytes = spki.subarray(spki.length - 65);
const privateBytes = Buffer.from(jwk.d, 'base64url');

console.log('Add these to apps/admin/.env.local:\n');
console.log(`VAPID_PUBLIC_KEY=${toUrlBase64(publicBytes)}`);
console.log(`VAPID_PRIVATE_KEY=${toUrlBase64(privateBytes)}`);
console.log('VAPID_SUBJECT=mailto:you@example.com');
console.log('\nKeep the private key secret. Never commit it.');
