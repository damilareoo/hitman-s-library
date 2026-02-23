"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Loader2, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Node, Edge } from "@xyflow/react"

type WorkflowPromptBarProps = {
  onWorkflowGenerated: (nodes: Node[], edges: Edge[]) => void
  existingNodes: Node[]
  existingEdges: Edge[]
  rightPanelOpen?: boolean
}

export function WorkflowPromptBar({
  onWorkflowGenerated,
  existingNodes,
  existingEdges,
  rightPanelOpen = false,
}: WorkflowPromptBarProps) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          existingNodes: existingNodes.length > 0 ? existingNodes : undefined,
          existingEdges: existingEdges.length > 0 ? existingEdges : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate workflow")
      }

      const { nodes, edges } = await response.json()
      onWorkflowGenerated(nodes, edges)
      setPrompt("")
    } catch (error) {
      console.error("Error generating workflow:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div
      className="fixed bottom-4 z-50 w-full max-w-lg px-4 transition-all duration-300"
      style={{
        left: rightPanelOpen ? "calc(50% - 192px)" : "50%",
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Build your design library: import, catalog, search..."
          className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
          disabled={isGenerating}
        />
        <Button
          size="icon"
          className="h-8 w-8 rounded"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
