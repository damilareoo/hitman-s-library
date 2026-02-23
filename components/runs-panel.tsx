"use client"

import { useState } from "react"
import { X, Check, AlertCircle, Loader2, ChevronDown, ChevronRight, Clock, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Run, RunStep } from "@/lib/types"
import { formatDuration, formatTime } from "@/lib/utils"

function StepRow({
  step,
  isExpanded,
  onToggle,
}: {
  step: RunStep
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-l border-border ml-2 pl-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-secondary/30 rounded transition-colors"
      >
        {step.status === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : step.status === "completed" ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : step.status === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-muted-foreground" />
        )}

        <span className="text-sm font-medium text-foreground flex-1">{step.nodeName || step.nodeType}</span>

        {step.duration !== undefined && (
          <span className="text-xs text-muted-foreground font-mono">{formatDuration(step.duration)}</span>
        )}

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="pb-3 space-y-3">
          {step.input !== undefined && (
            <div className="bg-secondary/30 rounded p-3">
              <div className="text-xs text-muted-foreground mb-1.5">Input</div>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {typeof step.input === "string" ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {step.output !== undefined && (
            <div className="bg-secondary/30 rounded p-3">
              <div className="text-xs text-muted-foreground mb-1.5">Output</div>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                {typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}

          {step.error && (
            <div className="bg-destructive/10 rounded p-3">
              <div className="text-xs text-destructive mb-1.5">Error</div>
              <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{step.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RunDetail({ run, onBack }: { run: Run; onBack: () => void }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (nodeId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="text-xs font-mono text-muted-foreground">{run.id.substring(0, 20)}...</div>
        </div>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            run.status === "completed"
              ? "bg-green-500/10 text-green-500"
              : run.status === "failed"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
          }`}
        >
          {run.status}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border bg-secondary/20 shrink-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {formatTime(run.startedAt)}
          </div>
          {run.duration !== undefined && <div className="font-mono">{formatDuration(run.duration)}</div>}
          <div>
            {run.steps.length} step{run.steps.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-1.5">
          {run.steps.map((step) => (
            <StepRow
              key={step.nodeId}
              step={step}
              isExpanded={expandedSteps.has(step.nodeId)}
              onToggle={() => toggleStep(step.nodeId)}
            />
          ))}

          {run.steps.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">No steps recorded</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function RunsList({
  runs,
  onSelectRun,
  onClear,
}: {
  runs: Run[]
  onSelectRun: (run: Run) => void
  onClear: () => void
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="text-xs text-muted-foreground font-mono">
          {runs.length} run{runs.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run)}
              className="w-full p-3 rounded border border-border hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                {run.status === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : run.status === "completed" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                  {run.id.substring(4, 17)}
                </span>
                {run.duration !== undefined && (
                  <span className="text-xs text-muted-foreground font-mono">{formatDuration(run.duration)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatTime(run.startedAt)}</span>
                <span>·</span>
                <span>{run.steps.length} steps</span>
              </div>
            </button>
          ))}

          {runs.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-10">
              No runs yet. Execute a workflow to see history.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function RunsPanel({
  onClose,
  runs,
  onClearRuns,
}: {
  onClose: () => void
  runs: Run[]
  onClearRuns: () => void
}) {
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)

  return (
    <aside className="absolute right-0 top-0 z-10 h-full w-96 border-l border-border bg-card md:relative overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Runs</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {selectedRun ? (
          <RunDetail run={selectedRun} onBack={() => setSelectedRun(null)} />
        ) : (
          <RunsList runs={runs} onSelectRun={setSelectedRun} onClear={onClearRuns} />
        )}
      </div>
    </aside>
  )
}
