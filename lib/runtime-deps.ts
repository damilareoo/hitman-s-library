// lib/runtime-deps.ts
//
// Opaque lazy loader for packages the Cloudflare Worker cannot bundle.
//
// A literal (or constant-foldable) import() specifier is visible to bundlers:
// Turbopack turns it into an external-import record, and the OpenNext build
// inlines that record back into the Worker bundle — pulling native binaries
// (puppeteer's Chromium bindings, sharp's .node, onnxruntime) that have no
// loader under the workerd conditions. A Function-constructor body is a plain
// string to every bundler and tracer, so the specifier never enters the
// bundle graph at all.
//
// On Node (Vercel, local) the constructor works and the real package loads;
// on workerd code generation from strings is blocked, the call throws, and
// this loader reports null so callers degrade instead of crashing the boot.
let dynamicImport: ((specifier: string) => Promise<any>) | null = null
try {
  dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>
} catch {
  dynamicImport = null
}

export async function loadRuntimeDep(specifier: string): Promise<any> {
  if (!dynamicImport) return null
  try {
    const mod = await dynamicImport(specifier)
    return mod?.default ?? mod
  } catch (err) {
    console.warn(`[runtime] ${specifier} unavailable on this runtime:`, err instanceof Error ? err.message : err)
    return null
  }
}
