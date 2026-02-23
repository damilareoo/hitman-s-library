"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Database, Save, CheckCircle2 } from "lucide-react"
import type { BaseNodeData } from "@/lib/types"

export interface DesignStoreNodeData extends BaseNodeData {
  sourceUrl?: string
  industry?: string
  styleCategory?: string
  tags?: string
  qualityScore?: number
  colorPalette?: string
  typography?: string
  layoutNotes?: string
}

function DesignStoreNode({ data, selected }: NodeProps) {
  const nodeData = data as DesignStoreNodeData
  const [sourceUrl, setSourceUrl] = useState(nodeData.sourceUrl || "")
  const [industry, setIndustry] = useState(nodeData.industry || "")
  const [styleCategory, setStyleCategory] = useState(nodeData.styleCategory || "")
  const [tags, setTags] = useState(nodeData.tags || "")
  const [qualityScore, setQualityScore] = useState(nodeData.qualityScore || 7)

  const handleChange = (field: string, value: unknown) => {
    if (nodeData.onUpdate) {
      nodeData.onUpdate({ ...nodeData, [field]: value })
    }
  }

  const handleSave = async () => {
    // Prepare data for storage
    const designData = {
      sourceUrl,
      industry,
      styleCategory,
      tags,
      qualityScore,
      colorPalette: nodeData.colorPalette,
      typography: nodeData.typography,
      layoutNotes: nodeData.layoutNotes,
    }

    // Update node data
    Object.entries(designData).forEach(([key, value]) => {
      handleChange(key, value)
    })

    // Trigger API call via workflow execution
    handleChange("status", "running")
  }

  const industries = [
    "SaaS", "E-commerce", "FinTech", "HealthTech", "EdTech",
    "Media", "Design", "Agency", "Startup", "Enterprise",
  ]

  const styles = [
    "Minimalist", "Bold", "Corporate", "Playful", "Luxury",
    "Brutalist", "Neo-morphism", "Glassmorphism", "Flat", "Material",
  ]

  return (
    <Card className={`w-80 ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <Database className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Design Store</h3>
            <p className="text-xs text-muted-foreground">Save to library</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
          Storage
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Design Reference URL</Label>
          <Input
            placeholder="https://stripe.com"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={styleCategory} onValueChange={setStyleCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
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
          <Label className="text-xs">Tags</Label>
          <Input
            placeholder="modern, dark-mode, dashboard..."
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Quality Score</Label>
            <span className="text-xs text-muted-foreground font-medium">{qualityScore}/10</span>
          </div>
          <Slider
            value={[qualityScore]}
            onValueChange={([value]) => setQualityScore(value)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
          <p className="text-xs text-muted-foreground">9-10: Premium | 7-8: Production | 5-6: Good Reference</p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          className="text-xs h-8 w-full"
        >
          <Save className="mr-1 h-3 w-3" />
          Store Design Reference
        </Button>

        {nodeData.output && (
          <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2 text-xs">
            <div className="flex items-center gap-1 text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              Saved to library
            </div>
          </div>
        )}
      </CardContent>

      <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3" />
    </Card>
  )
}

export default memo(DesignStoreNode)
