// lib/parse-id.ts
// Route ids are whole positive numbers. parseInt('12abc') is 12, which made
// /api/design/12abc answer as site 12 — so partial parses are rejected here.
export function parseId(raw: string): number | null {
  if (!/^\d{1,15}$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) ? n : null
}
