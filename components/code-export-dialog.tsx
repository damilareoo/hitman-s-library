"use client"

import { useState } from "react"
import type { Node, Edge } from "@xyflow/react"
import { Copy, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateAISDKCode, generateRouteHandlerCode } from "@/lib/code-generator"

type CodeExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: Node[]
  edges: Edge[]
}

export function CodeExportDialog({ open, onOpenChange, nodes, edges }: CodeExportDialogProps) {
  const [copied, setCopied] = useState(false)

  const workflowCode = generateAISDKCode(nodes, edges)
  const routeHandlerCode = generateRouteHandlerCode(nodes, edges)

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Export Code</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="workflow" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="workflow" className="text-sm">
              Function
            </TabsTrigger>
            <TabsTrigger value="route" className="text-sm">
              Route
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-end gap-1.5 mb-3">
              <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => handleCopy(workflowCode)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded border border-border bg-secondary p-4 min-h-0">
              <code className="text-sm font-mono text-foreground">{workflowCode}</code>
            </pre>
          </TabsContent>

          <TabsContent value="route" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-end gap-1.5 mb-3">
              <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => handleCopy(routeHandlerCode)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded border border-border bg-secondary p-4 min-h-0">
              <code className="text-sm font-mono text-foreground">{routeHandlerCode}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
