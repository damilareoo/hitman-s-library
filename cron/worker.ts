// cron/worker.ts
// Cloudflare cron triggers deliver a `scheduled` event, not an HTTP request,
// and the OpenNext entrypoint only implements `fetch`. This companion worker
// is the scheduler: it holds CRON_SECRET as its own secret (never in config)
// and calls the app over a service binding, so it works with or without the
// custom domain attached.
interface CronEnv {
  APP: {
    fetch(input: string | Request, init?: RequestInit): Promise<Response>
  }
  CRON_SECRET: string
}

interface CronEvent {
  /** The cron expression that fired, exactly as written in wrangler.toml. */
  cron: string
}

interface CronExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

// UTC schedules carried over from vercel.json. `/api/cron/backfill` (0 3 * * *)
// is left off the trigger list: browser extraction cannot run on this runtime
// yet, so the repair job would spend every night failing to capture.
const ROUTES: Record<string, string[]> = {
  '0 8 * * 1': ['/api/cron/digest'],
}

export default {
  // Only here because `wrangler dev` refuses to fire a scheduled event against
  // an entrypoint without a fetch handler. It never runs a job.
  async fetch(): Promise<Response> {
    return new Response('hitmans-library scheduler\n')
  },

  async scheduled(event: CronEvent, env: CronEnv, ctx: CronExecutionContext): Promise<void> {
    for (const path of ROUTES[event.cron] ?? []) {
      ctx.waitUntil(fire(path, env))
    }
  },
}

async function fire(path: string, env: CronEnv): Promise<void> {
  try {
    const res = await env.APP.fetch(`https://hitmans-library${path}`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })
    const body = await res.text()
    console.log(`[cron] ${path} -> ${res.status} ${body.slice(0, 300)}`)
  } catch (err) {
    console.error(`[cron] ${path} failed:`, err instanceof Error ? err.message : err)
  }
}
