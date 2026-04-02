# Bulk Add / Queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user paste multiple URLs in the admin and process them one-by-one, showing a live progress list.

**Architecture:** All changes are in `app/admin/page.tsx`. A textarea accepts newline-separated URLs. On submit, the existing `/api/design/extract` endpoint is called sequentially (never in parallel — Puppeteer memory). Each item in the queue tracks its own status. The existing single-URL flow is kept unchanged below the bulk section.

**Tech Stack:** Next.js 16 App Router, React 19, Phosphor icons, existing extract API

---

## File Map

| File | What changes |
|------|-------------|
| `app/admin/page.tsx` | Add `BulkAdd` component + queue state management |

---

## Task 1: Queue Type + BulkAdd Component

**Files:**
- Modify: `app/admin/page.tsx`

**Context:** The admin page currently has a single-URL input (`linkInput`, `handleAdd`). We add a collapsible "Bulk add" section above it. The queue is local state — a list of `QueueItem` objects processed sequentially. Each item shows a status icon (pending gray dot → spinning → green check / amber warning).

`classifyExtractionError` is already imported. The existing `STAGES` array and stage timer pattern from `handleAdd` are reused per item.

- [ ] **Step 1: Add the QueueItem type near the top of the file**

After the `Site` interface, add:

```tsx
interface QueueItem {
  url: string
  status: 'pending' | 'processing' | 'done' | 'error'
  message: string | null
}
```

- [ ] **Step 2: Add bulk state to AdminPage**

Inside `AdminPage`, after the existing state declarations, add:

```tsx
const [bulkInput, setBulkInput] = useState('')
const [queue, setQueue] = useState<QueueItem[]>([])
const [isRunningQueue, setIsRunningQueue] = useState(false)
const [bulkOpen, setBulkOpen] = useState(false)
```

- [ ] **Step 3: Add processQueue function**

After `handleDelete`, add:

```tsx
const processQueue = async (items: QueueItem[]) => {
  setIsRunningQueue(true)
  for (let i = 0; i < items.length; i++) {
    setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q))
    try {
      const res = await fetch('/api/design/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: items[i].url, notes: '' }),
      })
      const data = await res.json()
      if (data.isDuplicate) {
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', message: 'Already in collection' } : q))
      } else if (data.success || data.id) {
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', message: 'Added' } : q))
      } else {
        const msg = data.error ? classifyExtractionError(data.error).label : 'Failed'
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', message: msg } : q))
      }
    } catch {
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', message: 'Connection error' } : q))
    }
  }
  setIsRunningQueue(false)
  await loadSites()
}

const handleBulkSubmit = () => {
  const urls = bulkInput
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0)
  if (!urls.length || isRunningQueue) return
  const items: QueueItem[] = urls.map(url => ({ url, status: 'pending', message: null }))
  setQueue(items)
  setBulkInput('')
  processQueue(items)
}
```

- [ ] **Step 4: Add the Bulk Add UI section**

In the JSX, add this section before the existing "Add Site" section:

```tsx
{/* Bulk add */}
<div className="space-y-3">
  <button
    onClick={() => setBulkOpen(p => !p)}
    className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors"
  >
    <span>{bulkOpen ? '▾' : '▸'}</span> Bulk Add
  </button>

  {bulkOpen && (
    <div className="space-y-2">
      <textarea
        placeholder={"https://stripe.com\nhttps://linear.app\nhttps://vercel.com"}
        value={bulkInput}
        onChange={e => setBulkInput(e.target.value)}
        disabled={isRunningQueue}
        rows={4}
        className="w-full px-3 py-2 text-[12px] font-mono bg-muted border border-border/60 rounded-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground/40 disabled:opacity-60 resize-none"
      />
      <button
        onClick={handleBulkSubmit}
        disabled={isRunningQueue || !bulkInput.trim()}
        className="h-9 px-4 text-[12px] font-medium bg-foreground text-background rounded-sm disabled:opacity-40 hover:opacity-85 transition-opacity"
      >
        {isRunningQueue ? 'Processing…' : `Add ${bulkInput.split('\n').filter(u => u.trim()).length} URLs →`}
      </button>
    </div>
  )}

  {/* Queue progress */}
  {queue.length > 0 && (
    <div className="space-y-px">
      {queue.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-[3px]">
          <span className="shrink-0">
            {item.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 inline-block" />}
            {item.status === 'processing' && <CircleNotch className="w-3 h-3 animate-spin text-muted-foreground" weight="bold" />}
            {item.status === 'done' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
            {item.status === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
          </span>
          <span className="text-[12px] font-mono text-muted-foreground truncate flex-1">{getDomain(item.url)}</span>
          {item.message && (
            <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{item.message}</span>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify in browser**

Run `bun dev`. Go to `/admin`, authenticate. Click "Bulk Add" to expand. Paste 3 URLs (one per line). Click the button. Verify:
- Each URL shows a spinning icon while processing
- Done items show a green dot + "Added" or "Already in collection"
- Failed items show an amber dot + error label
- Site list refreshes when queue completes

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: bulk add queue in admin with sequential processing and live status"
```
