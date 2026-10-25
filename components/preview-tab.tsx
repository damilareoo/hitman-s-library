// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning, ArrowClockwise, ArrowUpRight } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { getDomain } from '@/lib/get-domain'
import { previewOrigin } from '@/lib/preview-origin'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }
type PreviewMode = 'live' | 'screenshot' | 'mobile'

/**
 * Captures are full-page and enormous — a mean of 717kb, 120 of them over 1MB,
 * and the largest 8.7MB — because a full-page shot of a long site at 2× is a
 * genuinely huge picture. The panel used to hand the browser the original and
 * let it download all of it to show a column a few hundred pixels wide.
 *
 * Cards already went through the image optimizer; this is the same route. The
 * 8.7MB capture comes back at 1.2MB for a 1200px column, and smaller again in
 * AVIF where the browser accepts it.
 *
 * Only blob-hosted captures are optimizable — the optimizer is deliberately
 * restricted to that one host, so anything else is served as-is.
 */
const OPTIMIZABLE = '.public.blob.vercel-storage.com'
/**
 * q must be 75. Next 16 validates quality against `images.qualities`, which
 * defaults to [75], and anything else is a 400 INVALID_IMAGE_OPTIMIZE_REQUEST
 * — served as text/plain, so the panel would show a broken image rather than
 * an unoptimized one.
 */
