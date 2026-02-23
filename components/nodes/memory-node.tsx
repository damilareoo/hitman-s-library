"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Brain } from "lucide-react"
import { getStatusColor } from "@/lib/node-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type MemoryNodeData = {
  operation: "load" | "save" | "loadAll" | "addMessage" | "getMessages"
  sessionId: string
  key?: string
  memoryType?: "fact" | "preference" | "entity" | "summary"
  messageRole?: "user" | "assistant" | "system"
  limit?: number
  status?: "idle" | "running" | "completed" | "error"
  output?: unknown
  isExpanded?: boolean
  onUpdate?: (data: MemoryNodeData) => void
}

const OPERATIONS = [
  { value: "load", label: "Load Memory" },
  { value: "save", label: "Save Memory" },
  { value: "loadAll", label: "Load All Memories" },
  { value: "addMessage", label: "Add Message" },
  { value: "getMessages", label: "Get Messages" },
]

const MEMORY_TYPES = [
  { value: "fact", label: "Fact" },
  { value: "preference", label: "Preference" },
  { value: "entity", label: "Entity" },
  { value: "summary", label: "Summary" },
]

const MESSAGE_ROLES = [
  { value: "user", label: "User" },
  { value: "assistant", label: "Assistant" },
  { value: "system", label: "System" },
]

function MemoryNode({ data, selected }: NodeProps<MemoryNodeData>) {
  const status = data.status || "idle"
  const isExpanded = data.isExpanded || false
  const operation = data.operation || "load"

  const handleUpdate = (field: string, value: unknown) => {
    if (data.onUpdate) {
      const { isExpanded, onUpdate, ...restData } = data
      data.onUpdate({ ...restData, [field]: value } as MemoryNodeData)
    }
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const getOperationLabel = () => {
    const op = OPERATIONS.find((o) => o.value === operation)
    return op?.label || "Memory"
  }

  return (
    <div
      className={`w-[280px] rounded border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Memory</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{getOperationLabel()}</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground font-mono">
            <span>session: {data.sessionId || "default"}</span>
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Operation</Label>
              <Select value={operation} onValueChange={(value) => handleUpdate("operation", value)}>
                <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATIONS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Session ID</Label>
              <Input
                value={data.sessionId || "default"}
                onChange={(e) => handleUpdate("sessionId", e.target.value)}
                className="h-8 text-xs font-mono nodrag"
                onMouseDown={stopPropagation}
                placeholder="default"
              />
            </div>

            {(operation === "load" || operation === "save") && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Key</Label>
                <Input
                  value={data.key || ""}
                  onChange={(e) => handleUpdate("key", e.target.value)}
                  className="h-8 text-xs font-mono nodrag"
                  onMouseDown={stopPropagation}
                  placeholder="memory_key"
                />
              </div>
            )}

            {operation === "save" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={data.memoryType || "fact"} onValueChange={(value) => handleUpdate("memoryType", value)}>
                  <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {operation === "addMessage" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select
                  value={data.messageRole || "user"}
                  onValueChange={(value) => handleUpdate("messageRole", value)}
                >
                  <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {operation === "getMessages" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Limit</Label>
                <Input
                  type="number"
                  value={data.limit || 10}
                  onChange={(e) => handleUpdate("limit", Number.parseInt(e.target.value))}
                  className="h-8 text-xs font-mono nodrag"
                  onMouseDown={stopPropagation}
                />
              </div>
            )}
          </div>
        )}

        {status === "running" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
            <span>Running</span>
          </div>
        )}

        {data.output && (
          <div className="mt-2 max-h-20 overflow-y-auto rounded bg-secondary/50 p-2">
            <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
              {typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2)}
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

export default memo(MemoryNode)
