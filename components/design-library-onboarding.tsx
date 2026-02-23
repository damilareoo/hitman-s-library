"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Globe, Database, Search, CheckCircle2, ArrowRight } from "lucide-react"

export function DesignLibraryOnboarding() {
  return (
    <div className="space-y-4 p-4 bg-gradient-to-b from-purple-500/5 to-transparent rounded-lg border border-purple-200/20">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-foreground">Welcome to Design Library</h3>
        <p className="text-xs text-muted-foreground">Build a curated collection of high-quality design references. Use these workflows to organize and retrieve design patterns.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="relative overflow-hidden border-emerald-200/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xs">Import Excel</CardTitle>
                <CardDescription className="text-xs">Add multiple designs at once</CardDescription>
              </div>
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Upload your spreadsheet of design links and metadata to populate your library quickly.</CardContent>
        </Card>

        <Card className="relative overflow-hidden border-cyan-200/30 bg-cyan-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xs">Catalog Design</CardTitle>
                <CardDescription className="text-xs">Manually add references</CardDescription>
              </div>
              <Globe className="h-4 w-4 text-cyan-500" />
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Enter design details directly: colors, typography, layout patterns, and industry category.</CardContent>
        </Card>

        <Card className="relative overflow-hidden border-indigo-200/30 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xs">Save to Library</CardTitle>
                <CardDescription className="text-xs">Store with quality score</CardDescription>
              </div>
              <Database className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Save cataloged designs with metadata, quality ratings, and custom tags for easy retrieval.</CardContent>
        </Card>

        <Card className="relative overflow-hidden border-amber-200/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xs">Search Library</CardTitle>
                <CardDescription className="text-xs">Find by industry/style</CardDescription>
              </div>
              <Search className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Query your library by industry category, design style, or quality score. Get instant inspiration.</CardContent>
        </Card>
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-xs font-medium text-foreground">Quick Start</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span>Import your Excel sheet of design links</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span>Run through the Bulk Import workflow</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span>Search and reference before building new projects</span>
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full text-xs h-8 justify-between bg-transparent">
        <span>Browse Workflows</span>
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  )
}