function optimized(url: string, width: number): string {
  if (!url.includes(OPTIMIZABLE)) return url
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`
}
/**
 * 640 and 1080 only. A full-page capture is tall enough that asking for 1200
 * or more puts the output over the optimizer's ceiling, and it answers with
 * the untouched original — 8.7MB for the largest capture, which is the whole
 * problem this is here to solve. At 1080 that same capture arrives as 639kb
 * of AVIF.
 */
const WIDTHS = [640, 1080]
/** The underlay only has to suggest the page through a 14px blur. */
const BLUR_WIDTH = 640

interface PreviewTabProps {
  siteUrl: string
  screenshotUrl?: string | null
  mobileScreenshotUrl?: string | null
  extractionError?: string | null
  /**
   * False for the sites whose live preview can never work — six refuse a
   * server-side fetch outright (403, a bot gate, markdown served to
   * non-browsers) and eighteen ship an empty shell that only fills in once
   * their own JavaScript runs, which the proxy does not execute.
   *
   * Without this the panel spent eight seconds discovering that again on every
   * visit, then fell back to the screenshot it could have shown immediately.
   */
  livePreview?: boolean
  displayMode?: Extract<PreviewMode, 'live' | 'mobile'>
  /** Drop the drawn phone frame — on an actual phone it is a picture of the
   *  device you are holding, and it costs the preview most of its width. */
  fill?: boolean
}

/**
 * How long to wait for a frame that never loads at all.
 *
 * This was eight seconds, chosen when it was the main way a bad preview was
 * caught. It is not any more: the injected script reports a page that failed
 * over postMessage within milliseconds, so this is only the backstop for a
 * frame that produces no load event whatsoever. Against that job eight seconds
 * was far too short — a heavy site on a slow connection was being called dead
 * while it was still arriving, and a capture replaced a page that would have
 * rendered a second later. Waiting longer costs a genuinely broken site
 * nothing, because it has already reported itself.
 */
const GIVE_UP_MS = 20000

export function PreviewTab({
  siteUrl,
  screenshotUrl,
  mobileScreenshotUrl,
  extractionError,
  livePreview = true,
  displayMode = 'live',
  fill = false,
}: PreviewTabProps) {
  const hasDesktop = Boolean(screenshotUrl)
  /** Where this site starts: its capture if live can never work, else live. */
  const openingMode: PreviewMode = livePreview
    ? displayMode
    : displayMode === 'mobile'
      ? (mobileScreenshotUrl ? 'mobile' : hasDesktop ? 'screenshot' : 'mobile')
      : (hasDesktop ? 'screenshot' : 'mobile')

  const [loaded, setLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const [mode, setMode] = useState<PreviewMode>(openingMode)
  const [nonce, setNonce] = useState(0)
  const [captureSharp, setCaptureSharp] = useState(false)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const domain = getDomain(siteUrl)
  /**
   * Resolved once per mount, not at module load: it reads window.location, and
   * the server render has no location to read.
   */
  const [origin] = useState(previewOrigin)
  const proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(siteUrl)}`
  /**
   * Granted only when the proxy answers from a host that is not ours. On its
   * own origin the flag would hand third-party script the app's storage, its
   * parent window and its admin session, so there it stays off and previews
   * degrade instead.
   */
  const sandbox = [
    'allow-scripts', 'allow-forms', 'allow-popups',
    ...(origin ? ['allow-same-origin'] : []),
    'allow-top-navigation-by-user-activation',
  ].join(' ')
  const hasDesktopScreenshot = hasDesktop
  const hasMobileScreenshot = Boolean(mobileScreenshotUrl)
  const hasScreenshot = hasDesktopScreenshot || hasMobileScreenshot
  /**
   * A capture stands in for the live page; it never pre-empts one. The mobile
   * arm used to read `mode === 'mobile' ? mobileScreenshotUrl` unconditionally,
   * and this branch is tested before the live one — so the moment every site
   * had a mobile capture backfilled, the phone breakpoint stopped previewing
   * anything live at all. The condition now names the two cases a still is
   * actually for: the proxy tried and failed, or it was never going to work.
   */
  const stillOnly = proxyFailed || !livePreview
  const activeScreenshotUrl =
    mode === 'screenshot' ? screenshotUrl :
    mode === 'mobile' && stillOnly ? mobileScreenshotUrl :
    null

  useEffect(() => {
    setLoaded(false)
    setProxyFailed(false)
    setCaptureSharp(false)
    setNonce(0)
    setMode(openingMode)
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    // No timer where there is no live attempt to time out.
    if (openingMode !== 'screenshot') {
      loadTimerRef.current = setTimeout(() => setProxyFailed(true), GIVE_UP_MS)
    }
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    }
  }, [openingMode, siteUrl])

  useEffect(() => {
    if (!proxyFailed || !hasScreenshot || mode !== 'live') return
    setMode(hasDesktopScreenshot ? 'screenshot' : 'mobile')
  }, [hasDesktopScreenshot, hasScreenshot, mode, proxyFailed])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // The preview host is the only thing entitled to declare this preview
      // dead. Without the check any page with a handle on this window could.
      if (origin && e.origin !== origin) return
      // And only about itself. The panel mounts its desktop and its phone
      // layout at once and hides one with CSS, so two of these components are
      // always listening — an unscoped handler let a failure in the hidden
      // copy tear down a preview that was rendering perfectly in the visible
      // one. Measured: the frame painted the site at 2.5s and was gone by 5s.
      if (e.source !== iframeRef.current?.contentWindow) return
      if (e.data?.type === 'proxy-failed') {
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
        setProxyFailed(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [origin])

  // Reading the frame's text from out here used to be how a rendered error was
  // caught. The preview now answers from its own origin, so contentDocument is
  // closed to us — and the injected script was already watching for the same
  // string from the inside, where it can actually see it. It reports over
  // postMessage, which the listener above handles.
  function handleLoad() {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    setLoaded(true)
  }

  /**
   * Retry the live attempt. A failed frame has already moved the panel to its
   * capture, so this is the only way back — without it a proxy blip left the
   * capture in place for the rest of the visit.
   */
  function reload() {
    setLoaded(false)
    setProxyFailed(false)
    setCaptureSharp(false)
    setMode(openingMode)
    setNonce(n => n + 1)
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    if (openingMode !== 'screenshot') {
      loadTimerRef.current = setTimeout(() => setProxyFailed(true), GIVE_UP_MS)
    }
  }

  if (extractionError && !siteUrl) {
    const info = classifyExtractionError(extractionError)
    const Icon = ICONS[info.icon]
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <div className="w-full rounded-[4px] border border-edge p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-ink-3">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-micro">{info.label}</span>
          </div>
          <p className="text-bodytext text-ink-2 leading-relaxed">{info.explanation}</p>
        </div>
      </div>
    )
  }

  const showingCapture = Boolean(activeScreenshotUrl)
  const state: 'loading' | 'live' | 'capture' =
    showingCapture || proxyFailed || !livePreview ? 'capture' : loaded ? 'live' : 'loading'
  const stateLabel = state === 'loading' ? 'Loading' : state === 'live' ? 'Live' : showingCapture ? 'Capture' : 'Unavailable'
  // Offered even after a failure has swapped in the capture: that state is
  // exactly when a retry is wanted. Sites that can never go live have no
  // button, because it would only fail the same way again.
  const canReload = livePreview

  /** The site never draws its own chrome over itself: status lives in the bar,
   *  and the page sits on a framed screen so busy artwork reads as content. */
  const bar = (
    <div className="h-[46px] flex-shrink-0 flex items-center gap-2 px-3 border-b border-edge-faint bg-card">
      <span
        title={siteUrl}
        className="flex-1 min-w-0 truncate px-2.5 py-1.5 rounded-[6px] bg-foreground/[0.045] text-[12px] text-ink-3"
      >
        {domain}
      </span>
      <span className="inline-flex items-center gap-1.5 flex-shrink-0 text-[12px] text-ink-4">
        {state === 'loading' ? (
          <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-edge-strong border-t-ink-3 animate-spin motion-reduce:animate-none" />
        ) : (
          <span
            className={[
              'w-1.5 h-1.5 rounded-full',
              state === 'live' ? 'bg-[var(--color-success)]' : 'bg-ink-4',
            ].join(' ')}
            style={state === 'live'
              ? { boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-success) 12%, transparent)' }
              : undefined}
          />
        )}
        {stateLabel}
      </span>
      {canReload && (
        <button
          onClick={reload}
          aria-label="Reload preview"
          title="Reload preview"
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-[6px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
        >
          <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
        </button>
      )}
      {/* The one way out of the panel to the real site: the preview itself is
          proxied and sandboxed, so its own links go nowhere. */}
      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${domain} in a new tab`}
        title={`Open ${domain}`}
        className="w-7 h-7 -mr-1 flex-shrink-0 flex items-center justify-center rounded-[6px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
      >
        <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
      </a>
    </div>
  )

  const stage = (content: ReactNode) => (
    <div className="relative flex-1 min-h-0 bg-background">
      <div className="absolute inset-3 max-sm:inset-2 rounded-[10px] max-sm:rounded-[8px] border border-edge overflow-hidden bg-muted">
        {content}
      </div>
    </div>
  )

  /** Blur-up: the capture arrives instantly and sharpens while the page loads
   *  underneath it, so the screen is never an empty grey rectangle. */
  const underlay = (url: string | null | undefined) => url ? (
    <div
      className={[
        'absolute inset-0 transition-[filter,transform] duration-[450ms] ease-[var(--ease-sig)] motion-reduce:transition-none',
        captureSharp ? '' : 'blur-[14px] scale-[1.03]',
      ].join(' ')}
      aria-hidden="true"
    >
      <img
        src={optimized(url, BLUR_WIDTH)}
        alt=""
        decoding="async"
        onLoad={() => setCaptureSharp(true)}
        className="w-full h-full object-cover object-top"
      />
    </div>
  ) : null

  if (activeScreenshotUrl) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {bar}
        {stage(
          <div className={`absolute inset-0 overflow-auto ${mode === 'mobile' && !fill ? 'flex justify-center' : ''}`}>
            <img
              src={optimized(activeScreenshotUrl, 1080)}
              srcSet={WIDTHS.map(w => `${optimized(activeScreenshotUrl, w)} ${w}w`).join(', ')}
              sizes={mode === 'mobile' ? '390px' : '(max-width: 1279px) 100vw, 40vw'}
              decoding="async"
              alt={`${mode === 'mobile' ? 'Mobile' : 'Desktop'} screenshot of ${domain}`}
              className={`block w-full h-auto ${mode === 'mobile' ? 'max-w-[390px]' : ''}`}
            />
          </div>,
        )}
      </div>
    )
  }

  if (mode === 'mobile' && !proxyFailed && livePreview) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {bar}
        {stage(
          <div className="absolute inset-0 flex justify-center">
            <div className={`relative h-full w-full overflow-hidden bg-background ${fill ? '' : 'max-w-[390px] border-x border-edge'}`}>
              {underlay(mobileScreenshotUrl)}
              <iframe
                ref={iframeRef}
                key={`${proxyUrl}-mobile-${nonce}`}
                src={proxyUrl}
                title={`Mobile live preview of ${siteUrl}`}
                onLoad={handleLoad}
                onError={() => setProxyFailed(true)}
                sandbox={sandbox}
                className="absolute inset-0 h-full w-full border-none"
                style={{ opacity: loaded ? 1 : 0, transition: 'opacity var(--dur-4) var(--ease-sig)' }}
              />
            </div>
          </div>,
        )}
      </div>
    )
  }

  if (proxyFailed || !livePreview) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {bar}
        {stage(
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-6">
            <p className="text-meta text-ink-2">{domain}</p>
            <p className="text-micro text-ink-4">Live preview unavailable</p>
          </div>,
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {bar}
      {stage(
        <div className="absolute inset-0">
          {underlay(screenshotUrl)}
          <iframe
            ref={iframeRef}
            key={`${proxyUrl}-live-${nonce}`}
            src={proxyUrl}
            title={`Live preview of ${siteUrl}`}
            onLoad={handleLoad}
            onError={() => setProxyFailed(true)}
            sandbox={sandbox}
            className="absolute inset-0 w-full h-full border-none"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity var(--dur-4) var(--ease-sig)' }}
          />
        </div>,
      )}
    </div>
  )
}
