// app/feed.xml/route.ts
// RSS of the newest sites: hitmanslibrary.xyz/feed.xml. Each item is one site
// with its library page, measured palette and typefaces in plain words, and
// its link card as the image. For feed readers, automations and the bot that
// posts for @hitmanslibrary.
import { loadFeed, describeItem } from '@/lib/read/feed'
import { getDomain } from '@/lib/get-domain'

export const revalidate = 3600

const HOME = 'https://hitmanslibrary.xyz'
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function GET() {
  const items = await loadFeed(30)
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>Hitman's Library</title>
<link>${HOME}</link>
<atom:link href="${HOME}/feed.xml" rel="self" type="application/rss+xml"/>
<description>New sites in Hitman's Library, each with its colours and type measured.</description>
<language>en</language>
${items.map(i => {
  const page = `${HOME}/site/${i.slug}`
  const palette = i.colors.slice(0, 6).map(c => c.hex).join(' ')
  const text = [
    describeItem(i),
    palette ? `Palette: ${palette}.` : '',
    i.fonts.length ? `Type: ${i.fonts.slice(0, 3).map(f => `${f.family} (${f.role})`).join(', ')}.` : '',
    `Live site: ${getDomain(i.url)}.`,
  ].filter(Boolean).join(' ')
  return `<item>
<title>${x(i.name)}</title>
<link>${x(page)}</link>
<guid isPermaLink="true">${x(page)}</guid>
<pubDate>${new Date(i.addedAt).toUTCString()}</pubDate>
${i.kind ? `<category>${x(i.kind)}</category>\n` : ''}<description>${x(text)}</description>
${i.card ? `<enclosure url="${x(i.card)}" type="image/jpeg" length="0"/>\n<media:content url="${x(i.card)}" medium="image" type="image/jpeg" width="1600" height="900"/>` : ''}
</item>`
}).join('\n')}
</channel>
</rss>
`
  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
