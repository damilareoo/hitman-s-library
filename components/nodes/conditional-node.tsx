"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { GitBranch } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export type ConditionalNodeData = {
  condition: string
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function ConditionalNode({ data, selected }: NodeProps<ConditionalNodeData>) {
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
      className={`w-[260px] rounded-md border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" weight="regular"  />
          <span className="text-xs font-medium text-foreground">Condition</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 rounded bg-secondary px-2 py-1.5 font-mono text-xs text-muted-foreground truncate">
            {data.condition || "input1 === 'value'"}
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Condition</Label>
              <Textarea
                value={data.condition || ""}
                onChange={(e) => handleUpdate("condition", e.target.value)}
                placeholder="input1 === 'US'"
                rows={3}
                className="font-mono text-xs resize-none nodrag"
                onMouseDown={stopPropagation}
              />
              <p className="text-[10px] text-muted-foreground">JavaScript expression using input1, input2, etc.</p>
            </div>
          </div>
        )}

        {status === "running" && !isExpanded && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
          </div>
        )}

        {data.output !== undefined && !isExpanded && (
          <div className="mt-2 text-xs">
            <span className={data.output ? "text-foreground" : "text-muted-foreground"}>
              {data.output ? "true" : "false"}
            </span>
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
        id="true"
        className="!bg-muted-foreground/40 !border-0 !w-2 !h-2"
        style={{ top: "35%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!bg-muted-foreground/40 !border-0 !w-2 !h-2"
        style={{ top: "65%" }}
      />
    </div>
  )
}

export default memo(ConditionalNode)
