'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, BookOpen, Palette, Settings } from 'lucide-react'

export function DesignLibraryInfo() {
  const [stats, setStats] = useState({
    total: 0,
    byIndustry: {} as Record<string, number>,
  })

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-4">
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Design Library Builder</CardTitle>
              <CardDescription>Organize, catalog, and search your design references</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Import Sources</p>
                  <p className="text-sm font-semibold">Excel, URLs, Images</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 border-cyan-500/20 bg-cyan-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Catalog</p>
                  <p className="text-sm font-semibold">10+ Industries</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Organize</p>
                  <p className="text-sm font-semibold">By Style & Quality</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Search</p>
                  <p className="text-sm font-semibold">Find Instantly</p>
                </div>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workflow">Quick Start</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workflow" className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium">Import Excel Spreadsheet</p>
                    <p className="text-xs text-muted-foreground">Use the Import Excel node to batch load your design links</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium">Catalog Design Details</p>
                    <p className="text-xs text-muted-foreground">Use Catalog Design node to enter colors, typography, and layout notes</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium">Save to Library</p>
                    <p className="text-xs text-muted-foreground">Store with industry, style, and quality rating (1-10)</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">4</div>
                  <div>
                    <p className="font-medium">Search Library</p>
                    <p className="text-xs text-muted-foreground">Use Search Library node to find designs by industry or quality</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <div>
                    <p className="font-medium">Multi-source Import</p>
                    <p className="text-xs text-muted-foreground">Import from Excel, URLs, or manual entries</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-cyan-500">✓</span>
                  <div>
                    <p className="font-medium">Rich Metadata</p>
                    <p className="text-xs text-muted-foreground">Colors, typography, layouts, and custom notes</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-indigo-500">✓</span>
                  <div>
                    <p className="font-medium">Quality Scoring</p>
                    <p className="text-xs text-muted-foreground">Rate designs 1-10 to filter premium references</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-amber-500">✓</span>
                  <div>
                    <p className="font-medium">Industry Organization</p>
                    <p className="text-xs text-muted-foreground">SaaS, E-commerce, FinTech, and more</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-purple-500">✓</span>
                  <div>
                    <p className="font-medium">Persistent Database</p>
                    <p className="text-xs text-muted-foreground">All designs saved in your Neon database</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
