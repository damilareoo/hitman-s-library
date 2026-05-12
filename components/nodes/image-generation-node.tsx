"use client"

import type React from "react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Image } from "@phosphor-icons/react"
import { getStatusColor } from "@/lib/node-utils"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IMAGE_MODELS, PROVIDER_LOGOS } from "@/lib/constants"

export type ImageGenerationNodeData = {
  model: string
  aspectRatio?: string
  outputFormat?: string
  status?: "idle" | "running" | "completed" | "error"
  output?: string // output is now a string (base64 data URL)
  isExpanded?: boolean
  onUpdate?: (data: any) => void
  connectedHandles?: string[]
}

function ImageGenerationNode({ data, selected }: NodeProps<ImageGenerationNodeData>) {
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

  const getModelLabel = (modelValue: string) => {
    const model = IMAGE_MODELS.find((m) => m.value === modelValue)
    return model?.label || modelValue
  }

  const getCurrentModelLogo = () => {
    const model = IMAGE_MODELS.find((m) => m.value === data.model)
    const group = model?.group || "OpenAI"
    return PROVIDER_LOGOS[group]
  }

  const currentModel = data.model || "openai/gpt-image-1"

  return (
    <div
      className={`w-[260px] rounded-md border bg-card transition-colors duration-150 ${getStatusColor(status, selected)}`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Image className="h-3.5 w-3.5 text-muted-foreground" weight="regular"  />
          <span className="text-[11px] font-medium text-foreground">Image</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{data.aspectRatio || "1:1"}</span>
        </div>

        {!isExpanded && (
          <div className="mt-2 text-[10px] text-muted-foreground font-mono truncate">{getModelLabel(currentModel)}</div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-3" onClick={stopPropagation}>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Model</Label>
              <Select value={currentModel} onValueChange={(value) => handleUpdate("model", value)}>
                <SelectTrigger className="h-8 text-xs font-mono" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {IMAGE_MODELS.map((model) => (
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
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Aspect Ratio</Label>
              <Select value={data.aspectRatio || "1:1"} onValueChange={(value) => handleUpdate("aspectRatio", value)}>
                <SelectTrigger className="h-8 text-xs font-mono" onMouseDown={stopPropagation}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1" className="text-xs py-1.5">
                    1:1 (Square)
                  </SelectItem>
                  <SelectItem value="16:9" className="text-xs py-1.5">
                    16:9 (Landscape)
                  </SelectItem>
                  <SelectItem value="9:16" className="text-xs py-1.5">
                    9:16 (Portrait)
                  </SelectItem>
                  <SelectItem value="4:3" className="text-xs py-1.5">
                    4:3
                  </SelectItem>
                  <SelectItem value="3:4" className="text-xs py-1.5">
                    3:4
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {status === "running" && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50" />
            generating
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

export default memo(ImageGenerationNode)
