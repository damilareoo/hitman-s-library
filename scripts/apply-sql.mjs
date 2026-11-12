#!/usr/bin/env node
// scripts/apply-sql.mjs
//
// Applies one migration file to the database in .env.local, statement by
// statement (Neon's HTTP driver runs one statement per call). Migrations in
// this repo are written to be re-runnable (IF NOT EXISTS).
//
//   node scripts/apply-sql.mjs scripts/025-accounts.sql

import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const file = process.argv[2]
if (!file) { console.error('usage: node scripts/apply-sql.mjs <file.sql>'); process.exit(1) }

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)
const statements = readFileSync(file, 'utf8').replace(/--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)
for (const st of statements) {
  await sql.query(st)
  console.log('ok:', st.split('\n')[0].slice(0, 70))
}
console.log(`${statements.length} statements applied from ${file}`)
