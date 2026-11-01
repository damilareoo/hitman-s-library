// lib/classify-extraction-error.ts

export type FailureCategory =
  | 'bot_protection'
  | 'login_required'
  | 'timeout'
  | 'not_found'
  | 'unreachable'
  | 'unknown'

export interface FailureInfo {
  category: FailureCategory
  label: string
  explanation: string
  icon: 'ShieldWarning' | 'LockSimple' | 'Clock' | 'FileDashed' | 'WifiSlash' | 'Warning'
}

const FAILURE_MAP: Record<FailureCategory, Omit<FailureInfo, 'category'>> = {
  bot_protection: {
    label: 'Bot protection',
    explanation: "This site blocks automated access. Design data can't be extracted — it requires a real browser session.",
    icon: 'ShieldWarning',
  },
  login_required: {
    label: 'Login required',
    explanation: 'This site requires authentication. Only public pages can be analyzed.',
    icon: 'LockSimple',
  },
  timeout: {
    label: 'Timed out',
    explanation: 'This site renders entirely client-side and timed out during extraction. Try re-extracting — it may work on a second attempt.',
    icon: 'Clock',
  },
  not_found: {
    label: 'Not found',
    explanation: 'This URL returned a 404. Check the address and try again.',
    icon: 'FileDashed',
  },
  unreachable: {
    label: 'Site unreachable',
    explanation: 'This site couldn\u2019t be reached during extraction — it may be down or its certificate may be failing. Try again in a little while.',
    icon: 'WifiSlash',
  },
  unknown: {
    label: 'Extraction failed',
    explanation: 'This site may use bot protection, require login, or block external requests.',
    icon: 'Warning',
  },
}

export function classifyExtractionError(message: string | null): FailureInfo {
  if (!message) return { category: 'unknown', ...FAILURE_MAP.unknown }
  const m = message.toLowerCase()
  let category: FailureCategory = 'unknown'
  // Order matters: a browser error carries the failed URL, so the page-level
  // markers are checked before any URL substring can claim the failure.
  if (m.includes('403') || m.includes('cloudflare') || m.includes('bot') || m.includes('blocked')) category = 'bot_protection'
  // Real sign-in evidence only. The bare word "login" used to sit here, and it
  // branded any failure whose address contained it — a navigation to /wp-login
  // that died on a bad certificate was reported as "requires authentication".
  else if (m.includes('401') || m.includes('unauthorized') || m.includes('sign in') || m.includes('signin') || m.includes('log in') || m.includes('login required') || m.includes('login_required')) category = 'login_required'
  else if (m.includes('timeout') || m.includes('timed out') || m.includes('timed_out') || m.includes('navigation timeout')) category = 'timeout'
  else if (m.includes('404') || m.includes('not found')) category = 'not_found'
  else if (m.includes('err_cert') || m.includes('err_ssl') || m.includes('err_connection') || m.includes('err_name_not_resolved') || m.includes('err_address_unreachable') || m.includes('err_http2') || m.includes('econnrefused') || m.includes('econnreset') || m.includes('connection reset') || m.includes('certificate') || m.includes('could not be resolved') || m.includes('enotfound')) category = 'unreachable'
  return { category, ...FAILURE_MAP[category] }
}
