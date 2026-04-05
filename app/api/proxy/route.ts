import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PICKER_SCRIPT = `
<script>
(function () {
  'use strict';

  var _overlay   = null;
  var _capturing = false;

  // ── Figma clipboard intercept ─────────────────────────────────────────────
  // Must be set before capture.js loads so it picks up our override.
  window.__figmaCapture = null;
  if (navigator.clipboard) {
    navigator.clipboard.write = async function (items) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].types.includes('text/html')) {
          var blob = await items[i].getType('text/html');
          window.__figmaCapture = await blob.text();
        }
      }
    };
  }

  // Load capture.js — it listens for hashchange after initialisation
  var s = document.createElement('script');
  s.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
  document.head.appendChild(s);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getLabel(el) {
    var tag = el.tagName.toLowerCase();
    var id  = el.id ? '#' + el.id : '';
    var cls = '';
    if (el.className && typeof el.className === 'string') {
      cls = '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
              .replace(/[^\\w.-]/g, '');
    }
    return tag + (id || cls);
  }

  function ensureOverlay() {
    if (_overlay && document.body.contains(_overlay)) return _overlay;
    _overlay = document.createElement('div');
    _overlay.setAttribute('data-figma-picker', '1');
    _overlay.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:2147483647',
      'border:2px solid #18A0FB',
      'border-radius:2px',
      'background:rgba(24,160,251,0.08)',
      'box-sizing:border-box',
      'display:none',
    ].join(';');
    document.body.appendChild(_overlay);
    return _overlay;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Hover ─────────────────────────────────────────────────────────────────
  document.addEventListener('mouseover', function (e) {
    if (_capturing) return;
    var el = e.target;
    if (!el || el.getAttribute('data-figma-picker')) return;
    var r = el.getBoundingClientRect();
    var o = ensureOverlay();
    o.style.top    = r.top    + 'px';
    o.style.left   = r.left   + 'px';
    o.style.width  = r.width  + 'px';
    o.style.height = r.height + 'px';
    o.style.display = 'block';
    window.parent.postMessage({ type: 'figma-hover', label: getLabel(el) }, '*');
  }, true);

  document.addEventListener('mouseout', function (e) {
    if (_capturing) return;
    if (e.target && e.target.getAttribute('data-figma-picker')) return;
    if (_overlay) _overlay.style.display = 'none';
    window.parent.postMessage({ type: 'figma-hover', label: null }, '*');
  }, true);

  // ── Click — element capture ───────────────────────────────────────────────
  document.addEventListener('click', async function (e) {
    if (_capturing) return;
    var el = e.target;
    if (!el || el.getAttribute('data-figma-picker')) return;
    e.preventDefault();
    e.stopPropagation();

    _capturing = true;
    if (_overlay) _overlay.style.display = 'none';

    var lbl      = getLabel(el);
    var outerHtml = el.outerHTML;
    window.parent.postMessage({ type: 'figma-element-capturing', label: lbl }, '*');

    var savedBody = document.body.innerHTML;
    var result    = null;

    try {
      // Isolate element in body so capture.js only sees it
      document.body.innerHTML = outerHtml;
      window.__figmaCapture   = null;

      // Re-trigger capture.js via hashchange
      // Toggle hash to guarantee a real change event fires
      window.location.hash = window.location.hash === '#_figma_' ? '#_figma2_' : '#_figma_';
      await sleep(60);
      window.location.hash = 'figmacapture&figmadelay=800';

      // Poll — single element typically finishes in 1–3 s
      var deadline = Date.now() + 12000;
      while (!window.__figmaCapture && Date.now() < deadline) {
        await sleep(150);
      }
      result = window.__figmaCapture;
    } catch (_) { /* capture failed */ }

    // Restore original page
    document.body.innerHTML = savedBody;
    _capturing = false;

    if (result) {
      window.parent.postMessage({ type: 'figma-element-captured', html: result, label: lbl }, '*');
    } else {
      window.parent.postMessage({ type: 'figma-element-error', label: lbl }, '*');
    }
  }, true);
})();
</script>
`

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url param', { status: 400 })

  let targetUrl: URL
  try {
    targetUrl = new URL(url)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return new NextResponse('Protocol not allowed', { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    html = await res.text()
  } catch (err) {
    return new NextResponse(`Fetch failed: ${String(err)}`, { status: 502 })
  }

  const origin = `${targetUrl.protocol}//${targetUrl.host}`
  const baseTag = `<base href="${origin}/">`

  // Inject <base href> for relative URL resolution and our picker+capture script
  const injected = html
    .replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
    .replace(/<\/body>/i, `${PICKER_SCRIPT}</body>`)

  return new NextResponse(injected, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // X-Frame-Options and CSP intentionally omitted — that's the point of this proxy
    },
  })
}
