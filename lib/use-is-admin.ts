'use client'

import { useEffect, useState } from 'react'

// One request per page load, shared by every caller.
let cached: Promise<boolean> | null = null

function check(): Promise<boolean> {
  if (!cached) {
    cached = fetch('/api/admin/auth')
      .then(r => r.json())
      .then(d => Boolean(d.authed))
      .catch(() => false)
  }
  return cached
}

/**
 * Whether the current visitor holds a valid admin session.
 * Presentation only — every privileged route re-checks server-side.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    check().then(v => { if (active) setIsAdmin(v) })
    return () => { active = false }
  }, [])

  return isAdmin
}
