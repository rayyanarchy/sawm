// Generates a VAPID key pair for Web Push. The public key goes in wrangler.jsonc (VAPID_PUBLIC_KEY);
// the private key is a secret: `pnpm exec wrangler secret put VAPID_PRIVATE_KEY`, and in .dev.vars for local dev.
const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
const raw = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
console.log(`VAPID_PUBLIC_KEY=${Buffer.from(raw).toString('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`)
