"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Database, Palette, Tag, TrendingUp, BookOpen } from "lucide-react"

interface DesignLibrarySidebarProps {
  libraryStats?: {
    totalDesigns: number
    industries: number
    avgQuality: number
    recentlyAdded: number
  }
}

export function DesignLibrarySidebar({ libraryStats }: DesignLibrarySidebarProps) {
  const stats = libraryStats || {
    totalDesigns: 0,
    industries: 0,
    avgQuality: 0,
    recentlyAdded: 0,
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-200/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-600" />
            Design Library Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Designs</span>
              <span className="font-semibold text-foreground">{stats.totalDesigns}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Industries</span>
              <span className="font-semibold text-foreground">{stats.industries}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Avg Quality</span>
              <Badge variant="outline" className="text-xs h-6">
                {stats.avgQuality}/10
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Added This Week</span>
              <span className="font-semibold text-green-600">{stats.recentlyAdded}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Palette className="h-3.5 w-3.5" />
          Design Tips
        </h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="bg-blue-500/5 border border-blue-200/30 rounded p-2">
            <p className="font-medium text-blue-900 mb-1">Catalog Systematically</p>
            <p>Tag designs by industry, style, and quality tier for better searchability.</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-200/30 rounded p-2">
            <p className="font-medium text-amber-900 mb-1">Quality Over Quantity</p>
            <p>Focus on 7+ quality scores. Premium references will elevate your future designs.</p>
          </div>
          <div className="bg-green-500/5 border border-green-200/30 rounded p-2">
            <p className="font-medium text-green-900 mb-1">Regular Updates</p>
            <p>Add new design trends weekly to keep your library current and relevant.</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" />
          Quick Reference
        </h4>
        <div className="space-y-1 text-xs">
          <div className="bg-muted/50 rounded p-2">
            <p className="font-medium text-foreground mb-0.5">Import Excel</p>
            <p className="text-muted-foreground">Columns: URL, Category, Industry, Notes</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="font-medium text-foreground mb-0.5">Catalog Design</p>
            <p className="text-muted-foreground">Enter URL, colors, fonts, layout details</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="font-medium text-foreground mb-0.5">Quality Tiers</p>
            <p className="text-muted-foreground">9-10: Premium | 7-8: Production | 5-6: Reference</p>
          </div>
        </div>
      </div>
    </div>
  )
}
