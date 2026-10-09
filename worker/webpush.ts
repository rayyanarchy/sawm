// Web Push with the Web Crypto API, so it runs on Workers: payload encryption (RFC 8291, aes128gcm)
// and VAPID authentication (RFC 8292). The Node `web-push` package doesn't run here.

export interface PushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface Vapid {
  /** The uncompressed P-256 public key (65 bytes), base64url. Browsers get the same key to subscribe with. */
  publicKey: string
  /** The private scalar d (32 bytes), base64url. */
  privateKey: string
  /** A mailto: or https: contact for push services. */
  subject: string
}

const encoder = new TextEncoder()

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export async function hkdf(salt: BufferSource, ikm: BufferSource, info: BufferSource, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8))
}

export const WEB_PUSH_INFO = encoder.encode('WebPush: info\0')
export const CEK_INFO = encoder.encode('Content-Encoding: aes128gcm\0')
export const NONCE_INFO = encoder.encode('Content-Encoding: nonce\0')

/** Encrypts a payload for one subscription, as a single aes128gcm record. */
export async function encrypt(payload: Uint8Array, subscription: PushSubscriptionJSON): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = fromBase64Url(subscription.keys.p256dh)
  const auth = fromBase64Url(subscription.keys.auth)
  const server = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', server.publicKey)) as ArrayBuffer)
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  // Workers' types spell this parameter `$public`; the runtime, like browsers, takes `public`.
  const ecdh = { name: 'ECDH', public: uaKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0]
  const secret = new Uint8Array(await crypto.subtle.deriveBits(ecdh, server.privateKey, 256))

  const ikm = await hkdf(auth, secret, concat(WEB_PUSH_INFO, uaPublic, asPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await crypto.subtle.importKey('raw', await hkdf(salt, ikm, CEK_INFO, 16), 'AES-GCM', false, ['encrypt'])
  const nonce = await hkdf(salt, ikm, NONCE_INFO, 12)
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, concat(payload, new Uint8Array([2]))))

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, ciphertext)
}

/** The Authorization header that proves to the push service this server holds the VAPID key. */
export async function vapidAuthorization(endpoint: string, vapid: Vapid, now = Date.now()): Promise<string> {
  const json = (value: unknown) => toBase64Url(encoder.encode(JSON.stringify(value)))
  const unsigned = `${json({ typ: 'JWT', alg: 'ES256' })}.${json({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })}`
  const publicKey = fromBase64Url(vapid.publicKey)
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: toBase64Url(publicKey.slice(1, 33)), y: toBase64Url(publicKey.slice(33, 65)), d: vapid.privateKey, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)))
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${vapid.publicKey}`
}

/** Sends one push. The TTL is how long the push service may hold it if the device is offline. */
export async function sendPush(subscription: PushSubscriptionJSON, payload: unknown, ttlSeconds: number, vapid: Vapid): Promise<Response> {
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(Math.max(0, Math.floor(ttlSeconds))),
      Urgency: 'high',
    },
    body: await encrypt(encoder.encode(JSON.stringify(payload)), subscription),
  })
}
