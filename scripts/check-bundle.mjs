#!/usr/bin/env node
// scripts/check-bundle.mjs
//
// Keeps the Worker small. Run after `opennextjs-cloudflare build`: it does a
// wrangler dry-run, then fails if the compressed upload passes the budget or
// the bundle carries code that belongs only in the browser or in scripts.
//
//   node scripts/check-bundle.mjs

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BUDGET_KIB = 2000 // gzip; the free plan's hard limit is 3 MB
// Bundled package code carries its node_modules path in the module ids; bare
// names also appear in harmless places (the serverExternalPackages list).
const FORBIDDEN = ['node_modules/posthog-js/', 'node_modules/@vercel/blob/', 'node_modules/undici/', 'node_modules/onnxruntime', 'node_modules/@xenova/', 'node_modules/@sparticuz/', 'node_modules/puppeteer/']

const out = mkdtempSync(join(tmpdir(), 'hl-bundle-'))
const log = execFileSync('./node_modules/.bin/wrangler', ['deploy', '--dry-run', '--outdir', out], { encoding: 'utf8' })
const m = log.match(/gzip:\s*([\d.]+)\s*KiB/)
const gzip = m ? Number(m[1]) : NaN
const entry = readdirSync(out).find(f => f.endsWith('.js'))
const worker = readFileSync(join(out, entry), 'utf8')
const found = FORBIDDEN.filter(s => worker.includes(s))

console.log(`worker gzip ${gzip} KiB (budget ${BUDGET_KIB})`)
for (const f of found) console.log(`forbidden in bundle: ${f}`)
process.exit(!(gzip <= BUDGET_KIB) || found.length ? 1 : 0)
