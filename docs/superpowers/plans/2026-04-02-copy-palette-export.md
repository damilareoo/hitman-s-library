# Copy Palette Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Export" dropdown to the colors tab that copies the palette as CSS custom properties or a Tailwind config snippet.

**Architecture:** Self-contained change to `components/colors-tab.tsx`. No new API, no DB changes. The `colors` array already contains all hex/oklch values needed. Export generates a string, copies to clipboard, shows brief confirmation.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Phosphor icons, existing `CopyBtn` pattern

---

## File Map

| File | What changes |
|------|-------------|
| `components/colors-tab.tsx` | Add `ExportMenu` component + export format generators |

---

## Task 1: Export Format Generators + Export Button

**Files:**
- Modify: `components/colors-tab.tsx`

**Context:** `ColorsTab` receives `colors: ColorRow[]` where each row has `hex_value` and `oklch`. The existing `CopyBtn` copies a single value. We need a separate export button that generates multi-line output.

The export button sits next to the existing HEX/OKLCH toggle in the header row. Clicking it opens a small dropdown with two options: "CSS variables" and "Tailwind config". Selecting one copies to clipboard and shows a ✓ flash.

- [ ] **Step 1: Add `exportFormat` state and generator functions**

Inside `ColorsTab`, after the `format` state declaration, add:

```tsx
const [exportCopied, setExportCopied] = useState<'css' | 'tailwind' | null>(null)

function buildCssVars(): string {
  return sorted.map((c, i) => `  --color-${i + 1}: ${c.hex_value};`).join('\n')
}

function buildTailwind(): string {
  const entries = sorted.map((c, i) => `      '${i + 1}': '${c.hex_value}',`).join('\n')
  return `extend: {\n  colors: {\n    brand: {\n${entries}\n    },\n  },\n}`
}

async function copyExport(type: 'css' | 'tailwind') {
  const text = type === 'css'
    ? `:root {\n${buildCssVars()}\n}`
    : buildTailwind()
  await navigator.clipboard.writeText(text)
  setExportCopied(type)
  setTimeout(() => setExportCopied(null), 1500)
}
```

- [ ] **Step 2: Add the export button to the header row**

In the header row `<div className="flex items-center justify-between mb-1">`, add an export dropdown after the existing pill count badge:

```tsx
<div className="relative">
  <div className="flex bg-secondary border border-border rounded overflow-hidden">
    <button
      onClick={() => copyExport('css')}
      className={`text-[9px] font-mono px-2 py-0.5 transition-colors ${exportCopied === 'css' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {exportCopied === 'css' ? '✓ CSS' : 'CSS'}
    </button>
    <button
      onClick={() => copyExport('tailwind')}
      className={`text-[9px] font-mono px-2 py-0.5 border-l border-border transition-colors ${exportCopied === 'tailwind' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {exportCopied === 'tailwind' ? '✓ TW' : 'TW'}
    </button>
  </div>
</div>
```

Place this between the HEX/OKLCH toggle and the count badge.

- [ ] **Step 3: Verify in browser**

Run `bun dev`. Open any site with colors extracted. In the colors tab you should see `CSS` and `TW` buttons next to the HEX/OKLCH toggle. Click `CSS` — paste into a text editor and verify it looks like:

```css
:root {
  --color-1: #0a0a0a;
  --color-2: #ffffff;
  ...
}
```

Click `TW` — paste and verify:

```js
extend: {
  colors: {
    brand: {
      '1': '#0a0a0a',
      ...
    },
  },
}
```

- [ ] **Step 4: Commit**

```bash
git add components/colors-tab.tsx
git commit -m "feat: export palette as CSS variables or Tailwind config"
```
