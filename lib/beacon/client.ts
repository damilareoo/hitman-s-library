// lib/beacon/client.ts
// The browser half of our own visit counter. Sends one small beacon to
// /api/a per page view and per click worth counting. No cookies, no names:
// a random visitor id in localStorage and a session that ends after 30 quiet
// minutes, the way most analytics tools count them.

const VISITOR = 'hl_v'
const SESSION = 'hl_s'
const SESSION_GAP_MS = 30 * 60 * 1000
const ENDPOINT = '/api/a'

interface Session { id: string; last: number; landed: boolean }

let started = false
let lastPath = ''

const rid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '').slice(0, 24)

function store(): Storage | null {
  try { return window.localStorage } catch { return null }
}

/** Kept in memory too, so a browser with storage blocked still counts one visitor per tab. */
const memory: Record<string, string> = {}
function get(key: string): string | null {
  try { return store()?.getItem(key) ?? memory[key] ?? null } catch { return memory[key] ?? null }
}
function set(key: string, value: string) {
  memory[key] = value
  try { store()?.setItem(key, value) } catch { /* private mode */ }
}

function visitorId(): string {
  let v = get(VISITOR)
  if (!v) { v = rid(); set(VISITOR, v) }
  return v
}

function session(): Session {
  const now = Date.now()
  let s: Session | null = null
  try { s = JSON.parse(get(SESSION) || 'null') } catch { s = null }
  if (!s || now - s.last > SESSION_GAP_MS) s = { id: rid(), last: now, landed: false }
  s.last = now
  set(SESSION, JSON.stringify(s))
  return s
}

/** Counting runs on the live site only: not in development, previews or the admin. */
function counting(): boolean {
  const h = location.hostname
  return (h === 'hitmanslibrary.xyz' || location.search.includes('hl_debug')) && !location.pathname.startsWith('/admin')
}

function siteOnPage(): string | null {
  const m = location.pathname.match(/^\/site\/(.+)$/)
  if (m) return decodeURIComponent(m[1])
  return new URLSearchParams(location.search).get('site')
}

export function hit(kind: string, data: { site?: unknown; target?: unknown } = {}) {
  if (typeof window === 'undefined' || !counting()) return
  const s = session()
  const body: Record<string, unknown> = {
    k: kind,
    v: visitorId(),
    s: s.id,
    p: location.pathname,
    site: data.site ?? siteOnPage() ?? undefined,
    t: data.target ?? undefined,
  }
  // The first hit of a session carries where it came from.
  if (!s.landed) {
    const q = new URLSearchParams(location.search)
    body.l = true
    body.r = document.referrer || undefined
    body.src = q.get('utm_source') || q.get('ref') || q.get('via') || undefined
    body.c = q.get('utm_campaign') || undefined
    s.landed = true
    set(SESSION, JSON.stringify(s))
  }
  const json = JSON.stringify(body)
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([json], { type: 'text/plain' }))) return
  } catch { /* fall through */ }
  fetch(ENDPOINT, { method: 'POST', body: json, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
}

function view() {
  if (location.pathname === lastPath) return
  lastPath = location.pathname
  hit('view')
}

/**
 * Page views, including the gallery's own address changes (opening a site
 * pushes /site/<name>). replaceState only rewrites the address of the page
 * already counted, so it moves the marker without counting again.
 */
export function startCounting() {
  if (started || typeof window === 'undefined') return
  started = true
  const push = history.pushState.bind(history)
  const replace = history.replaceState.bind(history)
  history.pushState = function (...args: Parameters<History['pushState']>) { push(...args); queueMicrotask(view) }
  history.replaceState = function (...args: Parameters<History['replaceState']>) { replace(...args); lastPath = location.pathname }
  addEventListener('popstate', view)

  // Visits to the real sites: any link that leaves for another host.
  addEventListener('click', e => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!a) return
    let url: URL
    try { url = new URL(a.href, location.href) } catch { return }
    if (!/^https?:$/.test(url.protocol) || url.hostname === location.hostname) return
    hit('outbound', { target: url.hostname.replace(/^www\./, '') })
  }, { capture: true, passive: true })

  view()
}
