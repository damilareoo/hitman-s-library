// lib/similarity.ts
// Visual similarity search (Phase 2). Server-only: imports the lazy db client
// and loads the CLIP model on demand. Nothing here is imported by client
// components — the flag below is the only thing the UI reads, via the
// NEXT_PUBLIC var, which is safe to inline in the browser.
//
// One embedding per site, fixed layout, cosine distance:
//
//   [ CLIP image 512 | palette hist 52 | font hash 32 | kind one-hot 9 ] = 605
//
// Blocks are normalized individually then scaled by weight, so cosine
// reflects the intended mix: the screenshot leads, palette supports, fonts
// and kind break ties. Thresholds and weights are initial values pending the
// 10-site human-agreement check in the Phase 2 acceptance.
import { getSql } from '@/lib/db'
import { parse } from 'culori'
import { KINDS, UNSORTED } from './categories'
// Single source for the flag is lib/drift (client-safe); re-exported here
// so server callers keep one import.
import { SIMILAR_ENABLED } from './drift'
export { SIMILAR_ENABLED }

export const IMG_DIMS = 512
export const PAL_HUE_BINS = 12
export const PAL_LIGHT_BINS = 4
export const PAL_ACHRO_BINS = 4
export const PAL_DIMS = PAL_HUE_BINS * PAL_LIGHT_BINS + PAL_ACHRO_BINS
export const FONT_DIMS = 32
export const KIND_DIMS = KINDS.length + 1
export const EMBED_DIMS = IMG_DIMS + PAL_DIMS + FONT_DIMS + KIND_DIMS

const W_IMAGE = 0.55
const W_PALETTE = 0.3
const W_FONT = 0.1
const W_KIND = 0.05

export interface PaletteInput {
  hex: string
  oklch: string
  areaShare?: number | null
}

export interface FontInput {
  fontFamily: string
  role: string
}

/** FNV-1a — stable across runs, so bucket assignment never shifts. */
function hashFamily(family: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < family.length; i++) {
    h ^= family.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) % FONT_DIMS
}

function l2norm(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  if (n === 0) return v
  return v.map(x => x / n)
}

/**
 * OKLCH palette histogram, area-weighted when shares exist. Achromatic
 * colors (chroma < 0.03) carry no hue information, so they get their own
 * lightness bins instead of smearing across the wheel.
 */
export function paletteHistogram(palette: PaletteInput[]): number[] {
  const hist = new Array(PAL_DIMS).fill(0)
  if (palette.length === 0) return hist
  const measured = palette.some(p => typeof p.areaShare === 'number')
  const total = measured ? palette.reduce((s, p) => s + (p.areaShare ?? 0), 0) : 0
  for (const p of palette) {
    const weight = measured && total > 0 ? (p.areaShare ?? 0) / total : 1 / palette.length
    let c: any = null
    try {
      c = parse(p.oklch || p.hex)
    } catch {
      c = null
    }
    if (!c || c.mode !== 'oklch') continue
    const l = typeof c.l === 'number' ? Math.min(Math.max(c.l, 0), 1) : 0.5
    const chroma = typeof c.c === 'number' ? c.c : 0
    const lightBin = Math.min(PAL_LIGHT_BINS - 1, Math.floor(l * PAL_LIGHT_BINS))
    if (chroma < 0.03 || typeof c.h !== 'number' || Number.isNaN(c.h)) {
      hist[PAL_HUE_BINS * PAL_LIGHT_BINS + lightBin] += weight
    } else {
      const hueBin = Math.min(PAL_HUE_BINS - 1, Math.floor(((c.h % 360) + 360) % 360 / 30))
      hist[hueBin * PAL_LIGHT_BINS + lightBin] += weight
    }
  }
  return hist
}

export function fontVector(fonts: FontInput[]): number[] {
  const v = new Array(FONT_DIMS).fill(0)
  for (const f of fonts) {
    if (!f.fontFamily) continue
    v[hashFamily(f.fontFamily.toLowerCase().trim())] += 1
  }
  return l2norm(v)
}

export function kindVector(kind: string | null): number[] {
  const v = new Array(KIND_DIMS).fill(0)
  const idx = [...KINDS, UNSORTED].indexOf((kind || UNSORTED) as any)
  v[idx >= 0 ? idx : KIND_DIMS - 1] = 1
  return v
}

