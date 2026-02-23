"use client"

import React from "react"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2, CheckCircle2, XCircle, Upload } from "lucide-react"
import type { BaseNodeData } from "@/lib/types"

export interface ImageAnalyzerNodeData extends BaseNodeData {
  imageUrl?: string
  analysisType?: "colors" | "typography" | "layout" | "full"
  model?: string
  extractColorPalette?: boolean
  extractTypography?: boolean
  extractPatterns?: boolean
}

function ImageAnalyzerNode({ data, selected }: NodeProps) {
  const nodeData = data as ImageAnalyzerNodeData
  const status = nodeData.status || "idle"
  const [dragOver, setDragOver] = useState(false)

  const handleChange = (field: string, value: unknown) => {
    if (nodeData.onUpdate) {
      nodeData.onUpdate({ ...nodeData, [field]: value })
    }
  }

  const statusIcon = {
    idle: null,
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
  }[status]

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      // In a real implementation, this would upload the file
      // For now, we'll show a placeholder
      handleChange("imageUrl", URL.createObjectURL(files[0]))
    }
  }

  return (
    <Card className={`w-80 ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
            <ImageIcon className="h-4 w-4 text-pink-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Image Analyzer</h3>
            <p className="text-xs text-muted-foreground">Extract design from images</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon}
          <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-500 border-pink-500/20">
            Vision
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver ? "border-pink-500 bg-pink-500/10" : "border-muted-foreground/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {nodeData.imageUrl ? (
            <div className="space-y-2">
              <img 
                src={nodeData.imageUrl || "/placeholder.svg"} 
                alt="Preview" 
                className="max-h-20 mx-auto rounded object-cover"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleChange("imageUrl", "")}
                className="text-xs"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Drop image or paste URL
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Image URL</Label>
          <Input
            placeholder="https://... or use $input1"
            value={nodeData.imageUrl || ""}
            onChange={(e) => handleChange("imageUrl", e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Analysis Type</Label>
            <Select
              value={nodeData.analysisType || "full"}
              onValueChange={(value) => handleChange("analysisType", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="colors">Colors Only</SelectItem>
                <SelectItem value="typography">Typography</SelectItem>
                <SelectItem value="layout">Layout</SelectItem>
                <SelectItem value="full">Full Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Vision Model</Label>
            <Select
              value={nodeData.model || "openai/gpt-5"}
              onValueChange={(value) => handleChange("model", value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai/gpt-5">GPT-5 Vision</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">Gemini Pro</SelectItem>
                <SelectItem value="anthropic/claude-sonnet-4">Claude Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Extract</Label>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={nodeData.extractColorPalette !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("extractColorPalette", !nodeData.extractColorPalette)}
            >
              Colors
            </Badge>
            <Badge 
              variant={nodeData.extractTypography !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("extractTypography", !nodeData.extractTypography)}
            >
              Typography
            </Badge>
            <Badge 
              variant={nodeData.extractPatterns !== false ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleChange("extractPatterns", !nodeData.extractPatterns)}
            >
              Patterns
            </Badge>
          </div>
        </div>

        {nodeData.output && (
          <div className="rounded-md bg-muted/50 p-2 text-xs max-h-32 overflow-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(nodeData.output, null, 2)}</pre>
          </div>
        )}
      </CardContent>

      <Handle type="target" position={Position.Left} className="!bg-pink-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-pink-500 !w-3 !h-3" />
    </Card>
  )
}

export default memo(ImageAnalyzerNode)
