"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutTemplate, RefreshCw, FileText, Search, GitBranch, Palette, FileSpreadsheet, Database } from "lucide-react"
import { WORKFLOW_TEMPLATES } from "@/lib/constants"
import type { Node, Edge } from "@xyflow/react"

interface TemplatesMenuProps {
  onLoadTemplate: (nodes: Node[], edges: Edge[]) => void
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "content-loop": <RefreshCw className="h-4 w-4" />,
  "research-loop": <Search className="h-4 w-4" />,
  "simple-generation": <FileText className="h-3.5 w-3.5" />,
  "conditional-flow": <GitBranch className="h-3.5 w-3.5" />,
  "design-bulk-import": <FileSpreadsheet className="h-4 w-4 text-emerald-500" />,
  "design-url-analyzer": <Palette className="h-4 w-4 text-cyan-500" />,
  "design-assisted-generation": <Database className="h-4 w-4 text-indigo-500" />,
}

export function TemplatesMenu({ onLoadTemplate }: TemplatesMenuProps) {
  const [open, setOpen] = useState(false)

  const handleSelectTemplate = (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      onLoadTemplate(template.nodes as Node[], template.edges as Edge[])
    }
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-r-none">
          <LayoutTemplate className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide py-1.5 px-2">
          Design Library Workflows
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {WORKFLOW_TEMPLATES.filter((t) => t.id?.includes("design")).map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => handleSelectTemplate(template.id)}
            className="flex flex-col items-start gap-0.5 py-2 px-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {TEMPLATE_ICONS[template.id] || <Palette className="h-3.5 w-3.5" />}
              </span>
              <span className="text-sm font-medium">{template.name}</span>
            </div>
            <span className="text-xs text-muted-foreground pl-5">{template.description}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="my-1" />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide py-1.5 px-2 mt-2">
          Standard Workflows
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {WORKFLOW_TEMPLATES.filter((t) => !t.id?.includes("design")).map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => handleSelectTemplate(template.id)}
            className="flex flex-col items-start gap-0.5 py-2 px-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {TEMPLATE_ICONS[template.id] || <FileText className="h-3.5 w-3.5" />}
              </span>
              <span className="text-sm font-medium">{template.name}</span>
            </div>
            <span className="text-xs text-muted-foreground pl-5">{template.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
