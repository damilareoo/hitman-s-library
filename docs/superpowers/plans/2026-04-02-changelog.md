# Changelog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/changelog` page that shows a reverse-chronological feed of additions, re-extractions, and deletions across the library.

**Architecture:** New `design_changelog` DB table logs events. The three API routes that mutate data (`extract`, reextract, `delete`) each write a changelog row. A new page + API read and display the feed. No new dependencies.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Neon PostgreSQL, Phosphor icons

---

## File Map

| File | What changes |
|------|-------------|
| `scripts/008-changelog.sql` | New migration — creates `design_changelog` table |
| `app/api/design/extract/route.ts` | Write changelog row on successful add |
| `app/api/design/[id]/reextract/route.ts` | Write changelog row on re-extract |
| `app/api/design/delete/route.ts` | Write changelog row on delete |
| `app/api/changelog/route.ts` | **New** — GET endpoint, returns paginated feed |
| `app/changelog/page.tsx` | **New** — client page rendering the feed |

---

## Task 1: Database Migration

**Files:**
- Create: `scripts/008-changelog.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE IF NOT EXISTS design_changelog (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER REFERENCES design_sources(id) ON DELETE SET NULL,
  source_url  TEXT NOT NULL,
  source_name TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('added', 'reextracted', 'deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_changelog_created_at_idx ON design_changelog (created_at DESC);
```

- [ ] **Step 2: Run the migration against the Neon DB**

```bash
psql $DATABASE_URL -f scripts/008-changelog.sql
```

Expected output: `CREATE TABLE` and `CREATE INDEX`.

- [ ] **Step 3: Commit**

```bash
git add scripts/008-changelog.sql
git commit -m "feat(db): add design_changelog table"
```

---

## Task 2: Write Changelog Rows on Mutations

**Files:**
- Modify: `app/api/design/extract/route.ts`
- Modify: `app/api/design/[id]/reextract/route.ts`  
- Modify: `app/api/design/delete/route.ts`

**Context:** Each mutation knows `sourceId`, `source_url`, and `source_name`. We insert a row after a successful operation. `ON DELETE SET NULL` means deleted rows leave a tombstone in the log with `source_id = NULL` but the URL and name are preserved.

- [ ] **Step 1: Add changelog insert to extract/route.ts**

Find the block in `extract/route.ts` where the new `sourceId` is returned (around line 244 — the `INSERT INTO design_sources`). After confirming success and getting `sourceId`, add:

```ts
await sql`
  INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
  VALUES (${sourceId}, ${url}, ${sourceName}, 'added')
`
```

Where `sourceName` is whatever the route already resolves as the site title.

- [ ] **Step 2: Add changelog insert to reextract route**

In `app/api/design/[id]/reextract/route.ts`, after a successful re-extraction (when `screenshot_url` is updated), add a new SELECT then the insert. **Note:** The existing initial fetch at the top of `reextract/route.ts` selects `id, source_url` but NOT `source_name` — do not reuse that result. Add a new dedicated query as shown:

```ts
const [source] = await sql`SELECT source_url, source_name FROM design_sources WHERE id = ${id}`
await sql`
  INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
  VALUES (${id}, ${source.source_url}, ${source.source_name}, 'reextracted')
`
```

- [ ] **Step 3: Add changelog insert to delete route**

In `app/api/design/delete/route.ts`, read the source name/url *before* deleting (so it's still available), then insert:

```ts
const [source] = await sql`SELECT source_url, source_name FROM design_sources WHERE id = ${id}`
// ... existing DELETE ...
await sql`
  INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
  VALUES (NULL, ${source.source_url}, ${source.source_name}, 'deleted')
`
```

- [ ] **Step 4: Commit**

```bash
git add app/api/design/extract/route.ts app/api/design/[id]/reextract/route.ts app/api/design/delete/route.ts
git commit -m "feat: write changelog rows on add, re-extract, and delete"
```

---

## Task 3: Changelog API

**Files:**
- Create: `app/api/changelog/route.ts`

**Auth note:** This endpoint is intentionally public — it only exposes site names and timestamps, not private data. If you later want to restrict it, add a middleware check against `ADMIN_PASSWORD` session cookie. For now, no auth is applied.

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(new URL(req.url).searchParams.get('offset') ?? '0')

  try {
    const rows = await sql`
      SELECT id, source_id, source_url, source_name, event_type, created_at
      FROM design_changelog
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const total = await sql`SELECT COUNT(*) as count FROM design_changelog`
    return NextResponse.json({ events: rows, total: Number(total[0].count) })
  } catch (err) {
    console.error('[changelog]', err)
    return NextResponse.json({ events: [], total: 0 }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/changelog/route.ts
git commit -m "feat: add GET /api/changelog endpoint"
```

---

## Task 4: Changelog Page

**Files:**
- Create: `app/changelog/page.tsx`

**Context:** Minimal client page. Each event shows: relative time (e.g. "2h ago"), event type badge ("added" green / "reextracted" blue / "deleted" red/muted), site name, and domain. Paginated with a "Load more" button. Link back to gallery in header.

- [ ] **Step 1: Write the page**

```tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

interface ChangelogEvent {
  id: number
  source_id: number | null
  source_url: string
  source_name: string
  event_type: 'added' | 'reextracted' | 'deleted'
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

const EVENT_STYLES = {
  added:       'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  reextracted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  deleted:     'bg-muted text-muted-foreground',
}

export default function ChangelogPage() {
  const [events, setEvents] = useState<ChangelogEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (offset = 0, append = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/changelog?limit=50&offset=${offset}`)
      const data = await res.json()
      setEvents(prev => append ? [...prev, ...data.events] : data.events)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-medium tracking-[-0.01em]">Hitman's Library</h1>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-[3px]">
              Changelog
            </span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" weight="regular" />
            Gallery
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 md:px-7 py-8">
        {loading && events.length === 0 ? (
          <div className="flex justify-center py-16">
            <span className="text-[12px] font-mono text-muted-foreground">Loading…</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-[13px] font-mono text-muted-foreground">No events yet.</p>
        ) : (
          <>
            <div className="space-y-px">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-4 py-3 border-b border-border/30">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[3px] shrink-0 ${EVENT_STYLES[ev.event_type]}`}>
                    {ev.event_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate tracking-[-0.01em]">{ev.source_name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">{getDomain(ev.source_url)}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">{timeAgo(ev.created_at)}</span>
                </div>
              ))}
            </div>

            {events.length < total && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => load(events.length, true)}
                  disabled={loading}
                  className="h-8 px-4 text-[12px] font-mono border border-border/60 rounded-sm hover:bg-muted transition-colors disabled:opacity-40"
                >
                  {loading ? 'Loading…' : `Load more (${total - events.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add changelog link to admin header**

In `app/admin/page.tsx`, in the header next to the "Gallery" link, add:

```tsx
<Link
  href="/changelog"
  className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
>
  Changelog
</Link>
```

- [ ] **Step 3: Verify in browser**

1. Add a new site via admin. Visit `/changelog` — the "added" event should appear at the top.
2. Re-extract a site — "reextracted" event appears.
3. Delete a site — "deleted" event appears with `source_id = null` but name/URL preserved.

- [ ] **Step 4: Commit**

```bash
git add app/changelog/page.tsx app/admin/page.tsx
git commit -m "feat: changelog page at /changelog with add/reextract/delete events"
```

---

## Task 5: Deploy

```bash
git push origin main
```

Vercel deploys automatically. No new env vars required.
