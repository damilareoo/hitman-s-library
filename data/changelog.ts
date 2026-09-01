export type ChangeType = 'new' | 'improved' | 'fixed'

export type Author = 'damilare' | 'florence'

export interface Person {
  name: string
  /** Local copy of the GitHub avatar, so the page owns its own images. */
  avatar: string
}

export const AUTHORS: Record<Author, Person> = {
  damilare: { name: 'Damilare', avatar: '/people/damilare.png' },
  florence: { name: 'Florence', avatar: '/people/florence.jpg' },
}

export interface ChangeItem {
  type: ChangeType
  text: string
  author?: Author
}

export interface ChangelogRelease {
  date: string        // ISO date, e.g. "2026-04-02"
  title: string       // short release name, e.g. "Mobile Screenshots"
  description?: string
  items: ChangeItem[]
}

export interface ReleaseRef {
  /** Index into `changelog` — also the anchor id, as `rel-{index}`. */
  index: number
  date: string
  title: string
}

export interface MonthGroup {
  /** Anchor id for the month, e.g. "m-2026-08". */
  id: string
  /** Three letters, e.g. "AUG". */
  label: string
  year: string
  releases: ReleaseRef[]
}

const MONTH_LABEL = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

/**
 * The releases folded into the months they happened in, newest first.
 *
 * Months with nothing in them never appear — there was no release in June or
 * July, and a navigation that lists empty months is offering somewhere to go
 * that has nothing when you get there.
 */
export function groupByMonth(releases: ChangelogRelease[] = changelog): MonthGroup[] {
  const groups: MonthGroup[] = []
  releases.forEach((release, index) => {
    const [year, month] = release.date.split('-')
    const id = `m-${year}-${month}`
    let group = groups.find(g => g.id === id)
    if (!group) {
      group = { id, label: MONTH_LABEL[Number(month) - 1], year, releases: [] }
      groups.push(group)
    }
    group.releases.push({ index, date: release.date, title: release.title })
  })
  return groups
}

/** Everyone who has a line in this release, in the order they first appear. */
export function releaseAuthors(release: ChangelogRelease): Author[] {
  const seen: Author[] = []
  for (const item of release.items) {
    if (item.author && !seen.includes(item.author)) seen.push(item.author)
  }
  return seen
}

