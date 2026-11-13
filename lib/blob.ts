// lib/blob.ts
//
// The two Vercel Blob calls the app makes (upload, delete), as plain fetch.
// Replaces @vercel/blob, whose Node-only dependencies (undici and friends)
// were the single largest piece of the Worker bundle. Same endpoints, headers
// and API version as @vercel/blob 2.3.1.
const API = 'https://vercel.com/api/blob'
const API_VERSION = '12'

interface Opts { token?: string; fetch?: typeof fetch }

function auth(o: Opts) {
  const token = o.token ?? process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  return { authorization: `Bearer ${token}`, 'x-api-version': API_VERSION }
}

export async function put(
  pathname: string,
  body: BodyInit | Uint8Array,
  options: { access: 'public'; contentType?: string },
  o: Opts = {},
): Promise<{ url: string; pathname: string }> {
  const headers: Record<string, string> = { ...auth(o), 'x-vercel-blob-access': options.access }
  if (options.contentType) headers['x-content-type'] = options.contentType
  const res = await (o.fetch ?? fetch)(`${API}/?${new URLSearchParams({ pathname })}`, { method: 'PUT', headers, body: body as BodyInit })
  if (!res.ok) throw new Error(`blob put ${pathname} → ${res.status}`)
  return res.json() as Promise<{ url: string; pathname: string }>
}

export async function del(urlOrUrls: string | string[], o: Opts = {}): Promise<void> {
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls]
  const res = await (o.fetch ?? fetch)(`${API}/delete`, {
    method: 'POST', headers: { ...auth(o), 'content-type': 'application/json' }, body: JSON.stringify({ urls }),
  })
  if (!res.ok) throw new Error(`blob delete → ${res.status}`)
}
