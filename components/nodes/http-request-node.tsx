"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Globe } from "lucide-react"
import { getStatusColor } from "@/lib/node-utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type HttpRequestNodeData = {
  url: string
  method: string
  headers?: string
  body?: string
  status?: "idle" | "running" | "completed" | "error"
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function HttpRequestNode({ data, selected }: NodeProps<HttpRequestNodeData>) {
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
      className={`w-[280px] rounded-md border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">HTTP</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{data.method || "GET"}</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 rounded bg-secondary px-2 py-1.5 font-mono text-xs text-muted-foreground truncate">
            {data.url?.replace(/^https?:\/\//, "") || "api.example.com"}
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input
                value={data.url || ""}
                onChange={(e) => handleUpdate("url", e.target.value)}
                placeholder="https://api.example.com"
                className="h-8 text-xs font-mono nodrag"
                onMouseDown={stopPropagation}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Method</Label>
              <Select value={data.method || "GET"} onValueChange={(value) => handleUpdate("method", value)}>
                <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Headers (JSON)</Label>
              <Textarea
                value={data.headers || ""}
                onChange={(e) => handleUpdate("headers", e.target.value)}
                placeholder='{"Content-Type": "application/json"}'
                rows={2}
                className="font-mono text-xs resize-none nodrag"
                onMouseDown={stopPropagation}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Body (JSON)</Label>
              <Textarea
                value={data.body || ""}
                onChange={(e) => handleUpdate("body", e.target.value)}
                placeholder='{"key": "value"}'
                rows={2}
                className="font-mono text-xs resize-none nodrag"
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

export default memo(HttpRequestNode)