// To add a new release: prepend an entry to this array.
// Dates are displayed as "Apr 2, 2026".
// Types: "new" (green) | "improved" (blue) | "fixed" (muted)
// Set `author` on an item to say who made it. A release where everyone's
// lines belong to one person says so once, beside the date; a release with
// more than one hand in it names each line instead, because that is the
// only case where the question is actually being asked.
const changelog: ChangelogRelease[] = [
  {
    date: '2026-09-01',
    title: 'Link Previews',
    items: [
      { type: 'improved', author: 'damilare', text: 'New artwork when the site is shared, replacing a card from March' },
    ],
  },
  {
    date: '2026-08-31',
    title: 'Legibility',
    items: [
      { type: 'fixed',    author: 'damilare', text: 'The site read as not secure. One card stored its image over http, and a single insecure image drops the padlock for the whole page. Scraped URLs are upgraded to https on the way out now, so it cannot come back' },
      { type: 'improved', author: 'damilare', text: 'Muted text was too faint to read. The lightest level measured 1.7:1 on white; every level now clears 4.5:1 in both themes' },
      { type: 'improved', author: 'damilare', text: 'Type scale up one step across the board — the smallest labels were 10px' },
      { type: 'fixed',    author: 'damilare', text: 'The rule above the corner links stopped in mid-air on About and Changelog. It follows the sidebar on the gallery and spans the page where there is none' },
    ],
  },
  {
    date: '2026-08-31',
    title: 'A Mark',
    items: [
      { type: 'new',      author: 'damilare', text: 'A mark for the library — three books on a shelf, one leaning' },
      { type: 'new',      author: 'damilare', text: 'The mark is the loading screen. Books arrive onto the shelf, hold, clear, repeat' },
      { type: 'new',      author: 'damilare', text: 'Right-click the logo — or long-press it on a phone — to copy or download it as SVG' },
      { type: 'improved', author: 'damilare', text: 'Favicon, touch icon and app icon are generated from the same geometry the site draws' },
    ],
  },
  {
    date: '2026-08-31',
    title: 'Navigation',
    items: [
      { type: 'fixed',    author: 'damilare', text: 'Request a site, About and Changelog were all hidden below 640px — a phone reached the gallery and nothing else' },
      { type: 'improved', author: 'damilare', text: 'About and Changelog sit in the bottom-left corner of the window, at every width. They list the pages you are not on' },
      { type: 'new',      author: 'damilare', text: 'A changelog minimap — one dot per release, grouped by month. In the gutter on desktop, under the nav on mobile' },
      { type: 'improved', author: 'damilare', text: 'Month markers on the changelog timeline, so a jump lands somewhere marked' },
      { type: 'fixed',    author: 'damilare', text: 'sort=top could be set from a bookmark but never cleared' },
    ],
  },
  {
    date: '2026-08-31',
    title: 'About',
    items: [
      { type: 'new',      author: 'damilare', text: 'An About page — how a spreadsheet of links became this' },
      { type: 'new',      author: 'damilare', text: 'Both signatures draw themselves when they scroll into view' },
      { type: 'new',      author: 'damilare', text: 'Hover the word spreadsheet to see the original sheet' },
      { type: 'improved', author: 'damilare', text: 'Changelog bylines show faces. Each line keeps an initial' },
    ],
  },
  {
    date: '2026-08-30',
    title: 'Preview Panel & Gallery',
    items: [
      { type: 'improved', author: 'florence', text: 'Detail panel reads Preview / Mobile / Colors / Type. Mobile is a tab now, not a toolbar sitting over the preview' },
      { type: 'improved', author: 'florence', text: 'Live link moved into the panel header, beside the domain' },
      { type: 'improved', author: 'florence', text: 'Sort moved beside the result count. Categories select one at a time' },
      { type: 'improved', author: 'florence', text: 'Presentation mode and the filter chip row removed' },
      { type: 'fixed',    author: 'florence', text: 'An empty screenshot retries at viewport size; the shared browser reconnects after a crash instead of poisoning every capture after it' },
      { type: 'improved', author: 'florence', text: 'Duplicate detection ignores trailing slashes and query strings' },
      { type: 'fixed',    author: 'damilare', text: 'The selected sort pill was near-white on near-white in dark mode — 1.02:1, unreadable' },
      { type: 'fixed',    author: 'damilare', text: 'Live previews gave up on any failed image. Only real script errors count now' },
    ],
  },
  {
    date: '2026-08-27',
    title: 'Photographed Too Early',
    description: 'A dozen cards in the library were pictures of preloaders. The sites behind them had extracted perfectly — full palettes, both typefaces, dozens of assets — because the document was there the whole time, sitting underneath a splash screen. Nothing that reads the page could have caught it. Only the pixels showed it.',
    items: [
      { type: 'fixed',    text: 'Capture now waits for a page to finish painting itself rather than to finish loading. joyco.studio was a flat blue panel with a logo on it, therawmaterials.com a cream rectangle and one hairline, datum.xyz an empty white page with a nav bar — all three had complete data behind them. The test is whether the frame is still getting busier: content arriving pushes it up, a preloader holds it flat and low, and two samples without a rise means the page has arrived. therawmaterials climbs through three stages over four seconds before it settles' },
      { type: 'improved', text: 'How busy a frame is gets measured by asking the JPEG encoder, not by decoding the image. A flat colour costs almost nothing to store and a painted page costs a great deal, so the length of the buffer is the answer already — which is what makes this affordable to do four or five times a second inside a serverless function' },
      { type: 'fixed',    text: 'A capture that comes back nearly empty is now retaken once. Walking a page can restart an intro, and a scroll-triggered reveal may not have run at all, so the second attempt is compared against the first and the busier frame wins. A site that really is that sparse keeps the picture it had' },
      { type: 'new',      text: 'A tool that re-photographs the sources whose stored capture is a picture of nothing much, judging a replacement on two measures: how much is in the frame overall, and how much of the first screenful is given over to a single flat colour. The second is what catches a hero caught mid-transition — busy further down the page, blank across the top, which the first measure scores as perfectly healthy' },
      { type: 'improved', text: 'Fourteen cards replaced. joyco.studio, datum.xyz, shuttle.zip, therawmaterials.com, eandco, naotofukasawa and lyannetonk were blank or splash frames; variant.ai, payjustnow and waabi.ai were caught mid-transition. One site, occupied.unadsgn.tw, has stopped answering altogether — its host resolves and then never responds, which is now recorded rather than left looking like a capture that failed' },
    ],
  },
  {
    date: '2026-08-26',
    title: 'A Picture of an Outage',
    description: 'A site that has gone down often still answers 200, and an outage notice extracts perfectly well — a background colour, a line of type, no images. The library had one studio’s card replaced with a photograph of their PHP error, and nothing in the pipeline could tell the difference.',
    items: [
      { type: 'fixed',    text: 'Extraction now refuses to write when a page renders nothing readable. newterritory.studio fell over behind a Kirby error page served with a 200, and a backfill run captured that error page and filed it as the studio’s design — because from the pipeline’s point of view it was a page, and it loaded. No typography, no assets and almost no colour is not a site with an unusual design; it is a page that did not render. The previous capture is kept and the reason recorded, since a stale picture of the real site beats a fresh picture of somebody’s stack trace. New Territory’s card has been put back' },
      { type: 'fixed',    text: 'Spotify Design was filed under design.spotify.com, which does not resolve and never has. The entry had no screenshot, which meant it was not in the gallery at all — it existed only as a row. Repointed at spotify.design, where it extracts 12 colours, both typefaces and 43 assets' },
      { type: 'improved', text: 'Assets no longer decide whether a site counts as broken. A canvas game and a WebGL studio site have nothing in the document to extract, and no number of re-attempts changes that — three of them were being queued nightly forever on the strength of a panel they can never fill. A site is complete when it can be seen, read for colour and read for type; an empty assets tab now explains itself rather than being treated as a failure' },
      { type: 'fixed',    text: 'Four sites added this morning, before the extraction fixes landed, were still holding what the old pipeline gave them. Re-running the backfill recovered Raycast (16 colours, 82 assets), Aside (14 colours, 72 assets), illoca (6 colours, 26 assets) and Sleep Well Creatives, whose screenshot had never been captured. 283 of the 284 sites in the library now render every panel they can' },
    ],
  },
  {
    date: '2026-08-26',
    title: 'The Wrong Document',
    description: 'Four faults with one shape: the extractor was reading somewhere other than where the site actually was. The wrong elements, the wrong frame, the wrong dimension, and — for three sites — a gallery query that hid them completely while every check reported them healthy.',
    items: [
      { type: 'fixed',    text: 'Background images were only ever looked for on a guessed list of tags — sections, headers, anything with class="hero". That list matches inline style attributes and little else, so a site that art-directs properly, with its imagery in a stylesheet, read as having no imagery at all. The document is now walked. cameronsworld.net is built from 335 CSS backgrounds and had been reporting zero' },
      { type: 'fixed',    text: 'Some sites keep their entire document inside a frame, and everything the extractor does was reading the top document only. Same-origin child frames are now read as well — including the about:blank kind, which inherits its parent origin and gets filled by script after load, and which had been skipped on the assumption it was empty. Going looking only happens when the main document comes up thin, so ordinary pages are never trawled and nobody else’s advertising ends up filed as a site’s design language' },
      { type: 'fixed',    text: 'Screenshots clamped their height against Chrome’s pixel ceiling but never their width, and the ceiling applies to both. A page measuring 11520 wide blew the budget no matter how short the clip was, and came back empty every time. Width is now clamped too — and a document much wider than its own viewport is treated as overflow rather than layout, because a rogue absolutely-positioned element or a carousel measured at full length is not what the page looks like to a visitor' },
      { type: 'fixed',    text: 'Three sites with complete colour, typography and asset data were missing from the gallery entirely. The gallery only shows sources that have a screenshot, but the check for damaged sites only counted the three panels — so a site with everything except a picture passed every test while being invisible. The screenshot is now part of what counts as complete, which is what it always was to anyone looking' },
    ],
  },
  {
    date: '2026-08-26',
    title: 'Asking For Things',
    description: 'Anyone can now ask for a site to be added. The interesting part is what happens before you submit: with 280-odd sites already here, the likeliest answer to "please add this" is that it is already in the library — so the form tries to give you that answer instead of taking your request.',
    items: [
      { type: 'new',      text: 'Request a site from the header, or from the moment it actually occurs to you — search for something that is not here, and the empty result offers to request the thing you just searched for, rather than making you type it a second time somewhere else' },
      { type: 'new',      text: 'The address resolves as you type it. If the site is already in the library the form stops being a form and becomes a link to it. If somebody has already asked, it says how many. If it is genuinely new, it shows you the site — name, preview image, favicon — so you can confirm it is the one you meant before asking' },
      { type: 'new',      text: 'stripe.com, https://www.Stripe.com/, and stripe.com/?utm_source=twitter are one site, not three. Addresses are reduced to a common form before anything is compared, so the duplicate check works on what people actually type and two people asking for the same site increments a count instead of filing a second request' },
      { type: 'new',      text: 'Your browser remembers what you asked for and checks back on it. There are no accounts, so without this the flow would end at "thanks" and you would never learn whether it worked. Reopen the form later and your requests are listed as pending, passed, or added — and if it was added, there is a link straight to it' },
      { type: 'new',      text: 'A review queue in admin, ordered by how many people asked. Approving runs the same extraction the manual add form uses — one path into the library rather than two that drift apart. A failed approval leaves the request pending, because that is something to retry rather than something to lose. Passing on a site remembers the decision, but a fresh request revives it' },
      { type: 'improved', text: 'Rate limiting, which the site had none of anywhere. It lives in the database rather than in memory, because each serverless instance has its own memory and loses it on every cold start — a counter held there would reset constantly and be trivially outrun. It also runs before an address is resolved rather than after, so a stream of invalid addresses cannot spend DNS lookups without spending quota. If the check itself fails it lets the request through: a limiter that takes the whole feature down with a database hiccup is the worse failure' },
    ],
  },
  {
    date: '2026-08-26',
    title: 'The Third That Never Worked',
    description: 'Eighty-eight of the 281 sites in the library showed no colours, no typography, or no assets — and because the gallery sorts newest first, almost every one of them was on the first screen. Eight separate faults, none of which announced itself. Plus a rebuilt sidebar, a type scale with somewhere to go, and a good deal less weight to carry.',
    items: [
      { type: 'fixed',    text: 'Typography was being written to a database column that does not exist. The insert raised an error every single time, and the error was caught and thrown away, so the failure was completely silent. Seventy-eight sites hold no typography at all because of one wrong column name' },
      { type: 'fixed',    text: 'Extraction gave a page fifteen seconds to go completely quiet on the network before it would read anything, and if that never happened it threw the whole attempt away. A site with analytics, a chat widget, or an open websocket never goes quiet — so the timeout fired, and everything fell back to scraping colours out of raw HTML. That produced one unusable row and no type or assets, which is exactly what 55 sites were left holding. Getting the page is now what has to succeed; a quiet network is waited for briefly and then stopped caring about' },
      { type: 'fixed',    text: 'Assets were being read from a page that was moving. The asset scan ran at the same moment as the screenshot capture, and the screenshot capture scrolls — so images that load lazily were still empty when they were measured and got discarded as tracking pixels, and the logo detector, which looks for something near the top of the page, was looking at a viewport that had already scrolled past the header. The page is now brought to a complete stop first, once, and everything reads from there' },
      { type: 'fixed',    text: 'Sites behind Cloudflare were written off before the browser was ever asked. A plain request runs first to collect the title and preview image, and a 403 from it ended the entire attempt — even though the headless browser renders those sites perfectly well. Stripe, Wise, Mercury, Revolut and Airwallex had all been sitting in the library with nothing extracted for this reason' },
      { type: 'fixed',    text: 'Any page whose source contained the word "blocked" anywhere in it — a CSS class, a variable name, a sentence of copy — was rejected as a bot wall. Real challenge pages are now identified by the machinery they actually carry' },
      { type: 'fixed',    text: 'Tall pages came back with no screenshot. The height was capped at 12,000 pixels, but captures run at double density, so Chrome was being asked for 24,000 — past the limit where it silently returns an empty image instead of an error. The cap is now derived from the density actually in use' },
      { type: 'fixed',    text: 'One unreadable colour value discarded an entire palette. The colour parser does not always fail politely — it can throw from inside itself — and that happened outside the code guarding it. A site with 136 extracted colours was recorded as having none' },
      { type: 'fixed',    text: 'Extraction failures have never actually been recorded. The statement that writes the reason gave the database no way to work out what type the message was, so it raised every time, and the error was silently discarded. The explanation shown when a site has no data was never being written in the first place' },
      { type: 'fixed',    text: 'The most common "brand colour" in the entire library was #0000EE — the blue Chrome paints unstyled links. Sites that never styled their links were having a browser default filed as their brand' },
      { type: 'improved', text: 'A failure in one extractor no longer takes the others down. Colours, typography and assets are each caught separately, so a site with awkward assets still yields its palette and its type' },
      { type: 'improved', text: 'Heading fonts are now found by looking for the largest visible text on the page rather than the first h1 — which missed every site that builds headings out of divs, and every site keeping a hidden h1 for search engines in a font nobody sees. Body font is whichever family covers the most of the page, not whatever the first paragraph happened to use. And a monospace font now has to prove it is monospaced by measuring itself, which stopped Stripe being recorded as setting its code in Söhne' },
      { type: 'improved', text: 'Assets now include CSS background images, the largest image in a srcset rather than whichever one the browser picked, and anything inside a shadow root — which is most component-driven sites of the last few years. Logo detection gained two more ways to find a mark' },
      { type: 'improved', text: 'The sidebar was the least designed surface on the page — a plain list of text with a 2px mark beside whichever row was selected, which read as a list with a pointer next to it rather than a row that was on. Selected rows now fill: a solid surface, full ink, one weight up. Losing the mark also frees the leading edge, so labels start where the padding says they do instead of after a rule holding its place whether or not it was visible. Rows sit taller, the gaps between them close up so the column reads as one thing, and the counts share a fixed right-aligned column so the digits line up down the list' },
      { type: 'improved', text: 'The type scale runs from 10px to 32px instead of from 10px to 14px. Five of its seven tiers used to sit inside a four-pixel range, which is close enough that a card title and a category label read as the same voice. There is now a display tier, a heading tier, and a size meant for actually reading prose' },
      { type: 'improved', text: 'The admin screens had been re-declaring the type scale by hand — forty-two separate hand-written sizes that duplicated tiers already in the system, and three that had no tier at all' },
      { type: 'improved', text: 'Waiting for webfonts before reading type. Fonts routinely arrive after a page first paints, and reading before they land reports the fallback — which is how sites with real typography were recorded as using Arial' },
      { type: 'new',      text: 'A backfill tool that re-runs extraction across every site the pipeline previously failed on, and marks anything still unrecoverable with an honest reason rather than leaving it looking merely empty' },
    ],
  },
  {
    date: '2026-08-18',
    title: 'Clicking Anywhere',
    description: 'Only the title text of a card was clickable — everywhere else, including the screenshot, did nothing. That, and an audit across seven widths from a 375px phone to a 1920px display.',
    items: [
      { type: 'fixed',    text: 'Clicking a card did nothing unless you hit the title text exactly. The whole card is meant to be one target, carried by an invisible layer stretched across it — but pressing any control scaled it slightly, and that scale made the title button the anchor for its own overlay, shrinking the target to the size of the title mid-press. The mouse then lifted somewhere the target no longer was, so the click dissolved. The opt-out meant to prevent this had been written as a weaker rule than the one it was overriding, so it never applied' },
      { type: 'fixed',    text: 'A tablet was the worst place to browse the library. The three-pane split opened at 768px, which left the grid 384px to work with and cut cards to 158px wide — titles ran six lines and no two cards were the same height. The split now waits for 1280px, so everything below it gets the mobile layout with more room rather than the desktop one crushed into it. A small laptop at 1024px went from two 222px cards — narrower than a phone gets — to two at 484px' },
      { type: 'fixed',    text: 'Card titles carried two instructions that both set how the element displays, and the wrong one won, so the one-line clamp never applied at all. Every title now truncates as intended, which is what finally made card heights uniform across a row' },
      { type: 'fixed',    text: 'The industry label was told to truncate and also told it could not shrink, which are contradictory — so instead of an ellipsis it overflowed and got sliced mid-word at the card edge. It reads "FINANCE", not "FINANC"' },
      { type: 'improved', text: 'Every control in the header was smaller than a fingertip: sort buttons 23px tall, the changelog link 17px. All of them now carry a 44px touch target while looking exactly as they did — the target grew, the design did not' },
      { type: 'new',      text: 'A skip link. With up to 128 cards loaded and two stops on each, reaching the grid by keyboard meant tabbing past everything else first' },
      { type: 'fixed',    text: 'Near-black colour swatches were invisible in dark mode, sitting on an almost-black background behind a hairline too faint to separate them. They have a real ring now' },
      { type: 'improved', text: 'The preloader was tuned for a two-column grid that no longer exists — it was fetching images the browser then reported as unused, while missing the one that actually anchored the page load. It now follows the layout it really has' },
    ],
  },
  {
    date: '2026-08-13',
    title: 'Every Interaction',
    description: 'A craft pass over every control in the app, against Emil Kowalski\'s design engineering principles. Most of this is meant to be felt rather than noticed.',
    items: [
      { type: 'new',      text: 'Nothing in the app confirmed a press. All 27 controls now scale to 0.97 on press over 140ms — the single biggest reason the interface read as unresponsive, no matter how fast it actually was' },
      { type: 'improved', text: 'Cards are too large to scale without looking cheap, so pressing one lights its border instead. The press registers through the whole card, wherever you hit it' },
      { type: 'fixed',    text: 'No hover state was gated to fine pointers, so tapping on a phone left cards zoomed and buttons lit long after you had moved on. Movement-bearing hover is now pointer-gated' },
      { type: 'improved', text: 'One easing curve was doing every job. Split into three: the signature curve for entering and leaving, symmetric acceleration for movement across the screen, and a plainer curve for hover and press that never overshoots' },
      { type: 'fixed',    text: 'Reduced motion was flattening every transition to 0.01ms, including the colour and opacity changes that tell you something responded. It now neutralises movement only, and keeps the feedback' },
      { type: 'improved', text: 'Keyboard-driven actions no longer animate: arrow keys through presentation mode and the detail tabs are repeated constantly, and animating them made every step feel like it lagged the key. Pointer and swipe navigation keep the motion' },
      { type: 'improved', text: 'The detail tab underline moved from 300ms to 200ms on a movement curve — it is clicked often enough that the old timing read as drag' },
      { type: 'fixed',    text: 'Two places used transition-all, animating layout properties off the GPU' },
    ],
  },
  {
    date: '2026-08-12',
    title: 'Filtering, Rebuilt',
    description: 'Filtering worked but did not feel like it. Two real bugs, and a pass on the language around them.',
    items: [
      { type: 'fixed',    text: 'Two quick category clicks both branched from the same URL snapshot, so the second silently dropped the first — picking SaaS then Finance left you with only Finance. Consecutive edits now compose' },
      { type: 'fixed',    text: 'Filtering left you where you were scrolled, so a new result set opened halfway down and read as though nothing had changed. Changing a filter returns you to the top; opening a site still does not move the page' },
      { type: 'fixed',    text: 'The sidebar All row was counting the filtered results, so selecting Finance made it read "All 13"' },
      { type: 'improved', text: 'Selected categories now carry a rule on the leading edge and go to full ink, instead of a background wash you had to look for. The rule holds its slot when inactive, so nothing shifts' },
      { type: 'new',      text: 'A filter bar above the grid shows everything currently applied — categories, tags and the search term as removable chips, with a result count and Clear all. Applied state used to be split between the sidebar, the header and a separate tag list' },
      { type: 'improved', text: 'Result sets crossfade with the grid height held, rather than the whole grid dropping to 40% opacity and the page collapsing between sets' },
      { type: 'fixed',    text: 'The favicon was v0\'s logo — the SVG shipped in the template was theirs, not ours. Rebuilt as the library\'s own hash mark, legible at 16px. Also dropped leftover v0 authorship metadata' },
    ],
  },
  {
    date: '2026-08-12',
    title: 'Locked Down, Server-Rendered, Linkable',
    description: 'A full audit pass. Every write endpoint now has real authentication, the proxy can no longer be pointed at internal hosts, the gallery ships as HTML instead of an empty shell, and every view you can reach has a URL you can send someone.',
    items: [
      { type: 'fixed',    text: 'Admin was a client-side illusion: the gate was a sessionStorage flag, so every write route — delete, extract, re-extract, bulk import, deduplicate, Figma backfill, mobile capture, element capture — was callable by anyone with curl. All of them now verify an HMAC-signed httpOnly session cookie server-side, with a bearer-token path for scripts' },
      { type: 'fixed',    text: 'The link proxy validated only that a URL started with http — it would happily fetch cloud metadata endpoints and internal hosts and hand back the response. It now resolves DNS and rejects loopback, link-local, private, CGNAT and multicast ranges, re-checking on every redirect hop' },
      { type: 'new',      text: 'The gallery is server-rendered: the grid, categories and counts arrive as HTML. Crawlers previously saw 141 characters of text on a library of 199 sites' },
      { type: 'new',      text: 'Every view has a URL — category, tag, search, sort and the open site all live in the query string, so views are shareable and the back button works. A ?site= link opens that site even when it sits outside the first page of results' },
      { type: 'new',      text: 'robots.txt, sitemap.xml and a web manifest, none of which existed; SVG favicon instead of a 28KB JPEG; filtered views are marked noindex so they stop competing with the index' },
      { type: 'fixed',    text: 'Tag filtering never worked — clicking a tag refetched with the tag silently dropped, so nothing changed. Tags now filter properly, stack with categories, and show as removable chips' },
      { type: 'fixed',    text: 'Titles were raw <title> tags: HTML entities rendered literally ("International Tax &amp; Legal") and brands repeated the domain right below them. Entities are decoded and echoed brand suffixes trimmed, but only when what remains still describes the page' },
      { type: 'fixed',    text: 'Broken thumbnails: some stored URLs kept their HTML entities and 404d; those are decoded on read. A new scripts/repair-screenshots.mjs finds sites whose screenshot uploaded as zero bytes (5 of 199) and re-extracts them' },
      { type: 'fixed',    text: 'Root cause of those empty screenshots: Chrome returns an empty buffer rather than an error when a page is too tall to encode, and the result was uploaded unchecked. Captures are now clamped to 12000px and an empty buffer is never uploaded. Three of the five recovered by falling back to the site OG image; the two that resist capture entirely (sarvam.ai, vap.studio) show their domain, as designed' },
      { type: 'improved', text: 'Search no longer replaces the grid with 32 skeletons on every keystroke — results stay put and dim while refetching, and out-of-order responses can no longer overwrite newer ones' },
      { type: 'improved', text: 'The preloader was a flat 2.1s block unrelated to loading, and it server-rendered on every route, so /changelog shipped a blank overlay reading 000. It now races the page with a 900ms ceiling, is client-only, and sits out entirely for reduced-motion visitors' },
      { type: 'improved', text: 'Cards: the visit link was invisible until hover, so touch users could never reach it — now always visible. Removed a link nested inside a role="button", and the five colour swatches announce as one palette instead of five hex codes' },
      { type: 'improved', text: 'List and category responses are cached at the edge instead of no-store on every request; sort is its own labelled row on mobile rather than sharing a scroll strip with categories' },
      { type: 'fixed',    text: 'Escape now closes the detail panel at every breakpoint, and the mobile focus trap no longer runs against a hidden sheet on desktop' },
    ],
  },
  {
    date: '2026-08-04',
    title: 'Design Language Refinement',
    description: 'Same character, sharper execution. The language now runs on a real system: a six-step type scale, four ink levels, three edge weights, one radius, one easing — swept across every surface. Plus a roomier inspector.',
    items: [
      { type: 'improved', text: 'Foundation tokens: ink levels (100/62/40/24) replace eleven ad-hoc text opacities; edge weights (70/50/30) replace four border treatments; 4px radius everywhere; one signature easing with four tokenized durations' },
      { type: 'improved', text: 'Type scale: micro 10px / meta 11px / ui 12px / body 13px / title 14px — nothing in the UI renders below 10px anymore (specimen footers were 7.5px)' },
      { type: 'new',      text: 'Roomier inspector: desktop split is now sidebar 2 / gallery 6 / panel 4 — specimens, palettes, and asset grids finally breathe; cards are wider at typical desktop widths (2-up, 3-up on very large screens)' },
      { type: 'new',      text: 'Press / to focus search (keycap hint in the field); panel load failures now offer Retry' },
      { type: 'improved', text: 'Panel tabs: sliding active underline (shared layout animation), legible 10px labels' },
      { type: 'improved', text: 'One spinner, one copy-feedback pattern (in-place check morph, no layout shift — export buttons no longer jump), one section-label treatment, one focus ring' },
      { type: 'improved', text: 'Calmer motion: scale-pop removed from panel content, card hover eased to 1.015 on the signature curve, all durations tokenized' },
      { type: 'improved', text: 'Skeleton cards now match real card geometry exactly; mobile filter pills returned to library materials (mono, tabular counts); sheet respects safe-area' },
      { type: 'improved', text: 'Presentation mode: white-alpha steps mirroring the ink system, keycap hints for pointer users, tokenized progress motion' },
      { type: 'fixed',    text: 'Type specimens: fade-in-up keyframe was never defined in globals — specimens could render invisible; now defined' },
      { type: 'fixed',    text: 'viewport themeColor now matches the real background tokens (#f7f7f5 / #0e0e0e)' },
      { type: 'fixed',    text: 'Removed dead components theme-toggle.tsx and typography-display.tsx; duplicate Google Fonts link on specimens' },
    ],
  },
  {
    date: '2026-08-03',
    title: 'Design Language Lift & Figma Tab Removed',
    description: 'Warmer, more refined UI across every surface — same density, better craft. Figma tab removed entirely.',
    items: [
      { type: 'improved', text: 'Design cards: subtler hover scale (1.02×), visit link replaced with a blurred pill that reveals on hover, metadata section has cleaner hierarchy — title in tight tracking, domain in 40% opacity mono, industry in uppercase caps' },
      { type: 'improved', text: 'Header title: "Hitman\'s Library" split so the apostrophe-s renders in font-light — intentional weight contrast, not a typo' },
      { type: 'improved', text: 'Sidebar: active category now uses bg-muted/70 instead of full bg-foreground inversion — less aggressive, more editorial' },
      { type: 'improved', text: 'Panel tabs: labels now uppercase with wider letter-spacing, 1.5px border indicator, slightly smaller icons — tighter and more refined' },
      { type: 'improved', text: 'Panel header: hostname uses tighter tracking, industry/tag shows as uppercase badge below' },
      { type: 'improved', text: 'Empty panel state: stale "figma" removed from hint text, type treatment more restrained' },
      { type: 'improved', text: 'Globals: 2.2% SVG fractal noise grain overlay on body — gives all surfaces a material, warm quality instead of flat digital feel' },
      { type: 'improved', text: 'Skeleton cards match the updated 3px border-radius of real cards' },
      { type: 'fixed',    text: 'Removed Figma tab entirely — panel-tabs, site-detail-panel updated; figma-tab.tsx deleted' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Designed States — No More Screenshot Crutches',
    description: 'Every "loading" and "blocked" state is now a proper designed UI — honest, intentional, and consistent with the design language. Screenshots are no longer used as automatic fallbacks when a live preview fails.',
    items: [
      { type: 'improved', text: 'Preview tab loading state: clean domain name + three staggered pulsing dots — no screenshot background while the iframe loads. What you see while loading matches what you\'ll see when it\'s ready' },
      { type: 'improved', text: 'Preview tab proxy-failed state: domain name + "Live preview unavailable" label + "Open site ↗" CTA. Honest about what\'s happening instead of silently showing a static screenshot as if it were live' },
      { type: 'improved', text: 'Presentation mode proxy-failed state: subtle dot-grid background, large domain name, industry label, color palette swatches, and a "Visit site ↗" link. Blocked sites now feel like reference cards, not broken frames' },
      { type: 'improved', text: 'Design card selected state: top accent line (2px) appears when a card is active — stronger visual signal that pairs with the brighter border' },
      { type: 'improved', text: 'Design card color swatches are slightly larger (14px) for better readability at a glance' },
      { type: 'improved', text: 'Empty panel state: "Select a site" now shows the list of available tabs (preview · colors · type · assets · figma) as a quiet visual hint of what\'s inside' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Figma Layers — Copy Any Site as Editable Layers',
    description: 'New "Layers" button in the Figma tab copies the full site as real Figma layers — text, shapes, and structure — not a flat screenshot. No plugin required.',
    items: [
      { type: 'new', text: 'Layers button in the Figma tab — opens the site in a capture window using Figma\'s own publicly-hosted capture.js script (the same tool that powers their AI integrations). Click "Copy to clipboard" in the toolbar that appears, then ⌘V in Figma to get fully editable text, shapes, and layout — not a rasterized PNG' },
      { type: 'new', text: 'Element selection in capture mode — the capture toolbar lets you select any component (nav, card, pricing section) instead of capturing the full page, so you can pull only what you need into Figma' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Performance & Design Polish',
    description: 'Faster perceived load across preview and presentation mode. Sharper visual hierarchy in the sidebar and detail panel.',
    items: [
      { type: 'improved', text: 'Presentation mode shows the site thumbnail immediately while the proxy iframe loads — navigating between sites now feels instant instead of flashing to black' },
      { type: 'improved', text: 'Presentation mode: added always-visible prev/next buttons to the bottom HUD — arrows are now immediately discoverable instead of requiring hover over the preview area' },
      { type: 'improved', text: 'Sidebar active category now has a left border accent — clearer visual signal for which filter is selected, especially when multiple industries are active' },
      { type: 'improved', text: 'Panel tabs: active tab label is now font-medium — stronger differentiation from inactive tabs at a glance' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Critical: App Crash on Site Preview',
    description: 'Fixed a root-cause bug that crashed the entire app when previewing certain sites.',
    items: [
      { type: 'fixed', text: 'Added sandbox attribute to all proxy iframes — the root cause of "Application error" crashes. The proxy serves external sites at the hitmanslibrary.xyz origin, so their JavaScript ran same-origin, letting any unhandled JS error in those sites fire window.onerror on the parent and trigger the Next.js error page. Sandboxing the iframes without allow-same-origin isolates errors to the iframe while keeping postMessage (used for proxy-failed signals and the Figma picker) fully functional.' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Presentation Mode Redesign & Touch Targets',
    description: 'Presentation mode rebuilt from the ground up with a minimal overlay HUD. Touch targets increased to 44px+ across the entire UI.',
    items: [
      { type: 'improved', text: 'Presentation mode: minimal overlay HUD — controls float at top-right and fade in after a beat so the first thing you see is the site, not chrome' },
      { type: 'improved', text: 'Presentation mode: nav arrows appear only on hover over the preview area, keeping the experience immersive when you\'re just watching' },
      { type: 'improved', text: 'Presentation mode: thin animated progress bar at the very top shows your position across the full collection at a glance' },
      { type: 'improved', text: 'Presentation mode: bottom HUD shows domain, industry, counter, and color palette in one compact row instead of two separate top/bottom bars' },
      { type: 'improved', text: 'Presentation mode: info row slides in the direction of navigation — left when going back, right when going forward — giving a physical sense of movement' },
      { type: 'new', text: 'Presentation mode: swipe left/right to navigate on touch devices — works on any phone or tablet without tapping arrows' },
      { type: 'improved', text: 'Header icon buttons increased from 32px to 36px — easier to tap accurately on touch screens' },
      { type: 'improved', text: 'Mobile category filter pills increased from 28px to 40px height — were consistently too small to tap without mis-tapping adjacent pill' },
      { type: 'improved', text: 'Sidebar filter rows increased to 36px — matches minimum recommended touch target for dense lists' },
      { type: 'improved', text: 'Detail panel action buttons (re-extract, close) increased from 32px to 36px' },
      { type: 'improved', text: 'Panel tabs increased from 40px to 44px height — meets Apple HIG minimum touch target recommendation' },
      { type: 'improved', text: 'Color copy button expanded to 28px minimum — was previously a 12px hit target from a 4px padding box' },
      { type: 'improved', text: 'Type specimen action icons (copy, Google Fonts link) increased from 24px to 32px' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Performance, Bug Fixes & Figma Tab',
    description: 'Fixed site-wide performance regression, wired the missing Figma tab, and patched several data display bugs.',
    items: [
      { type: 'fixed', text: 'Figma tab now appears in the detail panel — it was fully implemented but never wired into the panel tabs' },
      { type: 'improved', text: 'Replaced transition-all on all buttons and links with transition-colors — eliminates browser compositing cost across all CSS properties on every click target' },
      { type: 'fixed', text: 'Sidebar and mobile filter "All" count now shows the real total (e.g. 177) instead of the current page load (32)' },
      { type: 'fixed', text: 'Removed invalid workflow key from next.config.mjs that was generating startup warnings on every dev server boot' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'TypeScript Bug Fixes',
    description: 'Full type-error sweep — zero TS errors across the entire codebase.',
    items: [
      { type: 'fixed', text: 'Created missing UI components: Label, Select, Badge, Tabs, ScrollArea, Textarea, Slider — many node and panel components were importing these non-existent files' },
      { type: 'fixed', text: 'Created missing lib/node-utils module — all node components importing getStatusColor() were silently broken at runtime' },
      { type: 'fixed', text: 'Node components now use correct @xyflow/react v12 NodeProps generic — NodeProps<FlowNode<DataType>> instead of NodeProps<DataType>' },
      { type: 'fixed', text: 'fetch() timeout option removed — not part of RequestInit; replaced with AbortController signal for proper 8s timeout on URL extraction' },
      { type: 'fixed', text: 'motion/react Variants type — spring transition type is now a string literal (as const) so it satisfies AnimationGeneratorType' },
      { type: 'fixed', text: 'unknown → ReactNode errors in 6 node files — output conditions now use !! to guarantee boolean before &&' },
      { type: 'fixed', text: 'Missing CheckCircle import in excel-parser node' },
      { type: 'fixed', text: 'prompt-node onFocus handler accepts SyntheticEvent instead of MouseEvent' },
      { type: 'fixed', text: 'Implicit any on Slider onValueChange callbacks — destructured value now typed as number[]' },
      { type: 'fixed', text: 'Implicit any on forEach callbacks in browser-extraction.ts — all font string arrays now typed explicitly' },
    ],
  },
  {
    date: '2026-05-11',
    title: 'Accessibility, Polish & Code Health',
    description: 'Keyboard navigation, screen-reader labels, design-token alignment, and bundle cleanup from a full quality audit.',
    items: [
      { type: 'improved', text: 'Removed unused DesignBrowser component — eliminates dead code and reduces bundle' },
      { type: 'fixed', text: 'Type specimen sample text and glyphs now render at correct opacity — was using hsl() around an oklch token which browsers silently ignored' },
      { type: 'fixed', text: 'Design cards are now keyboard-navigable — Tab to reach, Enter or Space to open the detail panel' },
      { type: 'improved', text: 'Status colors (success, error, loading) now use design tokens — consistent across nodes, type specimens, figma tab, and changelog' },
      { type: 'improved', text: 'Consolidated to single icon library (@phosphor-icons) — removed lucide-react dependency' },
      { type: 'fixed', text: 'Search inputs now have accessible labels for screen readers via aria-label' },
      { type: 'fixed', text: 'Filter and sort buttons now announce their active/inactive state to screen readers via aria-pressed' },
      { type: 'fixed', text: 'Color swatch copy button now announces its action and value to screen readers' },
      { type: 'fixed', text: 'Re-extract button uses aria-label instead of title — now accessible to screen readers and keyboard users' },
      { type: 'fixed', text: 'Mobile detail sheet upgraded to native <dialog> with showModal() — gains proper focus trapping, Escape to close, and system backdrop' },
      { type: 'fixed', text: 'Presentation mode screenshot alt text now describes the site by name, not just domain' },
      { type: 'improved', text: 'Extracted shared NodeStatus component — eliminates duplicated status icon logic across all node components' },
      { type: 'fixed', text: 'Google Fonts stylesheet now only injected once per URL — prevents duplicate network requests when multiple type specimens share a font' },
      { type: 'fixed', text: 'Theme toggle button now announces the destination mode ("Switch to dark mode") rather than just "Toggle theme"' },
      { type: 'fixed', text: 'Preloader is now hidden from screen readers via aria-hidden — decorative counter is not meaningful content' },
      { type: 'fixed', text: 'Preloader setTimeout calls now properly cleaned up on unmount — eliminates potential state updates after component is removed' },
      { type: 'fixed', text: 'Color swatches on gallery cards now have role="img" and aria-label with the hex value for screen readers' },
      { type: 'improved', text: 'Replaced all spring/bounce easing (0.34,1.56,0.64,1) with ease-out-expo (0.22,1,0.36,1) — animations feel faster and more intentional' },
      { type: 'improved', text: 'Extracted DesignCard component and getDomain helper to their own files — reduces page.tsx by ~130 lines' },
      { type: 'improved', text: 'Assets tab checkerboard background now uses design tokens — adapts correctly to light and dark mode' },
      { type: 'improved', text: 'Preview tab screenshot image now uses loading="lazy" — deferred until the panel is actually viewed' },
      { type: 'improved', text: 'Re-extract and close icon buttons in the detail panel increased from 28px to 32px for easier touch activation' },
      { type: 'improved', text: 'Package name corrected from "ai-agent-builder" to "hitmans-library"' },
    ],
  },
  {
    date: '2026-05-11',
    title: 'Figma Native Paste, Thumbnail Fix & UI Polish',
    description: 'Copy any screenshot directly to your clipboard and paste into Figma without any plugin. All 177 site cards now show their own captured screenshots reliably.',
    items: [
      { type: 'new',      text: 'Figma tab — copy Desktop or Mobile screenshot as a PNG image, paste directly into Figma with ⌘V — no html.to.design plugin required' },
      { type: 'new',      text: 'Sort pills in header — New / Old / A–Z / Top (quality)' },
      { type: 'new',      text: 'Multi-select industry filters — hold multiple categories at once' },
      { type: 'new',      text: 'Card hover reveals a visit ↗ button without opening the detail panel' },
      { type: 'new',      text: 'Tags shown on gallery cards and in the detail panel header' },
      { type: 'new',      text: 'Detail panel hostname is now a direct link to the site' },
      { type: 'improved', text: 'All 177 thumbnails now use captured blob screenshots — eliminates blank cards from rate-limited external screenshot services' },
      { type: 'improved', text: 'Sidebar category counts now match exactly what the gallery shows' },
      { type: 'fixed',    text: 'Font 404 errors — removed dead @font-face declarations for missing SuisseIntl files' },
      { type: 'fixed',    text: 'Extraction error UI in Preview tab was never visible due to an impossible condition' },
      { type: 'fixed',    text: 'Re-extract could crash Colors/Type/Assets tabs by not normalizing null arrays' },
      { type: 'fixed',    text: 'Quality sort silently fell back to "newest" — now correctly sorts by extracted quality score' },
      { type: 'fixed',    text: 'SVG assets tab had an XSS vector from inline rendering of raw DB content' },
    ],
  },
  {
    date: '2026-04-06',
    title: 'Breakpoints, Full-Page Copy & Bug Fixes',
    description: 'Figma tab now lets you simulate any breakpoint and copy the full page. Stability fixes eliminate the client-side crash and missing site cards.',
    items: [
      { type: 'new',      text: 'Breakpoint selector in Figma tab — switch between Auto / 390 / 768 / 1440px and see the site respond live' },
      { type: 'new',      text: 'Full-page copy — one click captures the entire page as Figma layers, not just a single element' },
      { type: 'fixed',    text: 'Client-side exception on some sites — API error responses now handled gracefully, no more crash on load' },
      { type: 'fixed',    text: 'Site cards not visible — gallery query was referencing non-existent DB columns, now uses safe correlated subqueries' },
      { type: 'fixed',    text: 'Retina screenshots — desktop now captured at 2× DPR, mobile at 3×, with lazy-image scroll-through before capture' },
      { type: 'improved', text: 'Card image hover — CSS transition replaces motion.img for better performance and no layout shift' },
    ],
  },
  {
    date: '2026-04-05',
    title: 'Figma Element Picker & Live Preview',
    description: 'The Figma tab now shows the live site — hover to inspect, click any element to copy it to Figma instantly. Full-page copy is pre-loaded so it\'s immediate too.',
    items: [
      { type: 'new',      text: 'Element picker — hover any element to highlight it, click to copy directly to Figma' },
      { type: 'new',      text: 'Full-page Figma layers pre-loaded on tab open — copy is instant, no wait' },
      { type: 'new',      text: 'HTML proxy — loads any site inside the panel regardless of X-Frame-Options restrictions' },
      { type: 'new',      text: 'Live preview — embedded iframe replaces static screenshots entirely' },
      { type: 'new',      text: 'Figma tab — dedicated panel tab with auto-capture on first open' },
      { type: 'new',      text: 'Search input in header — search across all sites in real time' },
      { type: 'improved', text: 'Panel header redesigned — compact icon row for visit, re-extract, and close' },
      { type: 'improved', text: 'Preview simplified — responsive iframe with no desktop/mobile toggle needed' },
      { type: 'fixed',    text: 'Filter effect dep used JSON.stringify on every render — replaced with stable primitives' },
    ],
  },
  {
    date: '2026-04-02',
    title: 'Copy to Figma, Mobile Views & More',
    description: 'A batch of tools that make the library more actionable — export designs, capture mobile layouts, and send layers directly to Figma.',
    items: [
      { type: 'new',      text: 'Copy to Figma — paste any captured site as editable layers directly into Figma' },
      { type: 'new',      text: 'Mobile screenshots alongside desktop — captured at 390×844 during extraction' },
      { type: 'new',      text: 'Desktop / Mobile toggle in the preview tab' },
      { type: 'new',      text: 'Palette export — copy colors as CSS custom properties or Tailwind config in one click' },
      { type: 'new',      text: 'Bulk add — paste multiple URLs at once and watch them process in a live queue' },
      { type: 'new',      text: 'Preloader — 000→100 counter on first visit' },
      { type: 'improved', text: 'HEX and OKLCH values are now separately copyable from the colors tab' },
    ],
  },
  {
    date: '2026-04-01',
    title: 'UI Redesign & Sound',
    description: 'The whole interface got a quiet, high-contrast overhaul. Sound feedback added for copy and success actions.',
    items: [
      { type: 'improved', text: 'Full gallery layout redesign — cleaner grid, tighter type, better dark mode' },
      { type: 'new',      text: 'Subtle sound effects on copy and successful extraction' },
      { type: 'improved', text: 'Admin CMS — passcode protection and one-click duplicate removal' },
      { type: 'fixed',    text: 'Admin page was unscrollable due to a global overflow:hidden — resolved' },
    ],
  },
  {
    date: '2026-03-17',
    title: 'Performance, Polish & Mobile',
    description: 'Faster perceived load, better mobile interactions, and more color control.',
    items: [
      { type: 'new',      text: 'Skeleton loading on first page load and category filtering' },
      { type: 'new',      text: 'HEX / OKLCH format toggle on the colors tab' },
      { type: 'improved', text: 'Dark / light theme toggle — instant, no flash of wrong theme' },
      { type: 'improved', text: 'Category labels rewritten to better reflect actual design context' },
      { type: 'improved', text: 'Mobile sheet — safe-area insets and 44px touch targets throughout' },
      { type: 'fixed',    text: 'Prevented scroll chaining between preview panel and page body on mobile' },
      { type: 'fixed',    text: 'Edge case: achromatic and scientific-notation OKLCH values now parse correctly' },
    ],
  },
  {
    date: '2026-03-04',
    title: 'Real Screenshots',
    description: 'Cards now show actual screenshots of the captured site instead of color blocks.',
    items: [
      { type: 'new',      text: 'Live website screenshots displayed on every design card' },
      { type: 'improved', text: 'Switched to a reliable headless screenshot pipeline after testing multiple providers' },
    ],
  },
  {
    date: '2026-02-24',
    title: 'Copy Feedback & Social',
    description: 'Small interactions that make copying feel right.',
    items: [
      { type: 'new',      text: 'Copy feedback on color swatches — animated toast on click' },
      { type: 'new',      text: 'OG image and social meta for sharing the library' },
      { type: 'improved', text: 'Microinteractions across the UI following Emil Kowalski\'s principles' },
    ],
  },
  {
    date: '2026-02-23',
    title: 'Initial Launch',
    description: 'Hitman\'s Library ships. Extract, browse, and reference design systems from any URL.',
    items: [
      { type: 'new', text: 'Color palette extraction — brand colors with OKLCH values' },
      { type: 'new', text: 'Typography extraction — font families, roles, and Google Fonts links' },
      { type: 'new', text: 'Asset catalog — logos, icons, images discovered per site' },
      { type: 'new', text: 'Industry categorization for every captured site' },
      { type: 'new', text: 'Browse and search across your entire design library' },
      { type: 'new', text: 'Excel import for bulk seeding the library' },
    ],
  },
]

export default changelog
