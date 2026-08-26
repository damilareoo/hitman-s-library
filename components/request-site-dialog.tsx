'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, ArrowUpRight, Check, Globe, X, Warning } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { EASE, DUR } from '@/lib/motion'
import { normalizeUrl } from '@/lib/normalize-url'
import { useSiteRequests, type RememberedRequest } from '@/lib/use-site-requests'

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'new'; title: string; image: string | null; favicon: string; reachable: boolean }
  | { kind: 'existing'; id: string; title: string; image: string | null }
  | { kind: 'already-requested'; requestCount: number; status: string; sourceId: string | null; title: string | null; image: string | null }
  | { kind: 'unreachable'; message: string }
  | { kind: 'rate-limited'; retryAfterSeconds: number }

interface Props {
  open: boolean
  onClose: () => void
  /** Seeds the field from whatever the person was searching for. */
  initialUrl?: string
  onOpenSite: (id: string) => void
}

export function RequestSiteDialog({ open, onClose, initialUrl = '', onOpenSite }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [preview, setPreview] = useState<PreviewState>({ kind: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ title: string | null; count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const checkSeq = useRef(0)

  const { requests, remember } = useSiteRequests()

  useEffect(() => { if (open) setUrl(initialUrl) }, [open, initialUrl])

  // Focus moves in on open and returns where it came from on close. Without the
  // second half, dismissing the dialog drops focus onto <body> and the next Tab
  // restarts from the top of the page.
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => {
      clearTimeout(t)
      previousFocus.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setPreview({ kind: 'idle' })
      setSubmitted(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  // Resolve what they typed, debounced. Every keystroke would be a fetch per
  // character and a preview that flickers between three different sites.
  useEffect(() => {
    if (!open) return
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
        if (seq === checkSeq.current) setPreview({ kind: 'idle' })
      }
    }, 450)

    return () => clearTimeout(t)
  }, [url, open])

  const submit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

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
          preview: { title: previewTitle, image: previewImage },
        }),
      })
      const data = await res.json()

      if (data.state === 'existing') {
        setPreview({ kind: 'existing', id: data.site.id, title: data.site.title, image: null })
      } else if (data.state === 'received') {
        remember(url.trim(), previewTitle)
        setSubmitted({ title: previewTitle, count: data.requestCount ?? 1 })
      } else {
        setError(data.message ?? 'That did not go through. Try again.')
      }
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setSubmitting(false)
    }
  }, [url, preview, submitting, remember])

  const canSubmit =
    !submitting && (preview.kind === 'new' || preview.kind === 'already-requested')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh] sm:pt-[16vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.color, ease: EASE }}
        >
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Request a site"
            className="relative w-full max-w-[440px] border border-edge-strong rounded-[8px] bg-card shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: DUR.move, ease: EASE }}
          >
            <div className="flex items-center justify-between px-4 h-11 border-b border-edge">
              <p className="text-micro text-ink-4">Request a site</p>
              <button
                onClick={onClose}
                className="w-7 h-7 -mr-1.5 flex items-center justify-center rounded-[4px] text-ink-4 hover:text-ink hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" weight="bold" />
              </button>
            </div>

            {submitted ? (
              <Submitted
                title={submitted.title}
                count={submitted.count}
                onAnother={() => { setSubmitted(null); setUrl(''); setPreview({ kind: 'idle' }) }}
                onClose={onClose}
              />
            ) : (
              <div className="p-4">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4 pointer-events-none" weight="regular" />
                  <input
                    ref={inputRef}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="stripe.com"
                    aria-label="Website address"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && canSubmit) submit() }}
                    className="w-full h-10 pl-9 pr-9 text-bodytext bg-muted/60 border border-edge rounded-[6px] text-foreground placeholder:text-ink-4 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
                  />
                  {preview.kind === 'checking' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
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

                <PreviewCard preview={preview} onOpenSite={id => { onOpenSite(id); onClose() }} />

                {error && (
                  <p className="mt-3 text-meta text-[var(--color-error)] flex items-center gap-1.5">
                    <Warning className="w-3.5 h-3.5 shrink-0" weight="fill" />
                    {error}
                  </p>
                )}

                {canSubmit && (
                  <motion.button
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DUR.color, ease: EASE }}
                    onClick={submit}
                    disabled={submitting}
                    className="mt-3 w-full h-10 flex items-center justify-center gap-2 rounded-[6px] bg-foreground text-background text-bodytext font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {submitting ? <Spinner className="w-3.5 h-3.5 border-t-background" /> : null}
                    {preview.kind === 'already-requested' ? 'Add my request' : 'Request it'}
                    {!submitting && <ArrowRight className="w-3.5 h-3.5" weight="bold" />}
                  </motion.button>
                )}

                <YourRequests requests={requests} onOpenSite={id => { onOpenSite(id); onClose() }} />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PreviewCard({ preview, onOpenSite }: { preview: PreviewState; onOpenSite: (id: string) => void }) {
  if (preview.kind === 'idle' || preview.kind === 'checking') {
    return (
      <p className="mt-3 text-meta text-ink-4">
        Paste any website address. We&apos;ll check it isn&apos;t already here.
      </p>
    )
  }

  if (preview.kind === 'unreachable') {
    return (
      <p className="mt-3 text-meta text-ink-3 flex items-center gap-1.5">
        <Warning className="w-3.5 h-3.5 shrink-0 text-[var(--color-error)]" weight="fill" />
        {preview.message}
      </p>
    )
  }

  if (preview.kind === 'rate-limited') {
    return (
      <p className="mt-3 text-meta text-ink-3">
        Give it {Math.ceil(preview.retryAfterSeconds / 60)} minute
        {Math.ceil(preview.retryAfterSeconds / 60) === 1 ? '' : 's'} and try again.
      </p>
    )
  }

  // The most common outcome, and the one worth getting right: the site is
  // already here. Answer with the site rather than with a refusal.
  if (preview.kind === 'existing') {
    return (
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.color, ease: EASE }}
        onClick={() => onOpenSite(preview.id)}
        className="mt-3 w-full group flex items-center gap-3 p-2.5 rounded-[6px] border border-edge bg-muted/40 hover:bg-muted hover:border-edge-strong transition-colors text-left"
      >
        {preview.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image} alt="" className="w-14 h-10 rounded-[4px] object-cover object-top border border-edge-faint shrink-0" />
        ) : (
          <span className="w-14 h-10 rounded-[4px] bg-muted border border-edge-faint shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-micro text-ink-4 mb-0.5">
            <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
            Already in the library
          </span>
          <span className="block text-bodytext text-ink truncate">{preview.title}</span>
        </span>
        <ArrowUpRight className="w-4 h-4 text-ink-4 group-hover:text-ink transition-colors shrink-0" weight="bold" />
      </motion.button>
    )
  }

  if (preview.kind === 'already-requested') {
    const added = preview.status === 'added'
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.color, ease: EASE }}
        className="mt-3 p-2.5 rounded-[6px] border border-edge bg-muted/40"
      >
        <p className="text-micro text-ink-4 mb-1">
          {added ? 'Added since it was requested' : 'Already requested'}
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
          <button
            onClick={() => onOpenSite(preview.sourceId!)}
            className="mt-2 text-meta text-ink hover:opacity-70 transition-opacity inline-flex items-center gap-1"
          >
            View it <ArrowUpRight className="w-3 h-3" weight="bold" />
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.color, ease: EASE }}
      className="mt-3 flex items-center gap-3 p-2.5 rounded-[6px] border border-edge bg-muted/40"
    >
      {preview.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" className="w-14 h-10 rounded-[4px] object-cover object-top border border-edge-faint shrink-0 bg-muted" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.favicon} alt="" className="w-14 h-10 rounded-[4px] object-contain p-2 border border-edge-faint shrink-0 bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-bodytext text-ink truncate">{preview.title}</p>
        <p className="text-meta text-ink-4 mt-0.5">
          {preview.reachable ? 'Ready to request' : 'Could not load a preview — you can still ask'}
        </p>
      </div>
    </motion.div>
  )
}

