import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Injected into every proxied page — adds hover highlights and click-to-copy.
// Extracts computed styles inline so the copied HTML works with html.to.design.
const PICKER_SCRIPT = `<script>
(function () {
  'use strict';

  var _overlay = null;
  var _capturing = false;

  var STYLE_PROPS = [
    'display','visibility','position','top','right','bottom','left','float',
    'z-index','box-sizing','overflow','overflow-x','overflow-y',
    'width','height','min-width','min-height','max-width','max-height',
    'padding-top','padding-right','padding-bottom','padding-left',
    'margin-top','margin-right','margin-bottom','margin-left',
    'border-top','border-right','border-bottom','border-left',
    'border-top-left-radius','border-top-right-radius',
    'border-bottom-right-radius','border-bottom-left-radius',
    'outline','box-shadow',
    'background-color','background-image','background-size',
    'background-position','background-repeat','background-clip','background-origin',
    'color','font-family','font-size','font-weight','font-style','font-variant',
    'line-height','text-align','text-decoration','text-transform',
    'letter-spacing','word-spacing','white-space','overflow-wrap','word-break',
    'flex','flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis',
    'align-items','align-self','justify-content','justify-self','gap',
    'row-gap','column-gap','order',
    'grid-template-columns','grid-template-rows','grid-column','grid-row',
    'opacity','transform','transform-origin','transition','filter',
    'cursor','pointer-events','user-select',
    'object-fit','object-position','aspect-ratio','vertical-align',
  ];

  function makeAbsolute(val, base) {
    if (!val || val === 'none' || val.startsWith('data:') || val.startsWith('http')) return val;
    try { return new URL(val, base).href; } catch (e) { return val; }
  }

  function inlineEl(orig, clone) {
    try {
      var cs = window.getComputedStyle(orig);
      var s = '';
      for (var i = 0; i < STYLE_PROPS.length; i++) {
        var v = cs.getPropertyValue(STYLE_PROPS[i]);
        if (v && v !== '' && v !== 'initial' && v !== 'auto' && v !== 'normal' && v !== 'none' && v !== '0px') {
          s += STYLE_PROPS[i] + ':' + v + ';';
        }
      }
      clone.setAttribute('style', s);
    } catch (e) {}
  }

  function fixUrls(clone, base) {
    var tagged = clone.querySelectorAll('[src],[srcset],[href],[data-src]');
    for (var i = 0; i < tagged.length; i++) {
      var el = tagged[i];
      ['src','data-src'].forEach(function(a) {
        var v = el.getAttribute(a);
        if (v) el.setAttribute(a, makeAbsolute(v, base));
      });
      var ss = el.getAttribute('srcset');
      if (ss) {
        el.setAttribute('srcset', ss.split(',').map(function(p) {
          var parts = p.trim().split(/\\s+/);
          parts[0] = makeAbsolute(parts[0], base);
          return parts.join(' ');
        }).join(', '));
      }
      var h = el.getAttribute('href');
      if (h && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('tel:')) {
        el.setAttribute('href', makeAbsolute(h, base));
      }
    }
    // Fix inline style url()
    var styled = clone.querySelectorAll('[style]');
    for (var j = 0; j < styled.length; j++) {
      var st = styled[j].getAttribute('style') || '';
      styled[j].setAttribute('style', st.replace(/url\\(['"]?([^'"\\)\\s]+)['"]?\\)/g, function(m, u) {
        return 'url(' + makeAbsolute(u, base) + ')';
      }));
    }
  }

  function captureEl(el) {
    var base = window.location.href;
    var clone = el.cloneNode(true);
    var origAll = Array.from(el.querySelectorAll('*'));
    var cloneAll = Array.from(clone.querySelectorAll('*'));
    inlineEl(el, clone);
    for (var i = 0; i < origAll.length; i++) {
      if (cloneAll[i]) inlineEl(origAll[i], cloneAll[i]);
    }
    fixUrls(clone, base);
    // Remove scripts from captured HTML
    var scripts = clone.querySelectorAll('script,noscript,iframe');
    for (var k = 0; k < scripts.length; k++) scripts[k].remove();
    return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<style>*{box-sizing:border-box}body{margin:0;padding:0}</style>' +
      '</head><body>' + clone.outerHTML + '</body></html>';
  }

  function getLabel(el) {
    if (!el) return '';
    var tag = el.tagName.toLowerCase();
    // Semantic landmark labels
    var roles = { header:'Header', footer:'Footer', nav:'Navigation',
                  main:'Main', aside:'Sidebar', section:'Section',
                  article:'Article', form:'Form' };
    if (roles[tag]) return roles[tag];
    // ARIA / data labels
    var aria = el.getAttribute('aria-label') || el.getAttribute('data-section');
    if (aria) return aria;
    // Headings — show text
    if (/^h[1-6]$/.test(tag)) {
      var t = (el.textContent || '').trim().slice(0, 40);
      return t || tag;
    }
    // Buttons / links — show text
    if (tag === 'button' || tag === 'a') {
      var bt = (el.textContent || '').trim().slice(0, 30);
      return bt || tag;
    }
    if (tag === 'img') return el.getAttribute('alt') || 'image';
    // Class hint
    var cls = '';
    if (el.className && typeof el.className === 'string') {
      cls = el.className.trim().split(/\\s+/).slice(0, 2).join(' ');
    }
    return cls ? tag + '.' + cls.slice(0, 20) : tag;
  }

  function ensureOverlay() {
    if (_overlay && document.body && document.body.contains(_overlay)) return _overlay;
    _overlay = document.createElement('div');
    _overlay.setAttribute('data-figma-picker', '1');
    Object.assign(_overlay.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
      border: '2px solid #18A0FB', borderRadius: '3px',
      background: 'rgba(24,160,251,0.07)', boxSizing: 'border-box',
      display: 'none',
    });
    if (document.body) document.body.appendChild(_overlay);
    return _overlay;
  }

  document.addEventListener('mouseover', function (e) {
    if (_capturing) return;
    var el = e.target;
    if (!el || !(el instanceof Element)) return;
    if (el.getAttribute('data-figma-picker') || el === document.body || el === document.documentElement) return;
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    var o = ensureOverlay();
    o.style.top = r.top + 'px'; o.style.left = r.left + 'px';
    o.style.width = r.width + 'px'; o.style.height = r.height + 'px';
    o.style.display = 'block';
    window.parent.postMessage({ type: 'figma-hover', label: getLabel(el) }, '*');
  }, true);

  document.addEventListener('mouseout', function (e) {
    if (_capturing) return;
    var el = e.target;
    if (el instanceof Element && el.getAttribute('data-figma-picker')) return;
    if (_overlay) _overlay.style.display = 'none';
    window.parent.postMessage({ type: 'figma-hover', label: null }, '*');
  }, true);

  document.addEventListener('click', function (e) {
    if (_capturing) return;
    var el = e.target;
    if (!el || !(el instanceof Element)) return;
    if (el.getAttribute('data-figma-picker') || el === document.body || el === document.documentElement) return;
    e.preventDefault(); e.stopPropagation();

    _capturing = true;
    if (_overlay) _overlay.style.display = 'none';
    var lbl = getLabel(el);
    window.parent.postMessage({ type: 'figma-element-capturing', label: lbl }, '*');

    try {
      var html = captureEl(el);
      window.parent.postMessage({ type: 'figma-element-captured', html: html, label: lbl }, '*');
    } catch (err) {
      window.parent.postMessage({ type: 'figma-element-error', label: lbl, error: String(err) }, '*');
    }
    _capturing = false;
  }, true);

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'figma-capture-full-page') return;
    if (_capturing) return;
    _capturing = true;
    if (_overlay) _overlay.style.display = 'none';
    window.parent.postMessage({ type: 'figma-element-capturing', label: 'Full page' }, '*');
    try {
      var html = captureEl(document.body);
      window.parent.postMessage({ type: 'figma-element-captured', html: html, label: 'Full page' }, '*');
    } catch (err) {
      window.parent.postMessage({ type: 'figma-element-error', label: 'Full page', error: String(err) }, '*');
    }
    _capturing = false;
  }, false);
})();
</script>`

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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    html = await res.text()
  } catch (err) {
    return new NextResponse(`Fetch failed: ${String(err)}`, { status: 502 })
  }

  const origin = `${targetUrl.protocol}//${targetUrl.host}`
  // <base href> resolves all relative URLs (CSS, images, links) against the real origin
  const baseTag = `<base href="${origin}/">`

  const injected = html
    .replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
    .replace(/<\/body>/i, `${PICKER_SCRIPT}</body>`)
    // If no </body>, append at end
    || html + PICKER_SCRIPT

  return new NextResponse(injected, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // Intentionally no X-Frame-Options or CSP — that's the point of this proxy
    },
  })
}
