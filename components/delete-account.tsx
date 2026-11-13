// components/delete-account.tsx
// Deleting your account, on the privacy page where the promise is made. Only
// shown when signed in. Two taps, and the second only counts after a beat, so
// a double-click can never delete.
'use client'

import { useState } from 'react'
import { useAccount, deleteAccount } from '@/lib/account-client'

export function DeleteAccount() {
  const { status } = useAccount()
  const [armedAt, setArmedAt] = useState(0)
  const [state, setState] = useState<'idle' | 'armed' | 'failed' | 'done'>('idle')
  if (state === 'done') return <p className="mt-4 text-meta text-ink-3">Your account and everything saved with it are gone.</p>
  if (status !== 'signed-in') return null
  return (
    <div className="mt-4 flex items-center gap-3 text-meta">
      {state === 'idle' ? (
        <button className="text-ink-3 underline underline-offset-4 decoration-edge-strong hover:text-ink transition-colors" onClick={() => { setState('armed'); setArmedAt(Date.now()) }}>
          Delete my account
        </button>
      ) : (
        <>
          <button
            className="font-[600] text-[#c8382f] dark:text-[#ff8a80] underline underline-offset-4"
            onClick={async () => {
              if (Date.now() - armedAt < 600) return
              setState((await deleteAccount()) ? 'done' : 'failed')
            }}
          >
            {state === 'failed' ? "Couldn't delete. Try again" : 'Delete everything, for good'}
          </button>
          <button className="text-ink-4 hover:text-ink transition-colors" onClick={() => setState('idle')}>Keep it</button>
        </>
      )}
    </div>
  )
}