function Submitted({
  title, count, onAnother, onClose,
}: { title: string | null; count: number; onAnother: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.move, ease: EASE }}
      className="p-6 text-center"
    >
      <span className="mx-auto mb-3 w-9 h-9 flex items-center justify-center rounded-full border border-edge-strong">
        <Check className="w-4 h-4 text-[var(--color-success)]" weight="bold" />
      </span>
      <p className="text-titletext text-ink mb-1">Asked for{title ? ` ${title}` : ''}</p>
      <p className="text-meta text-ink-3 max-w-[280px] mx-auto leading-relaxed">
        {count > 1
          ? `You're the ${ordinal(count)} person to ask. It'll show up here if it makes the cut.`
          : "It goes into the queue. If it makes the cut, it'll show up here."}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={onAnother}
          className="h-9 px-3 rounded-[6px] border border-edge-strong text-bodytext text-ink-2 hover:text-ink hover:border-foreground/40 transition-colors"
        >
          Request another
        </button>
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-[6px] bg-foreground text-background text-bodytext font-medium hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </motion.div>
  )
}

function YourRequests({ requests, onOpenSite }: { requests: RememberedRequest[]; onOpenSite: (id: string) => void }) {
  const shown = requests.slice(0, 4)
  if (shown.length === 0) return null

  return (
    <div className="mt-4 pt-3 border-t border-edge">
      <p className="text-micro text-ink-4 mb-2">You asked for</p>
      <ul className="space-y-1" role="list">
        {shown.map(entry => {
          const added = entry.status === 'added' && entry.sourceId
          return (
            <li key={entry.normalized} className="flex items-center gap-2">
              <span className="flex-1 truncate text-meta text-ink-3">
                {entry.title ?? entry.normalized}
              </span>
              {added ? (
                <button
                  onClick={() => onOpenSite(entry.sourceId!)}
                  className="shrink-0 inline-flex items-center gap-1 text-micro text-[var(--color-success)] hover:opacity-70 transition-opacity"
                >
                  <Check className="w-3 h-3" weight="bold" /> Added
                </button>
              ) : (
                <span className="shrink-0 text-micro text-ink-4">
                  {entry.status === 'dismissed' ? 'Passed' : 'Pending'}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ordinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] ?? ['th', 'st', 'nd', 'rd'][n % 100] ?? 'th'
  return `${n}${suffix}`
}

export { normalizeUrl }
