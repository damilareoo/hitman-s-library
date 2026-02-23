"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Globe, Loader2, AlertCircle, Type } from "lucide-react"
import { TypographyDisplay } from "@/components/typography-display"

interface DesignItem {
  id: number
  url: string
  industry_name: string
  quality_score: number
  tags: string
  analyzed_content: Record<string, unknown>
  heading_fonts?: string | string[]
  body_fonts?: string | string[]
  mono_fonts?: string | string[]
}

export function DesignBrowser() {
  const [designs, setDesigns] = useState<DesignItem[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDesigns()
    loadIndustries()
  }, [])

  const loadDesigns = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/design/core?action=list")
      const result = await response.json()
      if (result.success) {
        setDesigns(result.data || [])
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designs")
    } finally {
      setLoading(false)
    }
  }

  const loadIndustries = async () => {
    try {
      const response = await fetch("/api/design/core?action=industries")
      const result = await response.json()
      if (result.success) {
        const industryNames = result.data.map((ind: { industry_name: string }) => ind.industry_name)
        setIndustries(industryNames)
      }
    } catch (err) {
      console.error("Failed to load industries:", err)
    }
  }

  const filteredDesigns =
    selectedIndustry === "all" ? designs : designs.filter((d) => d.industry_name === selectedIndustry)

  const getQualityBadge = (score: number) => {
    if (score >= 9) return <Badge className="bg-emerald-500">Premium ({score})</Badge>
    if (score >= 7) return <Badge className="bg-blue-500">Production ({score})</Badge>
    return <Badge variant="outline">Reference ({score})</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Filter by Industry</label>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={loadDesigns} variant="outline">
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDesigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>No designs found. Start by analyzing and storing design references.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredDesigns.map((design) => (
            <Card key={design.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <a
                        href={design.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline truncate"
                      >
                        {design.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                      </a>
                    </div>
                    <CardDescription className="text-xs">{design.industry_name}</CardDescription>
                  </div>
                  {getQualityBadge(design.quality_score)}
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-3">
                {design.tags && (
                  <div className="flex flex-wrap gap-1">
                    {design.tags.split(",").map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Typography Preview */}
                {(design.heading_fonts || design.body_fonts || design.mono_fonts) && (
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Typefaces</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      {/* Heading Fonts */}
                      {design.heading_fonts && (
                        <div>
                          <p className="text-xs font-semibold text-foreground/70 mb-1">Headings:</p>
                          <div className="flex flex-wrap gap-1">
                            {(typeof design.heading_fonts === 'string' 
                              ? design.heading_fonts.split(',').map(f => f.trim()) 
                              : design.heading_fonts
                            ).slice(0, 2).map((font) => (
                              <Badge key={font} variant="outline" className="text-xs font-mono">
                                {font}
                              </Badge>
                            ))}
                            {(typeof design.heading_fonts === 'string' 
                              ? design.heading_fonts.split(',').length 
                              : design.heading_fonts.length
                            ) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(typeof design.heading_fonts === 'string' 
                                  ? design.heading_fonts.split(',').length 
                                  : design.heading_fonts.length) - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Body Fonts */}
                      {design.body_fonts && (
                        <div>
                          <p className="text-xs font-semibold text-foreground/70 mb-1">Body:</p>
                          <div className="flex flex-wrap gap-1">
                            {(typeof design.body_fonts === 'string' 
                              ? design.body_fonts.split(',').map(f => f.trim()) 
                              : design.body_fonts
                            ).slice(0, 2).map((font) => (
                              <Badge key={font} variant="outline" className="text-xs font-mono">
                                {font}
                              </Badge>
                            ))}
                            {(typeof design.body_fonts === 'string' 
                              ? design.body_fonts.split(',').length 
                              : design.body_fonts.length
                            ) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(typeof design.body_fonts === 'string' 
                                  ? design.body_fonts.split(',').length 
                                  : design.body_fonts.length) - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Mono Fonts */}
                      {design.mono_fonts && (
                        <div>
                          <p className="text-xs font-semibold text-foreground/70 mb-1">Mono:</p>
                          <div className="flex flex-wrap gap-1">
                            {(typeof design.mono_fonts === 'string' 
                              ? design.mono_fonts.split(',').map(f => f.trim()) 
                              : design.mono_fonts
                            ).slice(0, 2).map((font) => (
                              <Badge key={font} variant="outline" className="text-xs font-mono">
                                {font}
                              </Badge>
                            ))}
                            {(typeof design.mono_fonts === 'string' 
                              ? design.mono_fonts.split(',').length 
                              : design.mono_fonts.length
                            ) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(typeof design.mono_fonts === 'string' 
                                  ? design.mono_fonts.split(',').length 
                                  : design.mono_fonts.length) - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Total: {filteredDesigns.length} designs</p>
    </div>
  )
}
