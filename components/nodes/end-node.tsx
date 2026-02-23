"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Flag, Download } from "lucide-react"
import { getStatusColor } from "@/lib/node-utils"

export type EndNodeData = {
  status?: "idle" | "running" | "completed" | "error"
  output?: any
}

function EndNode({ data, selected }: NodeProps<EndNodeData>) {
  const status = data.status || "idle"

  const hasImages = () => {
    if (!data.output) return false
    if (Array.isArray(data.output)) {
      return data.output.some((item) => typeof item === "string" && item.startsWith("data:image/"))
    }
    return typeof data.output === "string" && data.output.startsWith("data:image/")
  }

  const getImages = () => {
    if (!data.output) return []
    if (Array.isArray(data.output)) {
      return data.output.filter((item) => typeof item === "string" && item.startsWith("data:image/"))
    }
    if (typeof data.output === "string" && data.output.startsWith("data:image/")) {
      return [data.output]
    }
    return []
  }

  const downloadImage = (imageData: string, index: number) => {
    const link = document.createElement("a")
    link.href = imageData
    // Extract extension from data URL (e.g., data:image/png -> png)
    const match = imageData.match(/data:image\/(\w+);/)
    const ext = match ? match[1] : "png"
    link.download = `generated-image-${index + 1}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`min-w-[120px] max-w-[280px] rounded border bg-card p-3 ${getStatusColor(status, selected)}`}>
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">End</span>
      </div>

      {data.output && (
        <div className="mt-2">
          {hasImages() ? (
            <div className="space-y-2">
              {getImages().map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img || "/placeholder.svg"}
                    alt={`Output ${idx + 1}`}
                    className="w-full max-h-[200px] object-contain rounded border border-border"
                  />
                  <button
                    onClick={() => downloadImage(img, idx)}
                    className="absolute top-1 right-1 p-1.5 rounded bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                    title="Download image"
                  >
                    <Download className="h-3 w-3 text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-20 overflow-y-auto rounded bg-secondary/50 p-2">
              <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
                {typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2)}
              </p>
            </div>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-muted-foreground/40 !border-0 !w-2 !h-2"
        style={{ top: "50%" }}
      />
    </div>
  )
}

export default memo(EndNode)
