import { describe, expect, test } from 'bun:test'
import { put, del } from './blob'

function fakeFetch(reply: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = []
  const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(reply), { status }) }) as unknown as typeof fetch
  return { f, calls }
}

describe('blob client', () => {
  test('put sends the same request @vercel/blob does', async () => {
    const { f, calls } = fakeFetch({ url: 'https://x.public.blob.vercel-storage.com/a/b.png', pathname: 'a/b.png' })
    const r = await put('a/b.png', new Uint8Array([1, 2]), { access: 'public', contentType: 'image/png' }, { token: 'tok', fetch: f })
    expect(r.url).toBe('https://x.public.blob.vercel-storage.com/a/b.png')
    expect(calls[0].url).toBe('https://vercel.com/api/blob/?pathname=a%2Fb.png')
    expect(calls[0].init.method).toBe('PUT')
    const h = calls[0].init.headers as Record<string, string>
    expect(h.authorization).toBe('Bearer tok')
    expect(h['x-api-version']).toBe('12')
    expect(h['x-vercel-blob-access']).toBe('public')
    expect(h['x-content-type']).toBe('image/png')
  })
  test('put without a token fails clearly', async () => {
    await expect(put('a', new Uint8Array(), { access: 'public' }, { token: '' })).rejects.toThrow('BLOB_READ_WRITE_TOKEN')
  })
  test('an API error is thrown, not returned', async () => {
    const { f } = fakeFetch({ error: { code: 'forbidden' } }, 403)
    await expect(put('a', new Uint8Array(), { access: 'public' }, { token: 't', fetch: f })).rejects.toThrow('403')
  })
  test('del posts the urls', async () => {
    const { f, calls } = fakeFetch({})
    await del(['https://x/a.png'], { token: 't', fetch: f })
    expect(calls[0].url).toBe('https://vercel.com/api/blob/delete')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ urls: ['https://x/a.png'] })
  })
  test('del takes a single url too', async () => {
    const { f, calls } = fakeFetch({})
    await del('https://x/b.png', { token: 't', fetch: f })
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ urls: ['https://x/b.png'] })
  })
})
