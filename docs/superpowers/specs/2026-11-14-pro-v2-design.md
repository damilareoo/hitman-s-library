# Pro v2: a library that works for you

Date: 2026-11-14. Status: draft for approval.

## Why

Pro today is unlimited style kits, search by palette/font/contrast, and requests reviewed first. That is browsing with fewer limits, which is thin for $5/month or $48/year. People pay when the library does work for them. Paddle is still reviewing the domain, so this is the moment to make Pro worth paying for before the first real sale.

## Who pays

Designers, developers and founders, all three. Each has a lead feature:

| Who | The job they pay for | Lead feature |
|---|---|---|
| Founders / makers | "Show me how a site I admire is built, now" | Analyse any site |
| Developers | "Use real design systems while I build with AI" | Library in your AI tools |
| Designers | "Keep me ahead, and help me make the case" | Watch, history, trends |

## Goals

1. **Analyse any site.** A Pro member pastes any URL, even one outside the library, and within about a minute gets a private analysis of it: capture (desktop and mobile), palette with coverage, typefaces, and the full style kit. Saved to their account. Optionally "suggest it for the library", which feeds the existing review queue at the front.
2. **Library in your AI tools.** A personal key and an MCP server, so Claude, Cursor, ChatGPT and similar tools can search the library, open a site's kit (tokens, fonts, palette, capture URLs), and run "analyse any site" on the member's behalf. Same quota as the web.
3. **Watch, history, trends.**
   - **Watch** any site (in the library or analysed). When a re-capture finds it redesigned (the existing drift detection), the member gets an email with before/after: capture, palette and type side by side.
   - **History**: every site's past looks, from the snapshots already kept (`extraction_history`), as a timeline in the panel.
   - **Monthly trends briefing**: an email and a /trends page built from the library's own data. What fonts, colours and layouts new sites use this month versus last ("38% of new sites set a serif display face; amber up, indigo down").
4. **A live sample on /pro.** Signed-out and free visitors see a real, fully open example on one featured site: its kit, an analysis, its history, a watch alert email, and an AI-tool snippet. They see exactly what they'd get before paying.
5. **New this week** (free, for everyone). A slim strip above the grid showing this week's additions; hidden when filtering or once seen.

## Non-goals (this round)

- Side-by-side compare, free font alternatives, Figma one-click, and shareable moodboards. Good later additions, not reasons to pay on their own.
- Teams and seats. Collaboration. Public API pricing tiers.
- Any paid infrastructure.

## Anti-goals (would be a failure even if it works)

- Any fixed cost above $0. Every new piece stays inside free tiers, with hard caps rather than overage.
- Analyses or watch lists leaking between members, or showing up publicly without the member choosing to suggest the site.
- An AI-tool key that can do more than read the library and run the member's own quota.
- Slop: new surfaces follow the card anatomy, button, radius and motion rules already set.

## Constraints

- **Cloudflare Workers free plan:** 10ms CPU per request. Heavy work (rendering, image work) runs in Browser Rendering or is streamed, never parsed in the Worker.
- **Captures need a real browser.** Puppeteer can't run in a Worker. On-demand capture uses Cloudflare Browser Rendering. Confirmed free allowance (developers.cloudflare.com, Browser Rendering limits): 10 browser-minutes a day and 3 concurrent browsers on Workers Free; past the allowance it returns 429 until the next UTC day, never a charge. At 10–20s per analysis that is roughly 30–60 analyses a day across all members. Without a browser, extraction falls back to HTML/CSS, which gives palette and type but no capture.
- **Quota:** per-member monthly cap on analyses (proposal: 30/month), plus a global daily cap matching the free allowance. When the daily cap is reached, an analysis queues for the next day, and the member is told plainly.
- **Storage:** analyses store captures in Vercel Blob (current host) under a private path, with only the member able to read the URLs through our proxy. Database rows in Neon, keyed to the member.
- **Email:** Resend, already in use for the welcome email (free tier: 3,000/month, 100/day). Watch alerts and the monthly briefing batch to stay inside it.
- **Privacy:** export and account deletion cover analyses, watches and AI keys. Deletion revokes keys.
- **Pricing stays $5/month, $48/year,** flat. Comp grants for the owner and teammate continue.

## Decided

- Core of Pro v2 = goals 1, 2, 3, with the /pro live sample (4) showing them.
- Preview on /pro, not blurred in place, and not a daily unlock.
- New this week as a strip above the grid.

## Left to the builder

- Featured site for the /pro sample (proposal: the site with the richest history).
- Exact MCP tool names and shapes (proposal: `search_sites`, `get_site`, `get_kit`, `analyse_url`).
- Trend metrics beyond fonts/colours/kinds, if the data supports them cleanly.

## Order

1. New this week (free, small).
2. Analyse any site (Browser Rendering binding; allowance confirmed).
3. Library in your AI tools (MCP + keys), reusing 2.
4. Watch + history panel; then the monthly trends briefing.
5. /pro live sample covering all of the above; update the Pro card copy and the welcome email list.
