'use client'

import { BTN, INPUT } from '@/components/member-card'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ArrowUpRight, Check, Globe, Minus, Plus, Warning } from '@phosphor-icons/react'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'
import { EASE, DUR } from '@/lib/motion'
import { useSiteRequests } from '@/lib/use-site-requests'
import { track } from '@/lib/analytics'

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'new'; title: string; image: string | null; favicon: string; reachable: boolean }
  | { kind: 'existing'; id: string; title: string; image: string | null }
  | { kind: 'already-requested'; requestCount: number; status: string; sourceId: string | null; title: string | null; image: string | null }
  | { kind: 'unreachable'; message: string }
  | { kind: 'rate-limited'; retryAfterSeconds: number }

// Every field here uses the site's one input style.
const FIELD = INPUT

/**
 * The submit form, in page form.
 *
 * Same machinery as the old request dialog — live duplicate check, batch
 * paste, remembered requests — but framed for the maker: it is your work
 * going onto the shelf, not a favour you are asking for.
 */
export function SubmitForm() {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [credit, setCredit] = useState('')
  const [note, setNote] = useState('')
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewState>({ kind: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ title: string | null; count: number } | null>(null)
  const [batchResults, setBatchResults] = useState<Array<{ url: string; state: string; site?: { id: string; title: string }; message?: string; requestCount?: number }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const checkSeq = useRef(0)
  const { requests, remember } = useSiteRequests()

  // ?url= carries the search that found nothing — reading it after mount
  // keeps the page itself static, so the Worker never renders it per visit.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('url')
    if (u) setUrl(u)
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  // One per line, comma, or space run — mirrors the server split exactly.
  const parts = url.split(/[\n,]+/).map(part => part.trim()).filter(Boolean).slice(0, 10)
  const isBatch = parts.length > 1

  // Resolve what they typed, debounced — the same flow the dialog used.
  useEffect(() => {
    if (parts.length !== 1) {
      setPreview({ kind: 'idle' })
      return
    }
    const trimmed = url.trim()
    if (trimmed.length < 4 || !trimmed.includes('.')) {
      setPreview({ kind: 'idle' })
      return
    }

    setPreview(p => (p.kind === 'idle' ? { kind: 'checking' } : p))
    const seq = ++checkSeq.current

    const t = setTimeout(async () => {
      try {
        setPreview({ kind: 'checking' })
        const res = await fetch('/api/request/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        })
        const data = await res.json()
        // A slower earlier lookup must not overwrite a newer one.
        if (seq !== checkSeq.current) return

        if (data.state === 'existing') {
          setPreview({ kind: 'existing', id: data.site.id, title: data.site.title, image: data.site.image })
        } else if (data.state === 'already-requested') {
          setPreview({
            kind: 'already-requested',
            requestCount: data.requestCount,
            status: data.status,
            sourceId: data.sourceId,
            title: data.preview?.title ?? null,
            image: data.preview?.image ?? null,
          })
        } else if (data.state === 'new') {
          setPreview({
            kind: 'new',
            title: data.preview.title,
            image: data.preview.image,
            favicon: data.preview.favicon,
            reachable: data.preview.reachable,
          })
        } else if (data.state === 'unreachable') {
          setPreview({ kind: 'unreachable', message: data.message })
        } else if (data.state === 'rate-limited') {
          setPreview({ kind: 'rate-limited', retryAfterSeconds: data.retryAfterSeconds })
        } else {
          setPreview({ kind: 'idle' })
        }
      } catch {
        if (seq !== checkSeq.current) return
        // The dev server has no database, so the live check can never answer
        // and the rest of the form would stay invisible. Pretend the site is
        // new, but only on localhost — never on the live domain.
        if (window.location.hostname === 'localhost') {
          setPreview({
            kind: 'new',
            title: trimmed.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, ''),
            image: null,
            favicon: '',
            reachable: false,
          })
          return
        }
        setPreview({ kind: 'idle' })
      }
    }, 450)

    return () => clearTimeout(t)
  }, [url])

  const submit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    setBatchResults(null)

    const previewTitle =
      preview.kind === 'new' ? preview.title
      : preview.kind === 'already-requested' ? preview.title
      : null
    const previewImage =
      preview.kind === 'new' ? preview.image
      : preview.kind === 'already-requested' ? preview.image
      : null

    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          company: '', // honeypot — real people never fill this
          email: email.trim() || undefined,
          credit: isBatch ? undefined : credit.trim() || undefined,
          note: isBatch ? undefined : note.trim() || undefined,
          preview: { title: previewTitle, image: previewImage },
        }),
      })
      const data = await res.json()

      if (data.state === 'existing') {
        setPreview({ kind: 'existing', id: data.site.id, title: data.site.title, image: null })
      } else if (data.state === 'received') {
        remember(url.trim(), previewTitle)
        track('site_request_submitted', { request_count: 1, is_batch: false })
        setSubmitted({ title: previewTitle, count: data.requestCount ?? 1 })
      } else if (data.state === 'batch' && Array.isArray(data.results)) {
        const receivedCount = data.results.filter((r: { state: string }) => r.state === 'received').length
        for (const r of data.results) {
          if (r.state === 'received') remember(r.url, null)
        }
        if (receivedCount > 0) {
          track('site_request_submitted', { request_count: receivedCount, is_batch: true })
        }
        setBatchResults(data.results)
      } else {
        setError(data.message ?? 'That did not go through. Try again.')
      }
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setSubmitting(false)
    }
  }, [url, preview, submitting, email, credit, note, isBatch, remember])

  const looksLikeUrl = (part: string) => part.includes('.') && part.length >= 4
  const canSubmit =
    !submitting &&
    (isBatch
      ? parts.length > 0 && parts.every(looksLikeUrl)
      : preview.kind === 'new' || preview.kind === 'already-requested')

  if (submitted) {
    return (
      <SubmittedView
        title={submitted.title}
        count={submitted.count}
        onAnother={() => { setSubmitted(null); setUrl(''); setCredit(''); setNote(''); setExtrasOpen(false); setPreview({ kind: 'idle' }) }}
      />
    )
  }

  return (
    <div>

      <label htmlFor="submit-url" className="block text-micro text-ink-4 mb-2">
        Your site&apos;s address
      </label>
      <div className="relative">
        <Globe className="absolute left-3 top-[15px] w-3.5 h-3.5 text-ink-4 pointer-events-none" weight="regular" />
        <textarea
          id="submit-url"
          ref={inputRef}
          rows={isBatch ? 3 : 2}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="stripe.com — one per line for several"
          aria-label="Website addresses, one per line"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) { e.preventDefault(); submit() } }}
          className={`${FIELD} h-auto min-h-[68px] pl-9 pr-9 py-2.5 resize-y`}
        />
        {preview.kind === 'checking' && (
          <span className="absolute right-3 top-[15px]">
            <Spinner className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Hidden from people, irresistible to form-filling bots. Not
          display:none — some bots skip those; this is off-screen and
          removed from the tab order and the accessibility tree. */}
      <div aria-hidden="true" className="absolute w-px h-px overflow-hidden -left-[9999px]">
        <label htmlFor="hl-company">Company</label>
        <input id="hl-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <PreviewCard preview={preview} />

      {preview.kind === 'unreachable' && (
        <p className="mt-3 text-meta text-ink-3 flex items-center gap-1.5">
          <Warning className="w-3.5 h-3.5 shrink-0 text-[var(--color-error)]" weight="fill" />
          {preview.message}
        </p>
      )}

      {preview.kind === 'rate-limited' && (
        <p className="mt-3 text-meta text-ink-3">
          Give it {Math.ceil(preview.retryAfterSeconds / 60)} minute
          {Math.ceil(preview.retryAfterSeconds / 60) === 1 ? '' : 's'} and try again.
        </p>
      )}

      {error && (
        <p className="mt-3 text-meta text-[var(--color-error)] flex items-center gap-1.5">
          <Warning className="w-3.5 h-3.5 shrink-0" weight="fill" />
          {error}
        </p>
      )}

      {batchResults ? (
        <BatchResults
          results={batchResults}
          onAnother={() => { setBatchResults(null); setUrl(''); setPreview({ kind: 'idle' }) }}
        />
      ) : canSubmit && (
        <div className="mt-4">
          <button
            onClick={submit}
            disabled={submitting}
            className={BTN.primaryLg + ' w-full gap-2'}
          >
            {submitting ? <Spinner className="w-3.5 h-3.5 border-t-background" /> : null}
            {isBatch
              ? `Submit ${parts.length} sites`
              : preview.kind === 'already-requested' ? 'Add my voice' : 'Submit to the shelf'}
            {!submitting && <ArrowRight className="w-3.5 h-3.5" weight="bold" />}
          </button>
          <p className="mt-2.5 text-meta text-ink-4">
            Nothing posts immediately — every submission passes a person first.
          </p>

          {!isBatch && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setExtrasOpen(o => !o)}
                aria-expanded={extrasOpen}
                className="inline-flex items-center gap-1.5 text-meta text-ink-3 hover:text-ink transition-colors"
              >
                {extrasOpen ? <Minus className="w-3 h-3" weight="regular" /> : <Plus className="w-3 h-3" weight="regular" />}
                {extrasOpen ? 'Less' : 'Your name, email or a note'} — optional
              </button>

              {extrasOpen && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="submit-credit" className="block text-micro text-ink-4 mb-2">
                      Your name or handle
                    </label>
                    <input
                      id="submit-credit"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={120}
                      placeholder="@yourname"
                      value={credit}
                      onChange={e => setCredit(e.target.value)}
                      className={FIELD}
                    />
                    <p className="mt-1.5 text-meta text-ink-4">
                      Goes with your submission so the reviewer can credit you.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="submit-email" className="block text-micro text-ink-4 mb-2">
                      Your email
                    </label>
                    <input
                      id="submit-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={FIELD}
                    />
                  </div>

                  <div>
                    <label htmlFor="submit-note" className="block text-micro text-ink-4 mb-2">
                      A note
                    </label>
                    <input
                      id="submit-note"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={280}
                      placeholder="Anything the reviewer should know"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className={FIELD}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <YourRequests requests={requests} />
    </div>
  )
}

function PreviewCard({ preview }: { preview: PreviewState }) {
  if (preview.kind === 'idle' || preview.kind === 'checking') return null

  // Rendered by the parent with more room than a card row affords.
  if (preview.kind === 'unreachable' || preview.kind === 'rate-limited') return null

  // The most common outcome, and the one worth getting right: the site is
  // already here. Answer with the site rather than with a refusal.
  if (preview.kind === 'existing') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.color, ease: EASE }}
        className="mt-3 flex items-center gap-3 p-2.5 rounded-[10px] border border-edge bg-muted/30"
      >
        {preview.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image} alt="" className="w-14 h-10 rounded-[5px] object-cover object-top border border-edge-faint shrink-0" />
        ) : (
          <span className="w-14 h-10 rounded-[5px] bg-muted border border-edge-faint shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-micro text-ink-4 mb-0.5">
            <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
            Already in the library
          </span>
          <span className="block text-bodytext text-ink truncate">{preview.title}</span>
        </span>
        <Link
          href={`/?site=${preview.id}`}
          className="shrink-0 inline-flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors"
        >
          View it <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
        </Link>
      </motion.div>
    )
  }

  if (preview.kind === 'already-requested') {
    const added = preview.status === 'added'
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.color, ease: EASE }}
        className="mt-3 p-2.5 rounded-[10px] border border-edge bg-muted/30"
      >
        <p className="text-micro text-ink-4 mb-1">
          {added ? 'Added since it was submitted' : 'Already submitted'}
        </p>
        <p className="text-bodytext text-ink">
          {preview.title ?? 'This site'}
        </p>
        <p className="text-meta text-ink-3 mt-1">
          {preview.requestCount === 1
            ? 'One person has asked for this.'
            : `${preview.requestCount} people have asked for this.`}
        </p>
        {added && preview.sourceId && (
          <Link
            href={`/?site=${preview.sourceId}`}
            className="mt-2 inline-flex items-center gap-1 text-meta text-ink hover:opacity-70 transition-opacity"
          >
            View it <ArrowUpRight className="w-3 h-3" weight="bold" />
          </Link>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.color, ease: EASE }}
      className="mt-3 flex items-center gap-3 p-2.5 rounded-[10px] border border-edge bg-muted/30"
    >
      {preview.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" className="w-14 h-10 rounded-[5px] object-cover object-top border border-edge-faint shrink-0 bg-muted" />
      ) : preview.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.favicon} alt="" className="w-14 h-10 rounded-[5px] object-contain p-2 border border-edge-faint shrink-0 bg-muted" />
      ) : (
        <span className="w-14 h-10 rounded-[5px] border border-edge-faint shrink-0 bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-bodytext text-ink truncate">{preview.title}</p>
        <p className="text-meta text-ink-4 mt-0.5">
          {preview.reachable ? 'New to the library — ready for review' : 'Could not load a preview — you can still submit'}
        </p>
      </div>
    </motion.div>
  )
}

