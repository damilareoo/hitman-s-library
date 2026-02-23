import type { Run, RunStep } from "./types"

// In-memory store for runs (would use DB in production)
const runs: Map<string, Run> = new Map()
const maxRuns = 50

export function createRun(workflowSnapshot?: { nodes: any[]; edges: any[] }): Run {
  const run: Run = {
    id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    status: "running",
    startedAt: new Date().toISOString(),
    steps: [],
    workflowSnapshot,
  }

  runs.set(run.id, run)

  // Keep only last N runs
  if (runs.size > maxRuns) {
    const oldestKey = runs.keys().next().value
    if (oldestKey) runs.delete(oldestKey)
  }

  return run
}

export function addStep(runId: string, step: Omit<RunStep, "status"> & { status?: RunStep["status"] }): void {
  const run = runs.get(runId)
  if (!run) return

  run.steps.push({
    ...step,
    status: step.status || "pending",
  })
}

export function updateStep(runId: string, nodeId: string, updates: Partial<RunStep>): void {
  const run = runs.get(runId)
  if (!run) return

  const stepIndex = run.steps.findIndex((s) => s.nodeId === nodeId)
  if (stepIndex >= 0) {
    run.steps[stepIndex] = { ...run.steps[stepIndex], ...updates }
  }
}

export function completeRun(runId: string, status: "completed" | "failed"): void {
  const run = runs.get(runId)
  if (!run) return

  run.status = status
  run.completedAt = new Date().toISOString()
  run.duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
}

export function getRun(runId: string): Run | undefined {
  return runs.get(runId)
}

export function getAllRuns(): Run[] {
  return Array.from(runs.values()).reverse()
}

export function clearRuns(): void {
  runs.clear()
}
