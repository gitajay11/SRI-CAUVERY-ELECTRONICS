import 'server-only';
import {
  createCipheriv,
  createECDH,
  createHmac,
  createSign,
  randomBytes,
} from 'node:crypto';
import { push as pushEnv } from '@/lib/env';

/**
 * Web Push, implemented directly against the specifications.
 *
 * The usual choice is the `web-push` package. It is not used here for the same
 * reason the rest of this project avoids dependencies it does not need: the
 * protocol is three well-specified pieces that Node's crypto already provides,
 * and a push library is a lot of transitive surface for a shop to trust with
 * its VAPID private key.
 *
 * The pieces:
 *   RFC 8292  VAPID — an ES256 JWT identifying the sender
 *   RFC 8188  HTTP encrypted content-encoding (aes128gcm)
 *   RFC 8291  Message Encryption — ECDH to the subscriber's public key
 *
 * The payload is encrypted end to end: the push service (Google, Mozilla,
 * Apple) relays ciphertext it cannot read, which is exactly what we want when
 * the message concerns a customer's order.
 */

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export type PushResult =
  | { ok: true }
  | { ok: false; gone: boolean; status: number; detail: string };

const base64url = (input: Buffer): string => input.toString('base64url');
const fromBase64url = (input: string): Buffer => Buffer.from(input, 'base64url');

// ---------------------------------------------------------------------------
// VAPID
// ---------------------------------------------------------------------------

/**
 * Wraps a raw P-256 private key in the DER structure Node's signer expects.
 *
 * VAPID keys are distributed as raw 32-byte scalars, but `createSign` wants
 * PKCS#8. Rather than pull in an ASN.1 library, the fixed prefix for a
 * prime256v1 private key is prepended — the only variable parts are the key
 * itself and the public point.
 */
function toPkcs8(privateKey: Buffer, publicKey: Buffer): Buffer {
  const header = Buffer.from(
    '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420',
    'hex',
  );
  const middle = Buffer.from('a144034200', 'hex');
  return Buffer.concat([header, privateKey, middle, publicKey]);
}

/** Derives the uncompressed public point from a raw private scalar. */
function publicKeyFromPrivate(privateKey: Buffer): Buffer {
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(privateKey);
  return ecdh.getPublicKey();
}

function createVapidHeader(audience: string): string {
  const privateKey = fromBase64url(pushEnv.privateKey());
  const publicKey = fromBase64url(pushEnv.publicKey());

  const header = base64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64url(
    Buffer.from(
      JSON.stringify({
        aud: audience,
        // Twelve hours: comfortably inside the 24-hour maximum push services accept.
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: pushEnv.subject(),
      }),
    ),
  );

  const signer = createSign('SHA256');
  signer.update(`${header}.${claims}`);
  const der = signer.sign({
    key: toPkcs8(privateKey, publicKey),
    format: 'der',
    type: 'pkcs8',
  });

  // DER signature -> the fixed 64-byte (r || s) form JWS requires.
  const signature = derToJose(der);
  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${pushEnv.publicKey()}`;
}

/** ASN.1 DER ECDSA signature to the raw r||s pair. */
function derToJose(der: Buffer): Buffer {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error('Malformed ECDSA signature');
  if (der[offset]! & 0x80) offset += (der[offset]! & 0x7f) + 1;
  else offset += 1;

  const readInteger = (): Buffer => {
    if (der[offset++] !== 0x02) throw new Error('Malformed ECDSA signature');
    const length = der[offset++]!;
    let value = der.subarray(offset, offset + length);
    offset += length;
    // Strip the sign byte DER adds, or left-pad to 32 bytes.
    while (value.length > 32 && value[0] === 0) value = value.subarray(1);
    if (value.length < 32) {
      value = Buffer.concat([Buffer.alloc(32 - value.length, 0), value]);
    }
    return value;
  };

  return Buffer.concat([readInteger(), readInteger()]);
}

// ---------------------------------------------------------------------------
// Payload encryption (RFC 8291 / RFC 8188)
// ---------------------------------------------------------------------------

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  const output = createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest();
  return output.subarray(0, length);
}

function encryptPayload(payload: string, target: PushTarget): Buffer {
  const clientPublic = fromBase64url(target.p256dh);
  const auth = fromBase64url(target.auth);

  // An ephemeral key pair per message, so messages cannot be linked.
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const serverPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(clientPublic);

  const salt = randomBytes(16);

  // RFC 8291 §3.3: derive the input keying material from the shared secret.
  const authInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    clientPublic,
    serverPublic,
  ]);
  const ikm = hkdf(auth, sharedSecret, authInfo, 32);

  const contentEncryptionKey = hkdf(
    salt,
    ikm,
    Buffer.from('Content-Encoding: aes128gcm\0'),
    16,
  );
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  // A single record, so the padding delimiter is 0x02 ("last record").
  const plaintext = Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])]);

  const cipher = createCipheriv('aes-128-gcm', contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // aes128gcm header: salt | record size | key id length | key id
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const header = Buffer.concat([
    salt,
    recordSize,
    Buffer.from([serverPublic.length]),
    serverPublic,
  ]);

  return Buffer.concat([header, ciphertext, tag]);
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/**
 * Delivers one notification.
 *
 * Never throws: a dead subscription is an expected outcome (the browser was
 * uninstalled, the person cleared their data), and one failure must not stop
 * the rest of the staff being notified. A 404 or 410 is reported as `gone` so
 * the caller can delete the row.
 */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<PushResult> {
  if (!pushEnv.isConfigured()) {
    return { ok: false, gone: false, status: 0, detail: 'push_not_configured' };
  }

  try {
    const url = new URL(target.endpoint);
    const body = encryptPayload(JSON.stringify(payload), target);

    const response = await fetch(target.endpoint, {
      method: 'POST',
      headers: {
        Authorization: createVapidHeader(`${url.protocol}//${url.host}`),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        // Four hours: a new-order alert is worthless a day later.
        TTL: '14400',
        Urgency: 'normal',
      },
      body: new Uint8Array(body),
    });

    if (response.ok) return { ok: true };

    const detail = await response.text().catch(() => '');
    return {
      ok: false,
      gone: response.status === 404 || response.status === 410,
      status: response.status,
      detail: detail.slice(0, 200),
    };
  } catch (error) {
    return {
      ok: false,
      gone: false,
      status: 0,
      detail: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

/** Generates a VAPID key pair. Used by `npm run push:keys`. */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: base64url(ecdh.getPublicKey()),
    privateKey: base64url(ecdh.getPrivateKey()),
  };
}

export { publicKeyFromPrivate };
