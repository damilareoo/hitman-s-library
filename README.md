# Hitman's Library

A personal design library for collecting, analyzing, and browsing websites — extracting colors, typography, assets, and full-page screenshots automatically.

**Live:** https://mars-hitman-library.vercel.app

---

## What it does

When you add a URL, the app:
1. Launches a headless browser and captures a full-page screenshot
2. Extracts the dominant color palette (HEX + OKLCH)
3. Identifies typography roles (heading, body, mono)
4. Collects SVG/image assets
5. Stores everything in a database for instant browsing

---

## Features

- **Card grid** — Browse all sites with staggered card entrances, filter by category
- **Detail panel** — Click any site to see preview, colors, type, and assets in a wide inspector with a sliding tab underline
- **Keyboard** — `/` focuses search, `P` opens presentation mode, arrow keys cycle tabs and slides
- **Full-page preview** — Scrollable screenshot in a bounded panel with back-to-top button; Desktop/Mobile toggle when mobile screenshot is available
- **Color extraction** — HEX and OKLCH values, copy-paste ready, sorted by lightness
- **Typography** — Font family, role, weight, and Google Fonts link
- **Assets** — SVG logos, icons, and images
- **Re-extract** — Re-run extraction for any site from the detail panel footer
- **Theme switch** — Light/dark toggle with animated icon transition
- **Sound effects** — Subtle UI sounds, toggleable via header
- **Failure messaging** — Categorised error states (bot protection, login required, timeout, 404) with plain-language explanations
- **Extraction progress** — Animated stage labels while a URL is being processed
- **Bulk add** — Paste multiple URLs in admin and process them sequentially with live per-item status
- **Changelog** — `/changelog` feed showing all additions, re-extractions, and deletions
- **Color export** — Copy palette as CSS custom properties or Tailwind config snippet
- **Admin CMS** — Passcode-protected admin at `/admin` to add, search, and delete sites; bulk duplicate removal

---

## Design system

The UI runs on a small token system defined in `app/globals.css`:

- **Type scale** — micro 10px / meta 11px / ui 12px / body 13px / title 14px; nothing in the UI renders below 10px
- **Ink levels** — foreground at 100 / 62 / 40 / 24 percent, replacing ad-hoc text opacities
- **Edges** — border at 70 / 50 / 30 percent for structural, default, and faint hairlines
- **Radius** — 4px for boxes, full for pills and swatches
- **Motion** — one easing (`cubic-bezier(0.22, 1, 0.36, 1)`) with tokenized durations (120 / 200 / 300 / 450 ms), mirrored in `lib/motion.ts` for motion/react

Shared primitives live in `components/ui` (Spinner, SectionLabel) and `lib/use-copied.ts` (copy feedback).

---

## Tech stack

- **Framework:** Next.js 16 App Router (React 19)
- **Styling:** Tailwind CSS v4
- **Animations:** motion (Framer Motion v11)
- **Database:** Neon PostgreSQL (serverless)
- **Storage:** Vercel Blob (screenshots)
- **Browser:** Puppeteer + Sparticuz Chromium (Lambda-compatible)
- **Package manager:** bun

---

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `ADMIN_PASSWORD` | Passcode for `/admin` access |

---

## Development

```bash
bun install
bun run dev
```

Build:

```bash
bun run build
```
