"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import {
  Plus,
  Play,
  FileText,
  MessageSquare,
  ImageIcon,
  Code,
  Globe,
  GitBranch,
  Layers,
  Wrench,
  Flag,
  Brain,
  Database,
  FileSpreadsheet,
  Search,
  Palette,
} from "lucide-react"

type NodeType = {
  type: string
  label: string
  icon: React.ReactNode
  category?: "design" | "flow" | "ai" | "logic" | "data"
}

const designNodeTypes: NodeType[] = [
  { type: "excelParser", label: "Import Excel", icon: <FileSpreadsheet className="h-5 w-5 text-emerald-500" />, category: "design" },
  { type: "urlAnalyzer", label: "Catalog Design", icon: <Globe className="h-5 w-5 text-cyan-500" />, category: "design" },
  { type: "designStore", label: "Save to Library", icon: <Database className="h-5 w-5 text-indigo-500" />, category: "design" },
  { type: "designRetriever", label: "Search Library", icon: <Search className="h-5 w-5 text-amber-500" />, category: "design" },
]

const nodeTypes: NodeType[] = [
  { type: "start", label: "Start", icon: <Play className="h-5 w-5" />, category: "flow" },
  { type: "end", label: "End", icon: <Flag className="h-5 w-5" />, category: "flow" },
  { type: "prompt", label: "Prompt", icon: <FileText className="h-5 w-5" />, category: "ai" },
  { type: "textModel", label: "Text Model", icon: <MessageSquare className="h-5 w-5" />, category: "ai" },
  { type: "imageGeneration", label: "Image", icon: <ImageIcon className="h-5 w-5" />, category: "ai" },
  { type: "httpRequest", label: "HTTP", icon: <Globe className="h-5 w-5" />, category: "data" },
  { type: "conditional", label: "Condition", icon: <GitBranch className="h-5 w-5" />, category: "logic" },
  { type: "javascript", label: "JavaScript", icon: <Code className="h-5 w-5" />, category: "logic" },
  { type: "embeddingModel", label: "Embedding", icon: <Layers className="h-5 w-5" />, category: "ai" },
  { type: "tool", label: "Tool", icon: <Wrench className="h-5 w-5" />, category: "logic" },
  { type: "memory", label: "Memory", icon: <Brain className="h-5 w-5" />, category: "data" },
]

type FloatingAddButtonProps = {
  onAddNode: (type: string) => void
}

const DRAG_THRESHOLD = 5

export function FloatingAddButton({ onAddNode }: FloatingAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [openDirection, setOpenDirection] = useState<"up" | "down">("down")

  const dragState = useRef({
    isMouseDown: false,
    hasDragged: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    startPosX: 0,
    startPosY: 0,
  })

  const getActualY = useCallback(() => {
    return position.y
  }, [position.y])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-menu-item]")) return

      e.preventDefault()

      const actualY = getActualY()

      dragState.current = {
        isMouseDown: true,
        hasDragged: false,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - position.x,
        offsetY: e.clientY - actualY,
        startPosX: position.x,
        startPosY: actualY,
      }
    },
    [position.x, getActualY],
  )

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.isMouseDown) return

    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > DRAG_THRESHOLD) {
      if (!dragState.current.hasDragged) {
        dragState.current.hasDragged = true
        setIsDragging(true)
      }

      const newX = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - dragState.current.offsetX))
      const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragState.current.offsetY))

      setPosition({ x: newX, y: newY })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const wasDragging = dragState.current.hasDragged

    if (dragState.current.isMouseDown && !wasDragging) {
      const actualY = position.y
      const menuHeight = 400
      const shouldOpenDown = actualY < menuHeight

      setOpenDirection(shouldOpenDown ? "down" : "up")
      setIsOpen((prev) => !prev)
    }

    dragState.current.isMouseDown = false
    dragState.current.hasDragged = false
    setIsDragging(false)
  }, [position.y])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleAddNode = (type: string) => {
    onAddNode(type)
    setIsOpen(false)
  }

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
    setIsOpen(false)
  }

  const topStyle = `${position.y}px`

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}

      <div
        className="fixed z-50"
        style={{
          left: position.x,
          top: topStyle,
        }}
      >
        <div
          className={`absolute left-0 transition-all duration-150 ease-out ${
            openDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            isOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : openDirection === "up"
                ? "opacity-0 translate-y-1 scale-95 pointer-events-none"
                : "opacity-0 -translate-y-1 scale-95 pointer-events-none"
          }`}
        >
          <div className="w-64 rounded border border-border bg-card shadow-sm">
            <div className="p-2">
              <div className="mb-2 px-3 py-1.5 border-b">
                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-purple-500" />
                  Design Library
                </p>
              </div>
              <div className="space-y-0.5 mb-1">
                {designNodeTypes.map((node) => (
                  <button
                    key={node.type}
                    data-menu-item
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    onClick={() => handleAddNode(node.type)}
                    className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <span className="text-muted-foreground">{node.icon}</span>
                    {node.label}
                  </button>
                ))}
              </div>
              
              <div className="border-t py-2 px-3">
                <p className="text-xs font-semibold text-foreground mb-1">Workflows</p>
              </div>
              <div className="space-y-0.5 p-2">
                {nodeTypes.map((node) => (
                  <button
                    key={node.type}
                    data-menu-item
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    onClick={() => handleAddNode(node.type)}
                    className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <span className="text-muted-foreground">{node.icon}</span>
                    {node.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onMouseDown={handleMouseDown}
          className={`flex h-11 w-11 items-center justify-center rounded border border-border bg-white shadow-sm transition-all duration-150 select-none ${
            isOpen ? "rotate-45 bg-neutral-100" : "hover:bg-neutral-50"
          } ${isDragging ? "cursor-grabbing scale-95" : "cursor-default active:scale-95"}`}
        >
          <Plus className="h-6 w-6 text-black" />
        </button>
      </div>
    </>
  )
}
