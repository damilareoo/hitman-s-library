"use client"

import type React from "react"
import { 
  MessageSquare, Layers, Wrench, FileText, ImageIcon, Code, Play, Flag, GitBranch, Globe,
  Database, FileSpreadsheet, Search, Palette, BookOpen
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

type NodeType = {
  type: string
  label: string
  icon: React.ReactNode
  category?: string
}

// Design Library nodes - now primary
const designNodeTypes: NodeType[] = [
  { type: "excelParser", label: "Import Excel", icon: <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />, category: "design" },
  { type: "urlAnalyzer", label: "Catalog Design", icon: <Globe className="h-3.5 w-3.5 text-cyan-500" />, category: "design" },
  { type: "designStore", label: "Save to Library", icon: <Database className="h-3.5 w-3.5 text-indigo-500" />, category: "design" },
  { type: "designRetriever", label: "Search Library", icon: <Search className="h-3.5 w-3.5 text-amber-500" />, category: "design" },
]

const nodeTypes: NodeType[] = [
  // Flow
  { type: "start", label: "Start", icon: <Play className="h-3.5 w-3.5" />, category: "flow" },
  { type: "end", label: "End", icon: <Flag className="h-3.5 w-3.5" />, category: "flow" },
  // Core
  { type: "prompt", label: "Prompt", icon: <FileText className="h-3.5 w-3.5" />, category: "core" },
  { type: "textModel", label: "Text Model", icon: <MessageSquare className="h-3.5 w-3.5" />, category: "ai" },
  { type: "imageGeneration", label: "Image", icon: <ImageIcon className="h-3.5 w-3.5" />, category: "ai" },
  { type: "httpRequest", label: "HTTP", icon: <Globe className="h-3.5 w-3.5" />, category: "integration" },
  { type: "conditional", label: "Condition", icon: <GitBranch className="h-3.5 w-3.5" />, category: "flow" },
  { type: "javascript", label: "JavaScript", icon: <Code className="h-3.5 w-3.5" />, category: "core" },
  { type: "embeddingModel", label: "Embedding", icon: <Layers className="h-3.5 w-3.5" />, category: "ai" },
  { type: "tool", label: "Tool", icon: <Wrench className="h-3.5 w-3.5" />, category: "core" },
]

type NodePaletteProps = {
  onAddNode: (type: string) => void
  onClose?: () => void
}

export function NodePalette({ onAddNode, onClose }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  const handleAddNode = (type: string) => {
    onAddNode(type)
    onClose?.()
  }

  const renderNodeButton = (node: NodeType) => (
    <button
      key={node.type}
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      onClick={() => handleAddNode(node.type)}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
    >
      <span className="text-muted-foreground">{node.icon}</span>
      {node.label}
    </button>
  )

  return (
    <div className="w-56 rounded-lg border border-border bg-card p-2 shadow-lg max-h-[70vh] overflow-y-auto">
      {/* Design Library Section - Featured */}
      <div className="mb-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <Palette className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-foreground">Design Library</span>
        </div>
        <div className="space-y-0.5 mt-1 bg-purple-500/5 rounded py-1 px-1">
          {designNodeTypes.map(renderNodeButton)}
        </div>
      </div>

      <Separator className="my-2" />

      {/* Standard Workflow Section */}
      <div className="mb-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Workflows</span>
        </div>
        <div className="space-y-0.5 mt-1">
          {nodeTypes.map(renderNodeButton)}
        </div>
      </div>
    </div>
  )
}
