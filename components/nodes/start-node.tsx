"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Play } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"

export type StartNodeData = {
  status?: "idle" | "running" | "completed" | "error"
  output?: any
}

function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  const status = data.status || "idle"

  return (
    <div className={`rounded border bg-card px-4 py-2 ${getStatusColor(status, selected)}`}>
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-muted-foreground" weight="regular"  />
        <span className="text-xs font-medium text-foreground">Start</span>
      </div>

      {status === "running" && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-muted-foreground/40 !border-0 !w-2 !h-2"
      />
    </div>
  )
}

export default memo(StartNode)
