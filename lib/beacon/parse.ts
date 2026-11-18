// lib/beacon/parse.ts
// Pure helpers for our own visit counter: where a visit came from, what it
// was on, and whether it was a person at all. No I/O, so they are unit tested.

/** Referrer hosts, and ?ref= / utm_source values, grouped into one platform name. */
const PLATFORMS: [RegExp, string][] = [
  [/(^|\.)(x\.com|twitter\.com|t\.co)$|^(x|twitter|tw)$/, 'X'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$|^(linkedin|li)$/, 'LinkedIn'],
  [/(^|\.)google\.[a-z.]+$|^google$/, 'Google'],
  [/(^|\.)(bing\.com)$|^bing$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$|^(ddg|duckduckgo)$/, 'DuckDuckGo'],
  [/(^|\.)(chatgpt\.com|openai\.com)$|^chatgpt(\.com)?$/, 'ChatGPT'],
  [/(^|\.)(claude\.ai|anthropic\.com)$|^claude$/, 'Claude'],
  [/(^|\.)perplexity\.ai$|^perplexity$/, 'Perplexity'],
  [/(^|\.)producthunt\.com$|^(producthunt|ph)$/, 'Product Hunt'],
  [/(^|\.)(news\.ycombinator\.com)$|^(hn|hackernews)$/, 'Hacker News'],
  [/(^|\.)reddit\.com$|^reddit$/, 'Reddit'],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$|^(instagram|ig)$/, 'Instagram'],
  [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com)$|^(facebook|fb)$/, 'Facebook'],
  [/(^|\.)(threads\.net|threads\.com)$|^threads$/, 'Threads'],
  [/(^|\.)bsky\.app$|^(bluesky|bsky)$/, 'Bluesky'],
  [/(^|\.)(github\.com)$|^github$/, 'GitHub'],
  [/(^|\.)(dribbble\.com)$|^dribbble$/, 'Dribbble'],
  [/(^|\.)(behance\.net)$|^behance$/, 'Behance'],
  [/(^|\.)(peerlist\.io)$|^peerlist$/, 'Peerlist'],
  [/(^|\.)(contra\.com)$|^contra$/, 'Contra'],
  [/(^|\.)(slack\.com)$|^slack$/, 'Slack'],
  [/(^|\.)(discord\.com|discord\.gg)$|^discord$/, 'Discord'],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^whatsapp$/, 'WhatsApp'],
  [/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com)$|^(email|newsletter)$/, 'Email'],
]

/**
 * The platform a visit came from. A campaign tag (?utm_source=, ?ref=) wins
 * over the referrer, because apps like X and Slack strip the referrer.
 */
export function sourceOf(referrerHost: string | null, tag: string | null, ownHost = 'hitmanslibrary.xyz'): string {
  const t = tag?.trim().toLowerCase()
  if (t) {
    for (const [re, name] of PLATFORMS) if (re.test(t)) return name
    return t.slice(0, 40)
  }
  const host = referrerHost?.toLowerCase().replace(/^www\./, '') ?? ''
  if (!host || host === ownHost || host.endsWith('.' + ownHost)) return 'Direct'
  for (const [re, name] of PLATFORMS) if (re.test(host)) return name
  return host.slice(0, 60)
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|puppeteer|playwright|phantom|preview|facebookexternalhit|embedly|quora link|vercel|cloudflare|python|curl|wget|httpclient|axios|node-fetch|go-http/i

export function isBot(ua: string | null): boolean {
  return !ua || ua.length < 20 || BOT.test(ua)
}

export interface Agent { device: 'Mobile' | 'Tablet' | 'Desktop'; browser: string; os: string }

export function agentOf(ua: string): Agent {
  const tablet = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)
  const mobile = !tablet && /Mobi|iPhone|iPod|Android/i.test(ua)
  const os =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other'
  // In-app browsers first: they say Safari or Chrome too.
  const browser =
    /\bTwitter|TwitterAndroid/i.test(ua) ? 'X app'
    : /LinkedInApp/i.test(ua) ? 'LinkedIn app'
    : /Instagram/i.test(ua) ? 'Instagram app'
    : /FBAN|FBAV/i.test(ua) ? 'Facebook app'
    : /Dia\//.test(ua) ? 'Dia'
    : /Arc\//.test(ua) ? 'Arc'
    : /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Brave/i.test(ua) ? 'Brave'
    : /SamsungBrowser/.test(ua) ? 'Samsung'
    : /Firefox|FxiOS/.test(ua) ? 'Firefox'
    : /Chrome|CriOS/.test(ua) ? 'Chrome'
    : /Safari/.test(ua) ? 'Safari'
    : 'Other'
  return { device: tablet ? 'Tablet' : mobile ? 'Mobile' : 'Desktop', browser, os }
}

/** Names a teammate may be tagged with: short, plain. */
export function cleanTeamName(n: unknown): string | null {
  if (typeof n !== 'string') return null
  const s = n.trim().replace(/\s+/g, ' ')
  return /^[\p{L}\p{N} ._-]{1,24}$/u.test(s) ? s : null
}

/** Clamp a string from the browser before it reaches the database. */
export function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}
