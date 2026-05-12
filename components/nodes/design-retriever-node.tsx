"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Sparkle, CircleNotch, CheckCircle, XCircle, MagnifyingGlass } from "@phosphor-icons/react"
import type { BaseNodeData } from "@/lib/types"

export interface DesignRetrieverNodeData extends BaseNodeData {
  query?: string
  industry?: string
  style?: string
  minQuality?: number
  limit?: number
  retrievePatterns?: boolean
  retrieveColors?: boolean
  retrieveTypography?: boolean
  retrieveLayouts?: boolean
}

function DesignRetrieverNode({ data, selected }: NodeProps) {
  const nodeData = data as DesignRetrieverNodeData
  const status = nodeData.status || "idle"

  const handleChange = (field: string, value: unknown) => {
    if (nodeData.onUpdate) {
      nodeData.onUpdate({ ...nodeData, [field]: value })
    }
  }

  const statusIcon = {
    idle: null,
    running: <CircleNotch className="h-3 w-3 animate-spin text-[var(--color-running)]" weight="regular" />,
    completed: <CheckCircle className="h-3 w-3 text-[var(--color-success)]" weight="regular" />,
    error: <XCircle className="h-3 w-3 text-[var(--color-error)]" weight="regular" />,
  }[status]

  const industries = [
    "SaaS", "E-commerce", "Portfolio", "Agency", "Healthcare",
    "Finance", "Education", "Media", "Real Estate", "Technology"
  ]

  const styles = [
    "Minimalist", "Bold", "Corporate", "Playful", "Luxury",
    "Brutalist", "Neo-morphism", "Glassmorphism", "Flat", "Material"
  ]

  return (
    <Card className={`w-80 ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Sparkle className="h-4 w-4 text-amber-500" weight="regular" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Design Retriever</h3>
            <p className="text-xs text-muted-foreground">Find matching patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon}
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
            AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <MagnifyingGlass className="h-3 w-3" weight="regular" />
            Search Query
          </Label>
          <Input
            placeholder="Modern SaaS dashboard with dark mode..."
            value={nodeData.query || ""}
            onChange={(e) => handleChange("query", e.target.value)}
            className="text-xs h-8"
          />
          <p className="text-xs text-muted-foreground">Use $input1 for dynamic queries</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Industry</Label>
            <Select
              value={nodeData.industry || "any"}
              onValueChange={(value) => handleChange("industry", value === "any" ? undefined : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Industry</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Style</Label>
            <Select
              value={nodeData.style || "any"}
              onValueChange={(value) => handleChange("style", value === "any" ? undefined : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Style</SelectItem>
                {styles.map((style) => (
                  <SelectItem key={style} value={style.toLowerCase()}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Minimum Quality</Label>
            <span className="text-xs text-muted-foreground">{nodeData.minQuality || 7}/10</span>
          </div>
          <Slider
            value={[nodeData.minQuality || 7]}
            onValueChange={([value]) => handleChange("minQuality", value)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Results Limit</Label>
            <span className="text-xs text-muted-foreground">{nodeData.limit || 5}</span>
          </div>
          <Slider
            value={[nodeData.limit || 5]}
            onValueChange={([value]) => handleChange("limit", value)}
            min={1}
            max={20}
            step={1}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Retrieve</Label>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={nodeData.retrievePatterns !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("retrievePatterns", !(nodeData.retrievePatterns !== false))}
            >
              Patterns
            </Badge>
            <Badge 
              variant={nodeData.retrieveColors !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("retrieveColors", !(nodeData.retrieveColors !== false))}
            >
              Colors
            </Badge>
            <Badge 
              variant={nodeData.retrieveTypography !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("retrieveTypography", !(nodeData.retrieveTypography !== false))}
            >
              Typography
            </Badge>
            <Badge 
              variant={nodeData.retrieveLayouts !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("retrieveLayouts", !(nodeData.retrieveLayouts !== false))}
            >
              Layouts
            </Badge>
          </div>
        </div>

        {nodeData.output && (
          <div className="rounded-md bg-muted/50 p-2 text-xs max-h-32 overflow-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(nodeData.output, null, 2)}</pre>
          </div>
        )}
      </CardContent>

      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-3 !h-3" />
    </Card>
  )
}

export default memo(DesignRetrieverNode)
