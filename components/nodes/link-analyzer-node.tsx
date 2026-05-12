"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Globe, CheckCircle, Sparkle } from "@phosphor-icons/react"
import type { BaseNodeData } from "@/lib/types"

export interface LinkAnalyzerNodeData extends BaseNodeData {
  url?: string
  industry?: string
  description?: string
  colorPalette?: string
  typography?: string
  layoutNotes?: string
  tags?: string
  qualityScore?: number
}

function LinkAnalyzerNode({ data, selected }: NodeProps) {
  const nodeData = data as LinkAnalyzerNodeData
  const [url, setUrl] = useState(nodeData.url || "")
  const [industry, setIndustry] = useState(nodeData.industry || "")
  const [description, setDescription] = useState(nodeData.description || "")
  const [colorPalette, setColorPalette] = useState(nodeData.colorPalette || "")
  const [typography, setTypography] = useState(nodeData.typography || "")
  const [layoutNotes, setLayoutNotes] = useState(nodeData.layoutNotes || "")
  const [tags, setTags] = useState(nodeData.tags || "")

  const handleChange = (field: string, value: unknown) => {
    if (nodeData.onUpdate) {
      nodeData.onUpdate({ ...nodeData, [field]: value })
    }
  }

  const handleSave = () => {
    handleChange("url", url)
    handleChange("industry", industry)
    handleChange("description", description)
    handleChange("colorPalette", colorPalette)
    handleChange("typography", typography)
    handleChange("layoutNotes", layoutNotes)
    handleChange("tags", tags)
  }

  const industries = [
    "SaaS", "E-commerce", "FinTech", "HealthTech", "EdTech",
    "Media", "Design", "Agency", "Startup", "Enterprise",
  ]

  return (
    <Card className={`w-96 ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <Globe className="h-4 w-4 text-cyan-500" weight="regular"  />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Link Analyzer</h3>
            <p className="text-xs text-muted-foreground">Analyze & catalog design</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
          Catalog
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Website URL</Label>
          <Input
            placeholder="https://stripe.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Industry Category</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select industry..." />
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Design Description</Label>
          <Textarea
            placeholder="E.g., Modern dashboard with dark mode..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs h-16 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Color Palette</Label>
          <Input
            placeholder="#FFFFFF, #000000, #3B82F6"
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Typography</Label>
          <Input
            placeholder="Inter, Helvetica, system fonts..."
            value={typography}
            onChange={(e) => setTypography(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Layout Notes</Label>
          <Input
            placeholder="Sidebar, hero section, grid layout..."
            value={layoutNotes}
            onChange={(e) => setLayoutNotes(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tags (comma-separated)</Label>
          <Input
            placeholder="modern, minimalist, bold..."
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          className="text-xs h-8 w-full"
        >
          <Sparkle className="mr-1 h-3 w-3" weight="regular"  />
          Save Design Reference
        </Button>
      </CardContent>

      <Handle type="target" position={Position.Left} className="!bg-cyan-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-500 !w-3 !h-3" />
    </Card>
  )
}

export default memo(LinkAnalyzerNode)
