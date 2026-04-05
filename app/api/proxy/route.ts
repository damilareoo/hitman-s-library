import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Picker script injected into proxied pages.
// Sends postMessage events to the parent frame on hover/click.
const PICKER_SCRIPT = `
<script>
(function () {
  var _hovered = null;
  var _overlay = null;

  function label(el) {
    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
      : '';
    return tag + id + cls;
  }

  function getOverlay() {
    if (_overlay) return _overlay;
    _overlay = document.createElement('div');
    _overlay.id = '__figma_picker_overlay__';
    _overlay.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:2147483647',
      'border:2px solid #18A0FB',
      'border-radius:2px',
      'background:rgba(24,160,251,0.08)',
      'box-sizing:border-box',
      'transition:all 80ms ease',
    ].join(';');
    document.body.appendChild(_overlay);
    return _overlay;
  }

  function positionOverlay(el) {
    var r = el.getBoundingClientRect();
    var o = getOverlay();
    o.style.top = r.top + 'px';
    o.style.left = r.left + 'px';
    o.style.width = r.width + 'px';
    o.style.height = r.height + 'px';
    o.style.display = 'block';
  }

  function hideOverlay() {
    if (_overlay) _overlay.style.display = 'none';
  }

  document.addEventListener('mouseover', function (e) {
    var el = e.target;
    if (!el || el === _overlay) return;
    _hovered = el;
    positionOverlay(el);
    window.parent.postMessage({ type: 'figma-hover', label: label(el) }, '*');
  }, true);

  document.addEventListener('mouseout', function (e) {
    if (e.target === _overlay) return;
    hideOverlay();
    window.parent.postMessage({ type: 'figma-hover', label: null }, '*');
  }, true);

  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || el === _overlay) return;
    e.preventDefault();
    e.stopPropagation();
    hideOverlay();
    var html = el.outerHTML;
    window.parent.postMessage({
      type: 'figma-element-selected',
      html: html,
      label: label(el),
    }, '*');
  }, true);
})();
</script>
`

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(url)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  // Only allow http/https
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

  // Inject <base href> so relative URLs resolve correctly, and our picker script
  const baseTag = `<base href="${origin}/">`
  const injected = html
    .replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
    .replace(/<\/body>/i, `${PICKER_SCRIPT}</body>`)

  return new NextResponse(injected, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Explicitly omit X-Frame-Options and CSP — this is the whole point of the proxy
      'Cache-Control': 'no-store',
    },
  })
}
