"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { FileText } from "lucide-react"
import { getStatusColor } from "@/lib/node-utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export type PromptNodeData = {
  content: string
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function PromptNode({ data, selected }: NodeProps<PromptNodeData>) {
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
      className={`w-[260px] rounded border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Prompt</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 text-xs text-muted-foreground line-clamp-2 font-mono">
            {data.content || "Enter prompt..."}
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Content</Label>
              <Textarea
                value={data.content || ""}
                onChange={(e) => handleUpdate("content", e.target.value)}
                placeholder="Enter your prompt..."
                rows={4}
                className="text-xs resize-none font-mono nodrag"
                onMouseDown={stopPropagation}
                onFocus={stopPropagation}
              />
              <p className="text-[10px] text-muted-foreground">Use $input1, $input2 for variables</p>
            </div>
          </div>
        )}

        {status === "running" && !isExpanded && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
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

export default memo(PromptNode)
