import { getRun } from "@/lib/runs-store"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = getRun(id)

  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 })
  }

  return Response.json(run)
}
