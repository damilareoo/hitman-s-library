"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { FileCode } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type StructuredOutputNodeData = {
  schemaName: string
  mode: "object" | "array"
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function StructuredOutputNode({ data, selected }: NodeProps<StructuredOutputNodeData>) {
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
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" weight="regular"  />
          <span className="text-xs font-medium text-foreground">Structured</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{data.mode || "object"}</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 text-xs text-muted-foreground font-mono">{data.schemaName || "Schema"}</div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Schema Name</Label>
              <Input
                value={data.schemaName || ""}
                onChange={(e) => handleUpdate("schemaName", e.target.value)}
                placeholder="Schema"
                className="h-8 text-xs font-mono"
                onMouseDown={stopPropagation}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <Select value={data.mode || "object"} onValueChange={(value) => handleUpdate("mode", value)}>
                <SelectTrigger className="h-8 text-xs" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="object">Object</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
              </Select>
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
        id="input-1"
        className="!bg-foreground/30 !border-0"
        style={{ top: "30%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input-2"
        className="!bg-foreground/30 !border-0"
        style={{ top: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input-3"
        className="!bg-foreground/30 !border-0"
        style={{ top: "70%" }}
      />
      <Handle type="source" position={Position.Right} className="!bg-foreground/30 !border-0" />
    </div>
  )
}

export default memo(StructuredOutputNode)
