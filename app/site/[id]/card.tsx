// The share card: the breakdown itself, not a decoration around it. Someone
// who has never seen the library should be able to tell what the site is,
// what kind of site it is, what it is built with, and what its typeface
// actually looks like. Satori subset — flex only, all styles inline, every
// multi-child div explicitly flex.
import { cleanTitle, hostnameOf, type CardFacts, type CardSite } from './data'

const INK = '#111111'
const MUTED = '#737370'
const BORDER = '#e2e2de'
const GROUND = '#f7f7f5'

const ROLE_ORDER = ['heading', 'body', 'mono']

/**
 * The shelf mark, inlined as a data URI. Satori's own SVG element support
 * does not carry the rotated book, so the glyph is handed over as a picture
 * built from the same source the site's favicon uses.
 */
const MARK_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="${INK}">` +
      '<rect x="6" y="54" width="52" height="4" rx="2"/>' +
      '<rect x="9" y="12" width="11" height="42" rx="1.6"/>' +
      '<rect x="26" y="6" width="11" height="48" rx="1.6"/>' +
      '<g transform="rotate(15 54 54)"><rect x="43" y="10" width="11" height="44" rx="1.6"/></g>' +
      '</svg>',
  )

/**
 * Two lines is the whole budget. The column is 544px, so the characters that
 * fit depend on the size the title is allowed to be — long names shrink
 * before they truncate, and nothing is ever cut mid-glyph.
 */
function fitTitle(text: string): { value: string; size: number; maxHeight: number } {
  const tiers = [
    { max: 26, size: 44, chars: 26 },
    { max: 40, size: 38, chars: 40 },
    { max: 64, size: 32, chars: 58 },
  ]
  // 1.4 rather than the line-height itself: Satori's own leading is a touch
  // over the nominal value, and a budget that exactly matches the text clips
  // the descenders of the second line.
  for (const tier of tiers) {
    if (text.length <= tier.max)
      return { value: text, size: tier.size, maxHeight: Math.round(tier.size * 1.4 * 2) }
  }
  const cut = text.slice(0, 58)
  const at = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','))
  return {
    value: `${cut.slice(0, at > 28 ? at : 58).replace(/[,.\s]+$/, '')}…`,
    size: 32,
    maxHeight: Math.round(32 * 1.4 * 2),
  }
}

export function ShareCard({
  site,
  facts,
  specimen,
}: {
  site: CardSite
  facts: CardFacts | null
  /** True when the site's own heading face was loaded and is registered. */
  specimen: boolean
}) {
  const host = hostnameOf(site.url)
  const title = fitTitle(cleanTitle(site.title ?? host))
  const colors = site.colors.slice(0, 6)
  const heading = site.typography.find(t => t.role === 'heading')?.font_family ?? null
  // The specimen already names and shows the heading face; listing it again
  // below is the same fact twice.
  const roles = ROLE_ORDER.filter(r => !(r === 'heading' && specimen && heading))
    .map(role => ({
      role,
      family: site.typography.find(t => t.role === role)?.font_family ?? null,
    }))
    .filter(t => t.family)
  const filing = [facts?.kind, facts?.designStyle].filter(Boolean).join(' · ')
  const stack = facts?.architecture ?? null

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        background: GROUND,
        padding: 48,
        fontFamily: 'BDO Grotesk',
      }}
    >
      {/* Capture — or, when the site has none, its palette as the picture. */}
      <div
        style={{
          width: 520,
          height: 534,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${BORDER}`,
          background: '#ffffff',
        }}
      >
        {site.screenshot_url ? (
          <img
            src={site.screenshot_url}
            width={520}
            height={534}
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : colors.length > 0 ? (
          colors.map(c => (
            <div
              key={c.hex_value}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: c.hex_value,
                color: '#ffffff',
                fontSize: 20,
              }}
            >
              {c.hex_value}
            </div>
          ))
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: MUTED,
              fontSize: 26,
            }}
          >
            {host}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 40, width: 544 }}>
        {filing && (
          <div style={{ display: 'flex', color: MUTED, fontSize: 17, letterSpacing: 2.4, textTransform: 'uppercase' }}>
            {filing}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            marginTop: filing ? 10 : 0,
            color: INK,
            fontSize: title.size,
            fontWeight: 600,
            lineHeight: 1.15,
            maxHeight: title.maxHeight,
            overflow: 'hidden',
          }}
        >
          {title.value}
        </div>
        <div style={{ display: 'flex', marginTop: 8, fontSize: 18, color: MUTED }}>{host}</div>

        {/* The typeface itself, when we can honestly show it. */}
        {specimen && heading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 20 }}>
            <div style={{ display: 'flex', fontFamily: 'Specimen', fontSize: 82, lineHeight: 1, color: INK }}>
              Aa
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 14, paddingBottom: 6 }}>
              <div style={{ display: 'flex', fontSize: 19, color: INK }}>{heading}</div>
              <div style={{ display: 'flex', marginTop: 2, fontSize: 14, color: MUTED }}>heading face, as served</div>
            </div>
          </div>
        )}

        {roles.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              marginTop: specimen ? 16 : 20,
              columnGap: 22,
              rowGap: 6,
            }}
          >
            {roles.map(t => (
              <div key={t.role} style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ display: 'flex', fontSize: 14, color: MUTED, textTransform: 'capitalize', marginRight: 7 }}>
                  {t.role}
                </div>
                <div style={{ display: 'flex', fontSize: 18, color: INK }}>{t.family}</div>
              </div>
            ))}
          </div>
        )}

        {colors.length > 0 && (
          <div style={{ display: 'flex', marginTop: specimen ? 20 : 26 }}>
            {colors.map(c => (
              <div key={c.hex_value} style={{ display: 'flex', flexDirection: 'column', marginRight: 12 }}>
                <div
                  style={{
                    width: specimen ? 46 : 62,
                    height: specimen ? 46 : 62,
                    display: 'flex',
                    borderRadius: 10,
                    background: c.hex_value,
                    border: `1px solid ${BORDER}`,
                  }}
                />
                <div style={{ display: 'flex', marginTop: 5, fontSize: 12, color: MUTED }}>
                  {c.hex_value.replace('#', '')}
                </div>
              </div>
            ))}
          </div>
        )}

        {!specimen && facts?.tags.length ? (
          <div style={{ display: 'flex', marginTop: 16, fontSize: 15, color: MUTED }}>
            {facts.tags.slice(0, 4).join('  ·  ')}
          </div>
        ) : null}

        {stack && (
          <div style={{ display: 'flex', marginTop: 18, fontSize: 16, color: MUTED }}>{stack}</div>
        )}

        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK_URI} width={26} height={26} style={{ display: 'flex', marginRight: 10 }} />
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>
              Hitman’s Library
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 15, color: MUTED, whiteSpace: 'nowrap' }}>
            design system breakdown · hitmanslibrary.xyz
          </div>
        </div>
      </div>
    </div>
  )
}
