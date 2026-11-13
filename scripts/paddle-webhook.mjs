#!/usr/bin/env node
// scripts/paddle-webhook.mjs
//
// Registers (once) the Paddle notification destination for subscription
// events and pipes its signing secret straight into the Worker secret
// PADDLE_WEBHOOK_SECRET (or _LIVE with --live). The secret is never printed. Sandbox unless --live.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const live = process.argv.includes('--live')
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const KEY = live ? env.PADDLE_API_KEY_LIVE : env.PADDLE_API_KEY
const BASE = live ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'
const DEST = 'https://hitmanslibrary.xyz/api/paddle/webhook'
const EVENTS = ['subscription.created', 'subscription.updated', 'subscription.activated', 'subscription.canceled', 'subscription.past_due', 'subscription.paused', 'subscription.resumed', 'subscription.trialing']

async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json?.error?.code ?? ''} ${json?.error?.detail ?? ''}`)
  return json.data
}

const existing = (await api('GET', '/notification-settings')).find(n => n.destination === DEST)
const setting = existing
  ? await api('PATCH', `/notification-settings/${existing.id}`, { subscribed_events: EVENTS, active: true })
  : await api('POST', '/notification-settings', { description: "Hitman's Library subscriptions", destination: DEST, subscribed_events: EVENTS, type: 'url', include_sensitive_fields: false, api_version: 1 })
console.log('notification setting', setting.id, existing ? '(updated)' : '(created)')

const secret = setting.endpoint_secret_key ?? existing?.endpoint_secret_key
if (!secret) { console.error('No signing secret returned'); process.exit(1) }
const put = spawnSync('./node_modules/.bin/wrangler', ['secret', 'put', live ? 'PADDLE_WEBHOOK_SECRET_LIVE' : 'PADDLE_WEBHOOK_SECRET'], { input: secret, encoding: 'utf8' })
console.log(put.status === 0 ? `${live ? 'PADDLE_WEBHOOK_SECRET_LIVE' : 'PADDLE_WEBHOOK_SECRET'} stored in the Worker` : 'Failed to store the secret: ' + (put.stderr || '').split('\n')[0])
