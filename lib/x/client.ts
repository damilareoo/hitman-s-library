// lib/x/client.ts
// Posts to X as @hitmanslibrary: POST /2/tweets, signed with OAuth 1.0a user
// context (HMAC-SHA1 via Web Crypto, so it runs in the Worker with no deps).
// Credentials are Worker secrets, never in the repo:
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
const ENDPOINT = 'https://api.x.com/2/tweets'

export interface XCreds { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string }

export function xCredsFromEnv(env: Record<string, string | undefined> = process.env): XCreds | null {
  const c = { apiKey: env.X_API_KEY, apiSecret: env.X_API_SECRET, accessToken: env.X_ACCESS_TOKEN, accessSecret: env.X_ACCESS_SECRET }
  return c.apiKey && c.apiSecret && c.accessToken && c.accessSecret ? (c as XCreds) : null
}

/** RFC 3986 percent-encoding, as OAuth 1.0a requires. */
export const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase())

async function hmacSha1(key: string, text: string): Promise<string> {
  const enc = new TextEncoder()
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text)))
  let bin = ''
  for (const b of sig) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** The Authorization header. A JSON body is not part of the signature. */
export async function oauthHeader(method: string, url: string, c: XCreds, nonce: string, timestamp: string): Promise<string> {
  const params: Record<string, string> = {
    oauth_consumer_key: c.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: c.accessToken,
    oauth_version: '1.0',
  }
  const paramStr = Object.keys(params).sort().map(k => `${pct(k)}=${pct(params[k])}`).join('&')
  const base = [method.toUpperCase(), pct(url), pct(paramStr)].join('&')
  const signature = await hmacSha1(`${pct(c.apiSecret)}&${pct(c.accessSecret)}`, base)
  const all = { ...params, oauth_signature: signature }
  return 'OAuth ' + Object.keys(all).sort().map(k => `${pct(k)}="${pct(all[k as keyof typeof all])}"`).join(', ')
}

const MEDIA = 'https://api.x.com/2/media/upload'
const fresh = () => ({ nonce: crypto.randomUUID().replace(/-/g, ''), timestamp: String(Math.floor(Date.now() / 1000)) })

/** Uploads one image (multipart; the body is not part of the signature). */
export async function uploadImage(bytes: ArrayBuffer, type: string, c: XCreds, f: typeof fetch = fetch): Promise<string> {
  const { nonce, timestamp } = fresh()
  const form = new FormData()
  form.append('media', new Blob([bytes], { type }), 'card.png')
  form.append('media_category', 'tweet_image')
  const res = await f(MEDIA, { method: 'POST', headers: { authorization: await oauthHeader('POST', MEDIA, c, nonce, timestamp) }, body: form })
  const body = await res.text()
  if (!res.ok) throw new Error(`X media ${res.status}: ${body.slice(0, 300)}`)
  const id = (JSON.parse(body) as { data?: { id?: string } }).data?.id
  if (!id) throw new Error(`X media returned no id: ${body.slice(0, 200)}`)
  return id
}

export async function postToX(text: string, c: XCreds, f: typeof fetch = fetch, mediaIds: string[] = []): Promise<{ id: string }> {
  const { nonce, timestamp } = fresh()
  const res = await f(ENDPOINT, {
    method: 'POST',
    headers: { authorization: await oauthHeader('POST', ENDPOINT, c, nonce, timestamp), 'content-type': 'application/json' },
    body: JSON.stringify(mediaIds.length ? { text, media: { media_ids: mediaIds } } : { text }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`X ${res.status}: ${body.slice(0, 300)}`)
  const id = (JSON.parse(body) as { data?: { id?: string } }).data?.id
  if (!id) throw new Error(`X returned no id: ${body.slice(0, 200)}`)
  return { id }
}
