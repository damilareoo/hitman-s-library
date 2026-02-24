"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Search, Palette, BookOpen, Sparkles, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface DesignSource {
  id: number
  url?: string
  source_type: string
  industry_name: string
  quality_score: number
  tags: string
  pattern_count: number
  color_count: number
  typography_count: number
}

interface DesignContext {
  colors: Array<{
    primary: string
    secondary: string
    accent: string
    palette_name: string
    accessibility_compliant: boolean
  }>
  typography: Array<{
    font_family: string
    heading_size: number
    body_size: number
    line_height: number
  }>
  patterns: Array<{
    pattern_name: string
    description: string
    pattern_type: string
    code_snippet: string
  }>
  design_systems: Array<{
    style_name: string
    components: string[]
    design_tokens: Record<string, unknown>
  }>
}

export function DesignPanel() {
  const [activeTab, setActiveTab] = useState("browse")
  const [industries, setIndustries] = useState<Array<{ id: number; name: string }>>([])
  const [selectedIndustry, setSelectedIndustry] = useState("")
  const [designSources, setDesignSources] = useState<DesignSource[]>([])
  const [designContext, setDesignContext] = useState<DesignContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Load industries on mount
  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const response = await fetch("/api/design-intelligence/search?action=industries")
        const data = await response.json()
        if (data.success) {
          setIndustries(data.industries)
        }
      } catch (error) {
        console.error("Failed to load industries:", error)
      }
    }
    loadIndustries()
  }, [])

  const handleLoadByIndustry = async () => {
    if (!selectedIndustry) return

    setLoading(true)
    try {
      const response = await fetch("/api/design-intelligence/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search-by-industry",
          industry: selectedIndustry,
          limit: 10,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setDesignSources(data.results)
      }
    } catch (error) {
      console.error("Failed to load designs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadContext = async () => {
    if (!selectedIndustry) return

    setLoading(true)
    try {
      const response = await fetch("/api/design-intelligence/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-context",
          industry: selectedIndustry,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setDesignContext(data.context)
      }
    } catch (error) {
      console.error("Failed to load context:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyColor = (colorHex: string, colorName?: string) => {
    navigator.clipboard.writeText(colorHex).then(() => {
      // Immediate visual feedback
      setCopiedColor(colorHex)
      const displayName = colorName || colorHex
      setToastMessage(`Copied "${displayName}"`)
      
      // Haptic feedback for supported browsers
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
      
      // Clear copied state after animation completes
      setTimeout(() => {
        setCopiedColor(null)
      }, 1500)
      
      // Clear toast after full animation
      setTimeout(() => {
        setToastMessage(null)
      }, 2200)
    }).catch((err) => {
      console.error("[v0] Copy failed:", err)
      setToastMessage("Failed to copy")
      setTimeout(() => setToastMessage(null), 2000)
    })
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <div>
            <CardTitle className="text-base">Design Knowledge Base</CardTitle>
            <CardDescription className="text-xs">
              Browse and manage your design library
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div className="space-y-2">
              <Label className="text-xs">Industry</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select industry..." />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind.id} value={ind.name}>
                      {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Search designs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <Button
              size="sm"
              onClick={handleLoadByIndustry}
              disabled={!selectedIndustry || loading}
              className="w-full text-xs h-8"
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Load Designs
            </Button>

            <ScrollArea className="flex-1 rounded border">
              <div className="p-3 space-y-2">
                {designSources.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No designs found
                  </p>
                ) : (
                  designSources.map((source) => (
                    <Card key={source.id} className="p-2">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-blue-500 hover:underline truncate block"
                              >
                                {new URL(source.url).hostname}
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {source.source_type} • Quality: {source.quality_score}/10
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {source.pattern_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {source.pattern_count} patterns
                            </Badge>
                          )}
                          {source.color_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {source.color_count} palettes
                            </Badge>
                          )}
                          {source.typography_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {source.typography_count} fonts
                            </Badge>
                          )}
                        </div>

                        {source.tags && (
                          <p className="text-xs text-muted-foreground">
                            {source.tags.split(",").slice(0, 3).join(", ")}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="context" className="flex-1 flex flex-col gap-3 overflow-hidden">
            <Button
              size="sm"
              onClick={handleLoadContext}
              disabled={!selectedIndustry || loading}
              className="w-full text-xs h-8"
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Load Context
            </Button>

            {toastMessage && (
              <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50">
                <div className="toast-container bg-foreground text-background px-4 py-2.5 rounded-md text-xs font-mono shadow-lg border border-foreground/80">
                  <div className="flex items-center gap-2 animate-toast-content">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span>{toastMessage}</span>
                  </div>
                </div>
              </div>
            )}

            {designContext && (
              <ScrollArea className="flex-1 rounded border">
                <div className="p-3 space-y-3">
                  {designContext.colors && designContext.colors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Color Palettes
                      </p>
                      {designContext.colors.map((color, i) => (
                        <div key={i} className="text-xs space-y-1 ml-4 mb-2 animate-content-fade" style={{ animationDelay: `${i * 100}ms` }}>
                          <p className="font-mono">{color.palette_name}</p>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleCopyColor(color.primary, "Primary")}
                              className={cn(
                                "color-swatch-interactive relative w-8 h-8 rounded border",
                                "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                "active:scale-95",
                                copiedColor === color.primary && "animate-color-success animate-color-ring color-copied"
                              )}
                              style={{ backgroundColor: color.primary }}
                              title={`Primary: ${color.primary}`}
                              aria-label={`Copy primary color ${color.primary}`}
                            >
                              {copiedColor === color.primary && (
                                <Check className="h-3 w-3 text-white absolute inset-0 m-auto animate-check-appear" />
                              )}
                            </button>
                            {color.secondary && (
                              <button
                                onClick={() => handleCopyColor(color.secondary, "Secondary")}
                                className={cn(
                                  "color-swatch-interactive relative w-8 h-8 rounded border",
                                  "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                  "active:scale-95",
                                  copiedColor === color.secondary && "animate-color-success animate-color-ring color-copied"
                                )}
                                style={{ backgroundColor: color.secondary }}
                                title={`Secondary: ${color.secondary}`}
                                aria-label={`Copy secondary color ${color.secondary}`}
                              >
                                {copiedColor === color.secondary && (
                                  <Check className="h-3 w-3 text-white absolute inset-0 m-auto animate-check-appear" />
                                )}
                              </button>
                            )}
                            {color.accent && (
                              <button
                                onClick={() => handleCopyColor(color.accent, "Accent")}
                                className={cn(
                                  "color-swatch-interactive relative w-8 h-8 rounded border",
                                  "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                  "active:scale-95",
                                  copiedColor === color.accent && "animate-color-success animate-color-ring color-copied"
                                )}
                                style={{ backgroundColor: color.accent }}
                                title={`Accent: ${color.accent}`}
                                aria-label={`Copy accent color ${color.accent}`}
                              >
                                {copiedColor === color.accent && (
                                  <Check className="h-3 w-3 text-white absolute inset-0 m-auto animate-check-appear" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {designContext.typography && designContext.typography.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2">Typography</p>
                      {designContext.typography.map((typo, i) => (
                        <div key={i} className="text-xs space-y-0.5 ml-4 mb-2">
                          <p className="font-mono">{typo.font_family}</p>
                          <p className="text-muted-foreground">
                            Body: {typo.body_size}px • Line height: {typo.line_height}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {designContext.patterns && designContext.patterns.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Design Patterns
                      </p>
                      {designContext.patterns.slice(0, 3).map((pattern, i) => (
                        <div key={i} className="text-xs space-y-1 ml-4 mb-2">
                          <p className="font-medium">{pattern.pattern_name}</p>
                          <p className="text-muted-foreground">{pattern.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
