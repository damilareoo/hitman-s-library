// lib/classify-extraction-error.ts

export type FailureCategory =
  | 'bot_protection'
  | 'login_required'
  | 'timeout'
  | 'not_found'
  | 'unknown'

export interface FailureInfo {
  category: FailureCategory
  label: string
  explanation: string
  icon: 'ShieldAlert' | 'Lock' | 'Clock' | 'FileQuestion' | 'AlertTriangle'
}

const FAILURE_MAP: Record<FailureCategory, Omit<FailureInfo, 'category'>> = {
  bot_protection: {
    label: 'Bot protection',
    explanation: "This site blocks automated access. Design data can't be extracted — it requires a real browser session.",
    icon: 'ShieldAlert',
  },
  login_required: {
    label: 'Login required',
    explanation: 'This site requires authentication. Only public pages can be analyzed.',
    icon: 'Lock',
  },
  timeout: {
    label: 'Timed out',
    explanation: 'This site renders entirely client-side and timed out during extraction. Try re-extracting — it may work on a second attempt.',
    icon: 'Clock',
  },
  not_found: {
    label: 'Not found',
    explanation: 'This URL returned a 404. Check the address and try again.',
    icon: 'FileQuestion',
  },
  unknown: {
    label: 'Extraction failed',
    explanation: 'This site may use bot protection, require login, or block external requests.',
    icon: 'AlertTriangle',
  },
}

export function classifyExtractionError(message: string | null): FailureInfo {
  if (!message) return { category: 'unknown', ...FAILURE_MAP.unknown }
  const m = message.toLowerCase()
  let category: FailureCategory = 'unknown'
  if (m.includes('403') || m.includes('cloudflare') || m.includes('bot') || m.includes('blocked')) category = 'bot_protection'
  else if (m.includes('401') || m.includes('login') || m.includes('unauthorized') || m.includes('sign in')) category = 'login_required'
  else if (m.includes('timeout') || m.includes('timed out') || m.includes('navigation timeout')) category = 'timeout'
  else if (m.includes('404') || m.includes('not found')) category = 'not_found'
  return { category, ...FAILURE_MAP[category] }
}
