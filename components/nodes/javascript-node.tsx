"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Code } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export type JavaScriptNodeData = {
  code: string
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function JavaScriptNode({ data, selected }: NodeProps<JavaScriptNodeData>) {
  const status = data.status || "idle"
  const isExpanded = data.isExpanded || false

  const handleUpdate = (field: string, value: any) => {
    if (data.onUpdate) {
      const { isExpanded, onUpdate, ...restData } = data
      data.onUpdate({ ...restData, [field]: value })
    }
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={`w-[300px] rounded-md border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" weight="regular"  />
          <span className="text-xs font-medium text-foreground">JavaScript</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 rounded bg-secondary p-2 max-h-32 overflow-y-auto">
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
              {data.code || "// code"}
            </pre>
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Code</Label>
              <Textarea
                value={data.code || ""}
                onChange={(e) => handleUpdate("code", e.target.value)}
                placeholder="// Access inputs as input1, input2, etc."
                rows={8}
                className="font-mono text-xs resize-none nodrag max-h-48"
                onMouseDown={stopPropagation}
              />
              <p className="text-[10px] text-muted-foreground">Access inputs as input1, input2, etc.</p>
            </div>
          </div>
        )}

        {status === "running" && !isExpanded && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
          </div>
        )}

        {data.output && !isExpanded && (
          <div className="mt-2 max-h-20 overflow-y-auto rounded bg-secondary p-2">
            <p className="text-xs text-foreground line-clamp-2">
              {typeof data.output === "string" ? data.output : JSON.stringify(data.output)}
            </p>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-muted-foreground/40 !border-0 !w-2 !h-2"
        style={{ top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-muted-foreground/40 !border-0 !w-2 !h-2"
      />
    </div>
  )
}

export default memo(JavaScriptNode)
