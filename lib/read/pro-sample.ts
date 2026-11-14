// lib/read/pro-sample.ts
// Live data for the Pro page's examples: this month's trend findings. (The AI
// tools before/after is rendered from a real run: scripts/render-ai-example.ts.)
import { trendsCached } from '@/lib/trends/load'
import { findings } from '@/lib/email/trends-briefing'

export interface ProSample { trends: string[] }

export async function loadProSample(): Promise<ProSample> {
  return { trends: await trendsCached().then(findings).catch(() => [] as string[]) }
}
