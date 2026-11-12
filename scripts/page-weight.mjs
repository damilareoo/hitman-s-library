#!/usr/bin/env node
// scripts/page-weight.mjs
//
// HTML weight of the main pages: total bytes and the share that is inline
// <script> (mostly the RSC payload, which repeats whatever a server component
// hands to a client component as props).
//
//   node scripts/page-weight.mjs [base]

const BASE = process.argv[2] ?? 'https://hitmanslibrary.xyz'
const PAGES = ['/', '/about', '/changelog', '/submit']
const kb = n => `${(n / 1024).toFixed(0)} KB`

for (const page of PAGES) {
  const html = await (await fetch(BASE + page)).text()
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].reduce((n, m) => n + m[0].length, 0)
  // What a visitor downloads: the same document, compressed as the edge sends it.
  const wire = new Blob([html]).stream().pipeThrough(new CompressionStream('gzip'))
  const gz = (await new Response(wire).arrayBuffer()).byteLength
  console.log(`${page.padEnd(12)} html ${kb(html.length).padStart(7)}   inline script ${kb(scripts).padStart(7)}   gzip ${kb(gz).padStart(6)}`)
}
