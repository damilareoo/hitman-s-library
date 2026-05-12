"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Microphone } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

export type AudioNodeData = {
  model: string
  voice?: string
  speed?: number
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function AudioNode({ data, selected }: NodeProps<AudioNodeData>) {
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
          <Microphone className="h-4 w-4 text-muted-foreground" weight="regular"  />
          <span className="text-xs font-medium text-foreground">Audio</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{data.voice || "alloy"}</span>
        </div>

        {!isExpanded && <div className="mt-2 text-xs text-muted-foreground">Speed: {data.speed || 1.0}x</div>}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Voice</Label>
              <Select value={data.voice || "alloy"} onValueChange={(value) => handleUpdate("voice", value)}>
                <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5" onMouseDown={stopPropagation}>
              <Label className="text-xs text-muted-foreground">Speed: {data.speed || 1.0}</Label>
              <Slider
                min={0.25}
                max={4.0}
                step={0.25}
                value={[data.speed || 1.0]}
                onValueChange={([value]) => handleUpdate("speed", value)}
                className="py-1 nodrag"
              />
            </div>
          </div>
        )}

        {status === "running" && !isExpanded && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
            Generating
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

export default memo(AudioNode)
