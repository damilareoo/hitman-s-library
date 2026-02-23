"use client"

import React from "react"

import { memo, useState, useCallback } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, Loader2, CheckCircle2, XCircle, Upload, FileSpreadsheet, Link } from "lucide-react"
import type { BaseNodeData } from "@/lib/types"

export interface ExcelParserNodeData extends BaseNodeData {
  fileUrl?: string
  sheetName?: string
  urlColumn?: string
  categoryColumn?: string
  industryColumn?: string
  notesColumn?: string
  skipRows?: number
  columnMappings?: Record<string, string>
  parsedCount?: number
}

function ExcelParserNode({ data, selected }: NodeProps) {
  const nodeData = data as ExcelParserNodeData
  const status = nodeData.status || "idle"
  const [dragOver, setDragOver] = useState(false)
  const [previewData, setPreviewData] = useState<string[] | null>(null)

  const handleChange = (field: string, value: unknown) => {
    if (nodeData.onUpdate) {
      nodeData.onUpdate({ ...nodeData, [field]: value })
    }
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        // Preview would happen here in real implementation
        handleChange("fileUrl", URL.createObjectURL(file))
        setPreviewData(["URL", "Category", "Industry", "Notes"]) // Mock columns
      }
    }
  }, [])

  const statusIcon = {
    idle: null,
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
  }[status]

  const commonColumns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

  return (
    <Card className={`w-96 ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
            <FileSpreadsheet className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Excel Parser</h3>
            <p className="text-xs text-muted-foreground">Import design links from spreadsheet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon}
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
            Import
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* File drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver ? "border-green-500 bg-green-500/10" : "border-muted-foreground/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
        >
          {nodeData.fileUrl ? (
            <div className="flex items-center justify-center gap-2">
              <Table className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600">File loaded</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  handleChange("fileUrl", "")
                  setPreviewData(null)
                }}
                className="text-xs h-6 px-2"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Drop .xlsx, .xls, or .csv file
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Or paste Google Sheets URL</Label>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={nodeData.fileUrl || ""}
            onChange={(e) => handleChange("fileUrl", e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Sheet Name</Label>
          <Input
            placeholder="Sheet1"
            value={nodeData.sheetName || ""}
            onChange={(e) => handleChange("sheetName", e.target.value)}
            className="text-xs h-8"
          />
        </div>

        <div className="p-2 rounded-md bg-muted/50">
          <Label className="text-xs font-medium flex items-center gap-1 mb-2">
            <Link className="h-3 w-3" />
            Column Mapping
          </Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">URL Column</Label>
              <Select
                value={nodeData.urlColumn || "A"}
                onValueChange={(value) => handleChange("urlColumn", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commonColumns.map((col) => (
                    <SelectItem key={col} value={col}>Column {col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category Column</Label>
              <Select
                value={nodeData.categoryColumn || "B"}
                onValueChange={(value) => handleChange("categoryColumn", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {commonColumns.map((col) => (
                    <SelectItem key={col} value={col}>Column {col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Industry Column</Label>
              <Select
                value={nodeData.industryColumn || "C"}
                onValueChange={(value) => handleChange("industryColumn", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {commonColumns.map((col) => (
                    <SelectItem key={col} value={col}>Column {col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes Column</Label>
              <Select
                value={nodeData.notesColumn || "D"}
                onValueChange={(value) => handleChange("notesColumn", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {commonColumns.map((col) => (
                    <SelectItem key={col} value={col}>Column {col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Skip Header Rows</Label>
          <Input
            type="number"
            value={nodeData.skipRows || 1}
            onChange={(e) => handleChange("skipRows", parseInt(e.target.value) || 0)}
            className="text-xs h-8 w-20"
            min={0}
          />
        </div>

        {nodeData.parsedCount !== undefined && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {nodeData.parsedCount} URLs ready to process
          </div>
        )}

        {nodeData.output && (
          <div className="rounded-md bg-muted/50 p-2 text-xs max-h-24 overflow-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(nodeData.output, null, 2)}</pre>
          </div>
        )}
      </CardContent>

      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-green-500 !w-3 !h-3" />
    </Card>
  )
}

export default memo(ExcelParserNode)
