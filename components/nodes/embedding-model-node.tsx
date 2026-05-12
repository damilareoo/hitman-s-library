"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Stack } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EMBEDDING_MODELS } from "@/lib/constants"

export type EmbeddingModelNodeData = {
  model: string
  dimensions?: number
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function EmbeddingModelNode({ data, selected }: NodeProps<EmbeddingModelNodeData>) {
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
          <Stack className="h-4 w-4 text-muted-foreground" weight="regular"  />
          <span className="text-xs font-medium text-foreground">Embedding</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="font-mono">{data.model?.split("/")[1] || "text-embedding-3-small"}</div>
            <div>Dimensions: {data.dimensions || 1536}</div>
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select
                value={data.model || "openai/text-embedding-3-small"}
                onValueChange={(value) => handleUpdate("model", value)}
              >
                <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMBEDDING_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dimensions</Label>
              <Input
                type="number"
                value={data.dimensions || 1536}
                onChange={(e) => handleUpdate("dimensions", Number.parseInt(e.target.value))}
                className="h-8 text-xs nodrag"
                onMouseDown={stopPropagation}
              />
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

export default memo(EmbeddingModelNode)
