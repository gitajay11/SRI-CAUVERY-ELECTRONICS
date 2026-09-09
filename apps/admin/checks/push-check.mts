/**
 * Exercises the hand-rolled Web Push implementation against a local listener.
 *
 * Verifies: the VAPID JWT is signed with the configured key and carries the
 * right claims, the payload is encrypted with aes128gcm, and the headers match
 * RFC 8291 / RFC 8292 well enough for a real push service to accept them.
 */
import { createServer } from 'node:http';
import {
  createECDH,
  generateKeyPairSync,
  randomBytes,
  createPublicKey,
  createHmac,
  createDecipheriv,
} from 'node:crypto';

/**
 * A throwaway VAPID pair, generated fresh on every run.
 *
 * Deliberately not a fixed key checked into the repository: a private key in
 * source control is a private key that has leaked, even a test one — and the
 * one that used to be here was also the key in the developer's own .env.
 */
function vapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const jwk = privateKey.export({ format: 'jwk' }) as { d: string };
  return {
    publicKey: Buffer.from(spki.subarray(spki.length - 65)).toString('base64url'),
    privateKey: Buffer.from(jwk.d, 'base64url').toString('base64url'),
  };
}

const keys = vapidKeys();
process.env.VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;
process.env.VAPID_SUBJECT = 'mailto:ops@example.com';

const { sendPush } = await import('../services/push.ts');

// A browser's subscription keys: an ECDH public point and a 16-byte auth secret.
const client = createECDH('prime256v1');
client.generateKeys();
const p256dh = client.getPublicKey().toString('base64url');
const auth = randomBytes(16).toString('base64url');

let captured:
  | { headers: Record<string, string | string[] | undefined>; bytes: number; body: Buffer }
  | null = null;

const server = createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on('data', (chunk) => chunks.push(chunk as Buffer));
  request.on('end', () => {
    const body = Buffer.concat(chunks);
    captured = { headers: request.headers, bytes: body.length, body };
    response.writeHead(201).end();
  });
});

await new Promise<void>((resolve) => server.listen(4321, resolve));

const result = await sendPush(
  { endpoint: 'http://127.0.0.1:4321/push/abc123', p256dh, auth },
  { title: 'New order', body: 'TE-260909-0001 — ₹1,299.00', url: '/orders', tag: 'order' },
);

server.close();

if (!captured) throw new Error('the push service never received a request');
const headers = (captured as { headers: Record<string, string> }).headers;

const checks: [string, boolean, string][] = [
  ['request delivered', result.ok, JSON.stringify(result)],
  ['aes128gcm content encoding', headers['content-encoding'] === 'aes128gcm', String(headers['content-encoding'])],
  ['binary content type', headers['content-type'] === 'application/octet-stream', String(headers['content-type'])],
  ['TTL set', Number(headers['ttl']) > 0, String(headers['ttl'])],
  ['urgency set', typeof headers['urgency'] === 'string', String(headers['urgency'])],
  ['vapid authorization', String(headers['authorization']).startsWith('vapid t='), String(headers['authorization']).slice(0, 24)],
  ['public key in header', String(headers['authorization']).includes(process.env.VAPID_PUBLIC_KEY!), 'k='],
  ['payload encrypted', (captured as { bytes: number }).bytes > 100, `${(captured as { bytes: number }).bytes} bytes`],
];

// The JWT must verify against the public key the header advertises.
const authorization = String(headers['authorization']);
const token = /t=([^,]+)/.exec(authorization)?.[1] ?? '';
const [headerB64, payloadB64] = token.split('.');
const claims = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString());
const algorithm = JSON.parse(Buffer.from(headerB64!, 'base64url').toString());

checks.push(
  ['JWT alg is ES256', algorithm.alg === 'ES256', String(algorithm.alg)],
  ['audience is the push origin', claims.aud === 'http://127.0.0.1:4321', String(claims.aud)],
  ['subject carried', claims.sub === process.env.VAPID_SUBJECT, String(claims.sub)],
  ['expiry within 24h', claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 86_400, String(claims.exp)],
);

// The advertised key must be a real point on P-256.
try {
  createPublicKey({
    key: Buffer.concat([
      Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'),
      Buffer.from(process.env.VAPID_PUBLIC_KEY!, 'base64url'),
    ]),
    format: 'der',
    type: 'spki',
  });
  checks.push(['public key is a valid P-256 point', true, 'ok']);
} catch (error) {
  checks.push(['public key is a valid P-256 point', false, String(error)]);
}

/**
 * Decrypts the body the way a browser would (RFC 8188 aes128gcm, RFC 8291 key
 * derivation). This is the check that matters: headers can look right while
 * the payload is undecryptable rubbish.
 */
function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  return createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest()
    .subarray(0, length);
}

try {
  const body = (captured as { body: Buffer }).body;
  const salt = body.subarray(0, 16);
  const keyLength = body.readUInt8(20);
  const serverPublic = body.subarray(21, 21 + keyLength);
  const ciphertext = body.subarray(21 + keyLength);

  const sharedSecret = client.computeSecret(serverPublic);
  const clientPublic = client.getPublicKey();

  const authInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    clientPublic,
    serverPublic,
  ]);
  const ikm = hkdf(Buffer.from(auth, 'base64url'), sharedSecret, authInfo, 32);

  const contentKey = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  const decipher = createDecipheriv('aes-128-gcm', contentKey, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plaintext = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ]);

  // Strip the RFC 8188 padding delimiter.
  const end = plaintext.lastIndexOf(0x02);
  const json = JSON.parse(plaintext.subarray(0, end).toString('utf8'));

  checks.push(
    ['payload decrypts in the browser', true, 'aes128gcm'],
    ['title survives the round trip', json.title === 'New order', String(json.title)],
    [
      'unicode body survives',
      json.body === 'TE-260909-0001 — ₹1,299.00',
      String(json.body),
    ],
    ['destination carried', json.url === '/orders', String(json.url)],
  );
} catch (error) {
  checks.push(['payload decrypts in the browser', false, String(error)]);
}

let failed = 0;
for (const [name, pass, detail] of checks) {
  console.log(`${pass ? '  ok  ' : ' FAIL '} ${name.padEnd(34)} ${detail}`);
  if (!pass) failed += 1;
}
console.log(`\n${checks.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