/** Fuse blocks into one vector. imageFeatures must be L2-normalized 512-d. */
export function buildEmbedding(args: {
  palette: PaletteInput[]
  fonts: FontInput[]
  kind: string | null
  imageFeatures: number[] | null
}): number[] {
  const img = args.imageFeatures && args.imageFeatures.length === IMG_DIMS
    ? l2norm(args.imageFeatures)
    : new Array(IMG_DIMS).fill(0)
  // Histogram is L1 by construction; scale into the mix directly.
  const out = [
    ...img.map(x => x * W_IMAGE),
    ...paletteHistogram(args.palette).map(x => x * W_PALETTE),
    ...fontVector(args.fonts).map(x => x * W_FONT),
    ...kindVector(args.kind).map(x => x * W_KIND),
  ]
  if (out.length !== EMBED_DIMS) throw new Error(`embedding dim mismatch: ${out.length}`)
  return out
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.map(x => (Number.isFinite(x) ? x : 0).toFixed(6)).join(',')}]`
}

// ---------------------------------------------------------------------------
// Image features (CLIP). Lazy singleton, timeout-guarded, never throws.
// ---------------------------------------------------------------------------

let pipelinePromise: Promise<any> | null = null

function getPipeline(): Promise<any> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import('@xenova/transformers')
      return pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32')
    })().catch(err => {
      pipelinePromise = null
      throw err
    })
  }
  return pipelinePromise
}

/**
 * 512-d CLIP features for a screenshot URL, or null when the model cannot
 * be loaded in budget (cold serverless start) or the fetch fails. Callers
 * store a structured-only vector in that case; the backfill upgrades it.
 */
export async function getImageFeatures(
  screenshotUrl: string | null,
  timeoutMs = Number(process.env.EMBED_IMAGE_TIMEOUT_MS ?? 25000),
): Promise<number[] | null> {
  if (!screenshotUrl) return null
  try {
    const Timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
    const work = (async (): Promise<number[] | null> => {
      const pipe = await getPipeline()
      const out = await pipe(screenshotUrl)
      const data: number[] = Array.from(out.data ?? out)
      if (data.length !== IMG_DIMS) return null
      return l2norm(data)
    })()
    return await Promise.race([work, Timeout])
  } catch {
    return null
  }
}

export async function embedSite(args: {
  palette: PaletteInput[]
  fonts: FontInput[]
  kind: string | null
  screenshotUrl: string | null
  /**
   * When the CLIP model cannot load in budget (cold serverless start), reuse
   * the site's stored image block instead of zeroing it — otherwise every
   * re-extract would degrade a full vector to structured-only until the next
   * backfill. New sites have nothing stored and correctly get zeros.
   */
  siteId?: number | null
}): Promise<number[]> {
  let imageFeatures = await getImageFeatures(args.screenshotUrl)
  if (!imageFeatures && args.siteId != null) {
    imageFeatures = await existingImageFeatures(args.siteId)
  }
  return buildEmbedding({
    palette: args.palette,
    fonts: args.fonts,
    kind: args.kind,
    imageFeatures,
  })
}

/** The stored image block for a site, or null when absent/empty. */
export async function existingImageFeatures(siteId: number): Promise<number[] | null> {
  try {
    const rows = await sql`SELECT embedding::text AS embedding FROM design_sources WHERE id = ${siteId}`
    const raw = rows[0]?.embedding
    if (typeof raw !== 'string' || !raw.startsWith('[')) return null
    const v = raw.slice(1, -1).split(',').map(Number)
    if (v.length !== EMBED_DIMS || v.some(n => !Number.isFinite(n))) return null
    const block = v.slice(0, IMG_DIMS)
    const norm = Math.sqrt(block.reduce((s, x) => s + x * x, 0))
    return norm > 1e-6 ? block : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Nearest neighbors.
// ---------------------------------------------------------------------------

const sql = getSql()

export interface SimilarHit {
  id: number
  distance: number
}

/** Raw embedding literal for one site, or null when missing. */
async function targetEmbedding(siteId: number): Promise<string | null> {
  try {
    const rows = await sql`SELECT embedding::text AS embedding FROM design_sources WHERE id = ${siteId}`
    const raw = rows[0]?.embedding
    return typeof raw === 'string' && raw.startsWith('[') ? raw : null
  } catch (err) {
    console.error('[similarity] target embedding failed:', err)
    return null
  }
}

/**
 * k nearest ids by cosine distance, self excluded. Empty when unevaluatable.
 *
 * Two steps on purpose: the target vector goes in as a constant parameter so
 * the planner can use the HNSW index. Inlining it as a subselect (the
 * obvious one-query shape) plans as seqscan + sort — verified with EXPLAIN.
 */
/**
 * Captures under this size are failed frames or salvaged og:images, and they
 * embed as near-identical "empty" vectors — without the guard they surface
 * as each other's neighbors. Calibrated 2026-10-14: 12 captures sit at or
 * under ~35KB (incl. a verified-blank Dropbox capture at 32KB) while the
 * next band starts at 39KB and the library median is ~426KB. NULL (unmeasured)
 * stays eligible so the guard only ever narrows.
 */
export const MIN_CAPTURE_BYTES = 35000

export async function similarIds(siteId: number, k: number): Promise<SimilarHit[]> {
  try {
    const target = await targetEmbedding(siteId)
    if (!target) return []
    // Over-fetch: the guard filters after ranking, so ask for more and trim.
    const rows = await sql.query(
      `SELECT id, (embedding <=> $2::vector) AS distance
       FROM design_sources
       WHERE id != $1 AND embedding IS NOT NULL
         AND COALESCE(metadata->>'screenshot_source', 'capture') != 'og'
         AND COALESCE(screenshot_bytes, 999999999) > $3
       ORDER BY embedding <=> $2::vector
       LIMIT $4`,
      [siteId, target, MIN_CAPTURE_BYTES, k * 2],
    )
    return rows
      .map((r: any) => ({ id: Number(r.id), distance: Number(r.distance) }))
      .slice(0, k)
  } catch (err) {
    console.error('[similarity] neighbor query failed:', err)
    return []
  }
}

/**
 * Full card rows for the neighbor grid: the open site plus its k nearest,
 * order-preserved. Distances ride along for debugging; the grid ignores them.
 */
export async function querySimilar(
  siteId: number,
  k: number,
): Promise<{
  site: import('./design-queries').DesignRecord | null
  neighbors: Array<import('./design-queries').DesignRecord & { distance: number | null }>
}> {
  const { queryDesignsByIds } = await import('./design-queries')
  const hits = await similarIds(siteId, k)
  const rows = await queryDesignsByIds([siteId, ...hits.map(h => h.id)])
  const byId = new Map(rows.map(r => [Number(r.id), r]))
  const distanceById = new Map(hits.map(h => [h.id, h.distance]))
  return {
    site: byId.get(siteId) ?? null,
    neighbors: hits
      .map(h => {
        const row = byId.get(h.id)
        return row ? { ...row, distance: distanceById.get(h.id) ?? null } : null
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r)),
  }
}