function BatchResults({
  results, onAnother,
}: {
  results: Array<{ url: string; state: string; site?: { id: string; title: string }; message?: string; requestCount?: number }>
  onAnother: () => void
}) {
  const received = results.filter(r => r.state === 'received').length
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.move, ease: EASE }}
      className="mt-4 rounded-[10px] border border-edge bg-muted/30 p-2.5"
    >
      <p className="text-micro text-ink-4 mb-2">
        {received === results.length
          ? `All ${received} submitted — the queue has them.`
          : `${received} of ${results.length} submitted.`}
      </p>
      <ul className="space-y-1.5" role="list">
        {results.map(r => (
          <li key={r.url} className="flex items-center gap-2 min-w-0">
            <span className="flex-1 truncate text-meta text-ink-3">{r.url}</span>
            {r.state === 'received' && (
              <span className="shrink-0 text-micro text-[var(--color-success)]">Submitted</span>
            )}
            {r.state === 'existing' && r.site && (
              <Link
                href={`/?site=${r.site.id}`}
                className="shrink-0 text-micro text-ink-2 hover:text-ink underline underline-offset-2 transition-colors"
              >
                In library
              </Link>
            )}
            {r.state === 'invalid' && (
              <span className="shrink-0 text-micro text-[var(--color-error)]" title={r.message}>Skipped</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={onAnother}
          className={BTN.secondary}
        >
          Submit more
        </button>
        <Link
          href="/"
          className={BTN.primary}
        >
          Done
        </Link>
      </div>
    </motion.div>
  )
}

function SubmittedView({
  title, count, onAnother,
}: { title: string | null; count: number; onAnother: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.move, ease: EASE }}
    >
      <h2 className="text-heading text-foreground">
        Submitted{title ? ` — ${title}` : ''}
      </h2>
      <p className="mt-1 text-bodytext text-ink-3 max-w-[420px] leading-relaxed">
        {count > 1
          ? `You're the ${ordinal(count)} person to ask for it. It'll land on the shelf if it makes the cut.`
          : "It goes into the queue. If it makes the cut, it lands on the shelf."}
      </p>
      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={onAnother}
          className={BTN.secondary}
        >
          Submit another
        </button>
        <Link
          href="/"
          className={BTN.primary}
        >
          Back to the shelf
        </Link>
      </div>
    </motion.div>
  )
}

function YourRequests({ requests }: { requests: ReturnType<typeof useSiteRequests>['requests'] }) {
  const shown = requests.slice(0, 4)
  if (shown.length === 0) return null

  return (
    <div className="mt-8 pt-6 border-t border-edge">
      <p className="text-micro text-ink-4 mb-2">You submitted</p>
      <ul className="space-y-1" role="list">
        {shown.map(entry => {
          const added = entry.status === 'added' && entry.sourceId
          return (
            <li key={entry.normalized} className="flex items-center gap-2">
              <span className="flex-1 truncate text-meta text-ink-3">
                {entry.title ?? entry.normalized}
              </span>
              {added ? (
                <Link
                  href={`/?site=${entry.sourceId}`}
                  className="shrink-0 inline-flex items-center gap-1 text-micro text-[var(--color-success)] hover:opacity-70 transition-opacity"
                >
                  <Check className="w-3 h-3" weight="bold" /> Added
                </Link>
              ) : (
                <span className="shrink-0 text-micro text-ink-4">
                  {entry.status === 'dismissed' ? 'Passed' : 'Pending'}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-meta text-ink-4 leading-relaxed">
        Your browser remembers what you submitted and checks back, so you&apos;ll
        see here when it&apos;s live.
      </p>
    </div>
  )
}

function ordinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] ?? ['th', 'st', 'nd', 'rd'][n % 100] ?? 'th'
  return `${n}${suffix}`
}
