// Renders the digest email against the prototype's real data snapshot so the
// design can be reviewed in a browser before it ships. Node 24 strips the
// types; the email module is import-free, so nothing else needs resolving.
import { readFileSync, writeFileSync } from 'node:fs'
import { digestHtml, digestText, type DigestSite } from '../lib/digest-email.ts'

const raw = JSON.parse(
  readFileSync(new URL('../../design-review/hybrid/data/sites.json', import.meta.url), 'utf8'),
)

// Two sites per kind, first-seen kind order, up to seven total — enough to
// show the section grouping without an endless scroll.
const groups: DigestSite[][] = []
for (const s of raw) {
  const site: DigestSite = {
    id: Number(s.id),
    title: s.title,
    kind: s.kind,
    thumbnail: s.thumb ?? s.fallback ?? null,
    url: s.url,
    colors: (s.colors ?? []).slice(0, 5),
  }
  const group = groups.find(g => g[0].kind === site.kind)
  if (group && group.length < 2) group.push(site)
  else if (!group) groups.push([site])
  if (groups.reduce((n, g) => n + g.length, 0) >= 7) break
}
const sites = groups.flat()

const unsubUrl = 'https://hitmanslibrary.xyz/unsubscribe?token=preview'
writeFileSync('/private/tmp/digest-preview.html', digestHtml('Damilare', sites, unsubUrl))
writeFileSync('/private/tmp/digest-preview.txt', digestText('Damilare', sites, unsubUrl))
console.log(JSON.stringify(sites.map(s => ({ title: s.title, kind: s.kind, colors: s.colors.length, thumb: !!s.thumbnail })), null, 2))
