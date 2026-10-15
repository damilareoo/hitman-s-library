// app/unsubscribe/page.tsx
'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Brand } from '@/components/brand'

function UnsubscribeForm() {
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<'idle' | 'sending' | 'done' | { error: string }>('idle')

  async function confirm() {
    if (state === 'sending' || state === 'done') return
    setState('sending')
    try {
      const res = await fetch('/api/taste/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      setState(res.ok ? 'done' : { error: data.error ?? 'That did not go through.' })
    } catch {
      setState({ error: 'Could not reach the server.' })
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8"><Brand /></div>
      {state === 'done' ? (
        <>
          <h1 className="text-heading text-foreground mb-2">Unsubscribed</h1>
          <p className="text-bodytext text-ink-3 mb-6">No more digests. The library is still here when you want it.</p>
          <Link href="/" className="text-meta text-ink-4 hover:text-ink underline underline-offset-2 transition-colors">
            Back to the gallery
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-heading text-foreground mb-2">Leave the weekly digest?</h1>
          <p className="text-bodytext text-ink-3 mb-6">One click, no questions, no confirmation email about it.</p>
          <button
            onClick={confirm}
            disabled={state === 'sending' || !token}
            className="h-9 px-4 rounded-[6px] bg-foreground text-background text-bodytext font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {state === 'sending' ? 'Leaving…' : 'Unsubscribe me'}
          </button>
          {typeof state === 'object' && (
            <p className="mt-3 text-meta text-[var(--color-error)]">{state.error}</p>
          )}
        </>
      )}
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeForm />
    </Suspense>
  )
}
