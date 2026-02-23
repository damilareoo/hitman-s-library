"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { MessageSquare } from "lucide-react"
import { getStatusColor } from "@/lib/node-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TEXT_MODELS, PROVIDER_LOGOS } from "@/lib/constants"

export type TextModelNodeData = {
  model: string
  temperature: number
  maxTokens: number
  prompt?: string
  status?: "idle" | "running" | "completed" | "error"
  structuredOutput?: boolean
  schema?: string
  schemaName?: string
  output?: any
  isExpanded?: boolean
  onUpdate?: (data: any) => void
}

function TextModelNode({ data, selected }: NodeProps<TextModelNodeData>) {
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

  const getShortModelName = () => {
    const model = data.model || "openai/gpt-5"
    const parts = model.split("/")
    return parts[parts.length - 1]
  }

  const getCurrentModelLogo = () => {
    const model = TEXT_MODELS.find((m) => m.value === data.model)
    const group = model?.group || "OpenAI"
    return PROVIDER_LOGOS[group]
  }

  return (
    <div
      className={`w-[280px] rounded border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Text Model</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{getShortModelName()}</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground font-mono">
            <span>temp: {data.temperature || 0.7}</span>
            <span>max: {data.maxTokens || 2000}</span>
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select value={data.model || "openai/gpt-5"} onValueChange={(value) => handleUpdate("model", value)}>
                <SelectTrigger className="h-8 text-xs nodrag" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value} className="py-1.5">
                      <div className="flex items-center gap-2">
                        {PROVIDER_LOGOS[model.group] && (
                          <img
                            src={PROVIDER_LOGOS[model.group] || "/placeholder.svg"}
                            alt={model.group}
                            className="h-4 w-4 rounded-sm object-contain"
                          />
                        )}
                        <span>{model.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5" onMouseDown={stopPropagation}>
              <Label className="text-xs text-muted-foreground">Temperature: {data.temperature || 0.7}</Label>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={[data.temperature || 0.7]}
                onValueChange={([value]) => handleUpdate("temperature", value)}
                className="py-1 nodrag"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max Tokens</Label>
              <Input
                type="number"
                value={data.maxTokens || 2000}
                onChange={(e) => handleUpdate("maxTokens", Number.parseInt(e.target.value))}
                className="h-8 text-xs font-mono nodrag"
                onMouseDown={stopPropagation}
              />
            </div>
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

export default memo(TextModelNode)
