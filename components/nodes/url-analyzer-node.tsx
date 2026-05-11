"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Globe, Loader2, CheckCircle2, XCircle } from "lucide-react"
import type { BaseNodeData } from "@/lib/types"

export interface UrlAnalyzerNodeData extends BaseNodeData {
  url?: string
  analysisDepth?: "basic" | "detailed" | "comprehensive"
  extractImages?: boolean
  industry?: string
}

function UrlAnalyzerNode({ data, selected }: NodeProps) {
  const nodeData = data as UrlAnalyzerNodeData
  const status = nodeData.status || "idle"

  const handleChange = (field: string, value: unknown) => {
    if (nodeData.onUpdate) {
      nodeData.onUpdate({ ...nodeData, [field]: value })
    }
  }

  const statusIcon = {
    idle: null,
    running: <Loader2 className="h-3 w-3 animate-spin text-[var(--color-running)]" />,
    completed: <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />,
    error: <XCircle className="h-3 w-3 text-[var(--color-error)]" />,
  }[status]

  const industries = [
    "SaaS",
    "E-commerce",
    "Portfolio",
    "Agency",
    "Healthcare",
    "Finance",
    "Education",
    "Media",
    "Real Estate",
    "Food & Beverage",
    "Travel",
    "Technology",
    "Other",
  ]

  return (
    <Card className={`w-80 ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <Globe className="h-4 w-4 text-cyan-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">URL Analyzer</h3>
            <p className="text-xs text-muted-foreground">Extract design patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon}
          <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
            Design
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Website URL</Label>
          <Input
            placeholder="https://example.com"
            value={nodeData.url || ""}
            onChange={(e) => handleChange("url", e.target.value)}
            className="text-xs h-8"
          />
          <p className="text-xs text-muted-foreground">Or use $input1 for dynamic URL</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Analysis Depth</Label>
            <Select
              value={nodeData.analysisDepth || "detailed"}
              onValueChange={(value) => handleChange("analysisDepth", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Industry</Label>
            <Select
              value={nodeData.industry || "other"}
              onValueChange={(value) => handleChange("industry", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="other">Auto-detect</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Extract Images</Label>
          <input
            type="checkbox"
            checked={nodeData.extractImages ?? true}
            onChange={(e) => handleChange("extractImages", e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
        </div>

        {nodeData.output && (
          <div className="rounded-md bg-muted/50 p-2 text-xs max-h-32 overflow-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(nodeData.output, null, 2)}</pre>
          </div>
        )}
      </CardContent>

      <Handle type="target" position={Position.Left} className="!bg-cyan-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-500 !w-3 !h-3" />
    </Card>
  )
}

export default memo(UrlAnalyzerNode)
