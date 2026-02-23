import { getAllRuns, clearRuns } from "@/lib/runs-store"

export async function GET() {
  const runs = getAllRuns()
  return Response.json(runs)
}

export async function DELETE() {
  clearRuns()
  return Response.json({ success: true })
}
