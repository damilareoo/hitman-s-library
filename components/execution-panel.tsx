"use client"

import { useState } from "react"
import type { Node, Edge } from "@xyflow/react"
import { Play, X, Check, AlertCircle, Loader2, ChevronDown, ChevronRight, RefreshCw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Run, RunStep } from "@/lib/types"

type ExecutionResult = {
  nodeId: string
  type: string
  output: any
  error?: string
}

type IterationLog = {
  iteration: number
  maxIterations: number
  output: string
}

type ExecutionPanelProps = {
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
  onNodeStatusChange?: (nodeId: string, status: "idle" | "running" | "completed" | "error") => void
  onNodeOutputChange?: (nodeId: string, output: any) => void
  onRunComplete?: (run: Run) => void
}

export function ExecutionPanel({
  nodes,
  edges,
  onClose,
  onNodeStatusChange,
  onNodeOutputChange,
  onRunComplete,
}: ExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionLog, setExecutionLog] = useState<ExecutionResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [iterations, setIterations] = useState<IterationLog[]>([])
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set())

  const toggleIteration = (index: number) => {
    setExpandedIterations((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    setExecutionLog([])
    setError(null)
    setCurrentNodeId(null)
    setIterations([])
    setExpandedIterations(new Set())

    const runId = `run-${Date.now()}`
    const runStartedAt = new Date().toISOString()
    const runSteps: RunStep[] = []

    nodes.forEach((node) => {
      if (onNodeStatusChange) onNodeStatusChange(node.id, "idle")
      if (onNodeOutputChange) onNodeOutputChange(node.id, null)
    })

    try {
      const response = await fetch("/api/execute-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      })

      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const update = JSON.parse(line)
            switch (update.type) {
              case "node_start":
                if (onNodeStatusChange && update.nodeId) {
                  onNodeStatusChange(update.nodeId, "running")
                  setCurrentNodeId(update.nodeId)
                  setIterations([])
                  const startNode = nodes.find((n) => n.id === update.nodeId)
                  runSteps.push({
                    nodeId: update.nodeId,
                    nodeType: startNode?.type || "unknown",
                    nodeName: startNode?.data?.label || startNode?.type || "Unknown",
                    status: "running",
                    startedAt: new Date().toISOString(),
                  })
                }
                break
              case "node_iteration":
                if (update.iteration && update.iterationOutput) {
                  setIterations((prev) => [
                    ...prev,
                    {
                      iteration: update.iteration,
                      maxIterations: update.maxIterations,
                      output: update.iterationOutput,
                    },
                  ])
                  setExpandedIterations((prev) => new Set([...prev, update.iteration - 1]))
                }
                break
              case "node_complete":
                if (update.nodeId) {
                  onNodeStatusChange?.(update.nodeId, "completed")
                  onNodeOutputChange?.(update.nodeId, update.output)
                  const node = nodes.find((n) => n.id === update.nodeId)
                  setExecutionLog((prev) => [
                    ...prev,
                    { nodeId: update.nodeId, type: node?.type || "unknown", output: update.output },
                  ])
                  setCurrentNodeId(null)
                  const stepIndex = runSteps.findIndex((s) => s.nodeId === update.nodeId)
                  if (stepIndex !== -1) {
                    const step = runSteps[stepIndex]
                    const completedAt = new Date().toISOString()
                    runSteps[stepIndex] = {
                      ...step,
                      status: "completed",
                      completedAt,
                      duration: step.startedAt
                        ? new Date(completedAt).getTime() - new Date(step.startedAt).getTime()
                        : undefined,
                      output: update.output,
                    }
                  }
                }
                break
              case "node_error":
                if (update.nodeId) onNodeStatusChange?.(update.nodeId, "error")
                const errorNode = nodes.find((n) => n.id === update.nodeId)
                setExecutionLog((prev) => [
                  ...prev,
                  {
                    nodeId: update.nodeId || "unknown",
                    type: errorNode?.type || "unknown",
                    output: null,
                    error: update.error,
                  },
                ])
                setCurrentNodeId(null)
                const errorStepIndex = runSteps.findIndex((s) => s.nodeId === update.nodeId)
                if (errorStepIndex !== -1) {
                  const step = runSteps[errorStepIndex]
                  runSteps[errorStepIndex] = {
                    ...step,
                    status: "error",
                    completedAt: new Date().toISOString(),
                    error: update.error,
                  }
                }
                break
              case "error":
                setError(update.error || "Execution failed")
                break
            }
          } catch {}
        }
      }

      const completedAt = new Date().toISOString()
      const run: Run = {
        id: runId,
        status: error ? "failed" : "completed",
        startedAt: runStartedAt,
        completedAt,
        duration: new Date(completedAt).getTime() - new Date(runStartedAt).getTime(),
        steps: runSteps,
      }
      onRunComplete?.(run)
    } catch (err: any) {
      setError(err.message || "Failed to execute workflow")
      const completedAt = new Date().toISOString()
      const run: Run = {
        id: runId,
        status: "failed",
        startedAt: runStartedAt,
        completedAt,
        duration: new Date(completedAt).getTime() - new Date(runStartedAt).getTime(),
        steps: runSteps,
      }
      onRunComplete?.(run)
    } finally {
      setIsExecuting(false)
    }
  }

  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node?.type || nodeId
  }

  return (
    <aside className="absolute right-0 top-0 z-10 h-full w-96 border-l border-border bg-card md:relative">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Run</h2>
          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">Durable</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        <Button
          data-execute-workflow
          onClick={handleExecute}
          disabled={isExecuting || nodes.length === 0}
          size="sm"
          className="w-full h-9 text-sm"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run
            </>
          )}
        </Button>

      {error && (
        <div className={cn(
          "mt-4 rounded border border-destructive/30 bg-destructive/5 p-3",
          "animate-content-fade animate-shake"
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 animate-icon-bounce" />
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        </div>
      )}

        {(executionLog.length > 0 || currentNodeId || iterations.length > 0) && (
          <div className="mt-4">
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="space-y-3">
                {currentNodeId && (
                  <div className={cn(
                    "rounded border border-primary/30 bg-primary/5 p-3",
                    "animate-node-glow"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 animate-spin-fast text-primary" />
                      <span className="text-sm font-medium text-foreground animate-content-fade">{getNodeLabel(currentNodeId)}</span>
                      {iterations.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto font-mono animate-item-reveal">
                          {iterations.length}/{iterations[0]?.maxIterations || "?"}
                        </span>
                      )}
                    </div>

                    {iterations.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        {iterations.map((iter, index) => (
                          <div key={index} className="border border-border/50 rounded bg-background/50">
                            <button
                              onClick={() => toggleIteration(index)}
                              className="w-full flex items-center gap-2 p-2 text-left hover:bg-secondary/30 transition-colors"
                            >
                              {expandedIterations.has(index) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-xs font-medium text-muted-foreground font-mono">
                                Iteration {iter.iteration}
                              </span>
                              {index === iterations.length - 1 && (
                                <span className="text-xs text-primary ml-auto">latest</span>
                              )}
                            </button>
                            {expandedIterations.has(index) && (
                              <div className="px-3 pb-3">
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                                  {iter.output}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {executionLog.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded border p-3 transition-all duration-300",
                      result.error 
                        ? "border-destructive/30 bg-destructive/5 animate-content-fade" 
                        : "border-border bg-secondary/30 animate-content-fade",
                      "stagger-item"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      {result.error ? (
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 animate-icon-bounce" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600 mt-0.5 animate-checkmark" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">{getNodeLabel(result.nodeId)}</span>
                        {result.error ? (
                          <p className="text-xs text-destructive mt-1.5">{result.error}</p>
                        ) : (
                          <pre className="mt-1.5 text-xs text-muted-foreground overflow-hidden whitespace-pre-wrap break-words max-h-32 font-mono">
                            {typeof result.output === "string"
                              ? result.output
                              : typeof result.output === "object" && result.output?.result
                                ? result.output.result
                                : JSON.stringify(result.output, null, 2)}
                          </pre>
                        )}
                        {result.output?.iterations && (
                          <p className="text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-border/50 font-mono">
                            Completed in {result.output.iterations} iteration{result.output.iterations > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {executionLog.length === 0 && !error && !isExecuting && !currentNodeId && (
          <div className="mt-6 text-center space-y-3 animate-content-fade">
            <div className="flex justify-center">
              <Play className="h-8 w-8 text-primary/50 animate-icon-bounce" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Click Run to execute</p>
              <p className="text-xs text-muted-foreground/70 mt-2">Powered by Vercel Workflow</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
