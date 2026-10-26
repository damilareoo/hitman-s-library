import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const routePath = new URL('../app/api/design/extract/route.ts', import.meta.url)
const html = `<html><head><title>Example</title><meta property="og:image" content="https://example.com/og.png"><link rel="stylesheet" href="/style.css"></head><body><main>${'Example site content. '.repeat(50)}</main></body></html>`
const typographyData = {
  allFonts: ['Example Sans'],
  headingFonts: [],
  bodyFonts: [{ name: 'Example Sans' }],
  monoFonts: [],
}
const typeRow = {
  fontFamily: 'Example Sans',
  role: 'body',
  googleFontsUrl: null,
  primaryWeight: 400,
  sampleSizePx: null,
  sampleLineHeight: null,
}

function loadAddRoute() {
  const source = readFileSync(routePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  const accelSetTimeout = (callback, ms) => setTimeout(callback, ms >= 40_000 ? 0 : ms)
  const sql = async (strings) => {
    const query = strings.join(' ')
    if (query.includes('SELECT id FROM design_sources')) return []
    if (query.includes('INSERT INTO design_sources')) return [{ id: 777 }]
    return []
  }
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    'next/cache': { revalidateTag: () => {} },
    '@neondatabase/serverless': { Client: class { async connect() {} async query() {} async end() {} } },
    '@/lib/db': { getSql: () => sql },
    '@/lib/typography-extraction': { extractTypographyEnhanced: () => typographyData },
    '@/lib/browser-extraction': { extractFullDesignData: () => new Promise(() => {}) },
    '@/lib/color-utils': {
      deduplicateColors: colors => [...new Set(colors)],
      toColorFormats: hex => ({ hex, oklch: 'oklch(0.5 0.1 20)' }),
    },
    '@/lib/tagging': { computeTags: () => [] },
    '@/lib/extraction-history': { recordExtraction: async () => {} },
    '@/lib/thumbnail-optimize': { optimizeThumbnail: async () => null },
    '@/lib/similarity': { SIMILAR_ENABLED: false, embedSite: async () => [], toVectorLiteral: () => '' },
    '@/lib/admin-auth': { requireAdmin: async () => null },
    '@/lib/safe-url': {
      assertPublicUrl: async url => new URL(url),
      BlockedUrlError: class BlockedUrlError extends Error {},
      safeFetch: async url => new Response(String(url).endsWith('.css') ? 'body{font-family:"Example Sans";color:#123456}' : html, {
        status: 200,
        headers: { 'Content-Type': String(url).endsWith('.css') ? 'text/css' : 'text/html' },
      }),
    },
    '@/lib/normalize-url': { normalizeUrl: url => new URL(url).hostname },
    '@/lib/site-kind': { inferKind: () => 'portfolio' },
    '@/lib/categories': { KINDS: ['portfolio'] },
    '@/lib/extraction-deadline': {
      withDeadline: (promise, ms) => new Promise((resolve, reject) => {
        const timer = accelSetTimeout(() => reject(new Error(`Extraction did not finish within ${Math.round(ms / 1000)}s`)), ms)
        promise.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
      }),
    },
    '@/lib/static-extraction': {
      extractStaticDesignData: async (url, document) => ({
        colors: ['#123456'],
        typography: [typeRow],
        typographyData,
        source: `${document}\nbody{font-family:"Example Sans";color:#123456}`,
      }),
    },
  }
  const context = vm.createContext({
    URL,
    Response,
    AbortController,
    AbortSignal,
    console,
    process: { env: {} },
    setTimeout: accelSetTimeout,
    clearTimeout,
  })
  const script = new vm.Script(`(function (exports, require, module) { ${output}\n })`)
  script.runInContext(context)(module.exports, id => {
    if (!(id in mocks)) throw new Error(`Missing mock for ${id}`)
    return mocks[id]
  }, module)
  return module.exports.POST
}

test('a hung browser cannot turn a usable add into a connection error', async () => {
  const post = loadAddRoute()
  const response = await Promise.race([
    post({ json: async () => ({ url: 'https://example.com' }) }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Add did not respond after the browser hung')), 500)),
  ])
  assert.equal(response.status, 200)
  assert.equal(response.body.id, 777)
  assert.equal(response.body.success, true)
  assert.deepEqual(Array.from(response.body.colors), ['#123456'])
  assert.equal(response.body.typography_detailed.bodyFonts[0].name, 'Example Sans')
})
