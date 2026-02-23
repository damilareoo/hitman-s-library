import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Types for Design Intelligence System
export interface ColorToken {
  hex: string
  role: "primary" | "secondary" | "accent" | "background" | "text" | "border" | "success" | "warning" | "error"
  name?: string
  usage?: string
}

export interface TypographyToken {
  fontFamily: string
  role: "heading" | "body" | "accent" | "mono"
  weights: number[]
  sizes?: Record<string, string>
  lineHeights?: Record<string, string>
}

export interface LayoutPattern {
  name: string
  type: "hero" | "grid" | "split" | "centered" | "asymmetric" | "masonry" | "sidebar"
  columns?: number
  gap?: string
  maxWidth?: string
  description?: string
}

export interface ComponentPattern {
  name: string
  category: string
  description: string
  tailwindClasses?: string
  cssProperties?: Record<string, string>
}

export interface DesignReference {
  id: string
  source_type: "url" | "image" | "file" | "excel" | "manual"
  source_url?: string
  source_name?: string
  industry?: string
  style_category?: string
  design_era?: string
  color_palette: ColorToken[]
  typography: Record<string, TypographyToken>
  spacing_system: Record<string, string>
  layout_patterns: LayoutPattern[]
  component_patterns: ComponentPattern[]
  visual_hierarchy?: string
  whitespace_usage?: string
  animation_style?: string
  imagery_style?: string
  quality_score?: number
  accessibility_score?: number
  modernity_score?: number
  full_analysis?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface DesignPattern {
  id: string
  name: string
  category: string
  description?: string
  use_cases: string[]
  best_for_industries: string[]
  layout_type?: string
  color_approach?: string
  typography_approach?: string
  spacing_approach?: string
  tailwind_classes?: string
  css_properties?: Record<string, string>
  example_urls: string[]
  quality_tier: "standard" | "premium" | "exceptional"
}

export interface DesignSystem {
  id: string
  name: string
  description?: string
  target_industry?: string
  target_audience?: string
  brand_personality: string[]
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    foreground: string
    muted: string
    border: string
    [key: string]: string
  }
  typography: {
    fontSans: string
    fontSerif?: string
    fontMono?: string
    scale: Record<string, string>
  }
  spacing: Record<string, string>
  radii: Record<string, string>
  shadows: Record<string, string>
  css_variables?: string
  tailwind_config?: string
}

export interface DesignRecommendations {
  patterns: ComponentPattern[]
  colorSuggestions: ColorToken[]
  typographySuggestions: TypographyToken[]
  layoutSuggestions: LayoutPattern[]
  referenceCount: number
}

// ============ DESIGN REFERENCES ============

export async function saveDesignReference(
  reference: Omit<DesignReference, "id" | "created_at" | "updated_at">,
  embedding?: number[]
): Promise<DesignReference> {
  const result = await sql`
    INSERT INTO design_references (
      source_type, source_url, source_name, industry, style_category, design_era,
      color_palette, typography, spacing_system, layout_patterns, component_patterns,
      visual_hierarchy, whitespace_usage, animation_style, imagery_style,
      quality_score, accessibility_score, modernity_score, full_analysis, tags,
      embedding
    )
    VALUES (
      ${reference.source_type},
      ${reference.source_url || null},
      ${reference.source_name || null},
      ${reference.industry || null},
      ${reference.style_category || null},
      ${reference.design_era || null},
      ${JSON.stringify(reference.color_palette)},
      ${JSON.stringify(reference.typography)},
      ${JSON.stringify(reference.spacing_system)},
      ${JSON.stringify(reference.layout_patterns)},
      ${JSON.stringify(reference.component_patterns)},
      ${reference.visual_hierarchy || null},
      ${reference.whitespace_usage || null},
      ${reference.animation_style || null},
      ${reference.imagery_style || null},
      ${reference.quality_score || null},
      ${reference.accessibility_score || null},
      ${reference.modernity_score || null},
      ${reference.full_analysis || null},
      ${reference.tags},
      ${embedding ? `[${embedding.join(",")}]` : null}
    )
    RETURNING *
  `
  return result[0] as DesignReference
}

export async function getDesignReference(id: string): Promise<DesignReference | null> {
  const result = await sql`
    SELECT * FROM design_references WHERE id = ${id}
  `
  return (result[0] as DesignReference) || null
}

export async function searchDesignReferences(
  query: {
    industry?: string
    style_category?: string
    tags?: string[]
    minQuality?: number
    limit?: number
  }
): Promise<DesignReference[]> {
  const { industry, style_category, tags, minQuality = 0, limit = 20 } = query
  
  // Build dynamic query
  let conditions = "WHERE 1=1"
  if (industry) conditions += ` AND industry = '${industry}'`
  if (style_category) conditions += ` AND style_category = '${style_category}'`
  if (minQuality > 0) conditions += ` AND quality_score >= ${minQuality}`
  if (tags && tags.length > 0) conditions += ` AND tags && ARRAY[${tags.map(t => `'${t}'`).join(",")}]`
  
  const result = await sql`
    SELECT * FROM design_references 
    ${sql.unsafe(conditions)}
    ORDER BY quality_score DESC NULLS LAST, created_at DESC
    LIMIT ${limit}
  `
  return result as DesignReference[]
}

export async function searchSimilarDesigns(
  embedding: number[],
  options: {
    threshold?: number
    limit?: number
    industry?: string
    style?: string
  } = {}
): Promise<(DesignReference & { similarity: number })[]> {
  const { threshold = 0.7, limit = 10, industry, style } = options
  
  const embeddingStr = `[${embedding.join(",")}]`
  
  const result = await sql`
    SELECT 
      *,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM design_references
    WHERE 
      embedding IS NOT NULL
      ${industry ? sql`AND industry = ${industry}` : sql``}
      ${style ? sql`AND style_category = ${style}` : sql``}
      AND 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `
  return result as (DesignReference & { similarity: number })[]
}

// ============ DESIGN PATTERNS ============

export async function saveDesignPattern(
  pattern: Omit<DesignPattern, "id">,
  embedding?: number[]
): Promise<DesignPattern> {
  const result = await sql`
    INSERT INTO design_patterns (
      name, category, description, use_cases, best_for_industries,
      layout_type, color_approach, typography_approach, spacing_approach,
      tailwind_classes, css_properties, example_urls, quality_tier, embedding
    )
    VALUES (
      ${pattern.name},
      ${pattern.category},
      ${pattern.description || null},
      ${pattern.use_cases},
      ${pattern.best_for_industries},
      ${pattern.layout_type || null},
      ${pattern.color_approach || null},
      ${pattern.typography_approach || null},
      ${pattern.spacing_approach || null},
      ${pattern.tailwind_classes || null},
      ${JSON.stringify(pattern.css_properties || {})},
      ${pattern.example_urls},
      ${pattern.quality_tier},
      ${embedding ? `[${embedding.join(",")}]` : null}
    )
    RETURNING *
  `
  return result[0] as DesignPattern
}

export async function getPatternsByCategory(category: string): Promise<DesignPattern[]> {
  const result = await sql`
    SELECT * FROM design_patterns 
    WHERE category = ${category}
    ORDER BY quality_tier DESC, created_at DESC
  `
  return result as DesignPattern[]
}

export async function getPatternsByIndustry(industry: string): Promise<DesignPattern[]> {
  const result = await sql`
    SELECT * FROM design_patterns 
    WHERE ${industry} = ANY(best_for_industries)
    ORDER BY quality_tier DESC, created_at DESC
  `
  return result as DesignPattern[]
}

// ============ DESIGN SYSTEMS ============

export async function saveDesignSystem(
  system: Omit<DesignSystem, "id">,
  embedding?: number[]
): Promise<DesignSystem> {
  const result = await sql`
    INSERT INTO design_systems (
      name, description, target_industry, target_audience, brand_personality,
      colors, typography, spacing, radii, shadows, css_variables, tailwind_config, embedding
    )
    VALUES (
      ${system.name},
      ${system.description || null},
      ${system.target_industry || null},
      ${system.target_audience || null},
      ${system.brand_personality},
      ${JSON.stringify(system.colors)},
      ${JSON.stringify(system.typography)},
      ${JSON.stringify(system.spacing)},
      ${JSON.stringify(system.radii)},
      ${JSON.stringify(system.shadows)},
      ${system.css_variables || null},
      ${system.tailwind_config || null},
      ${embedding ? `[${embedding.join(",")}]` : null}
    )
    RETURNING *
  `
  return result[0] as DesignSystem
}

export async function getDesignSystemByIndustry(industry: string): Promise<DesignSystem | null> {
  const result = await sql`
    SELECT * FROM design_systems 
    WHERE target_industry = ${industry}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return (result[0] as DesignSystem) || null
}

export async function searchDesignSystems(embedding: number[], limit = 5): Promise<DesignSystem[]> {
  const embeddingStr = `[${embedding.join(",")}]`
  
  const result = await sql`
    SELECT * FROM design_systems
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `
  return result as DesignSystem[]
}

// ============ EXCEL IMPORTS ============

export async function createExcelImport(fileName: string, sheetName: string, totalRows: number) {
  const result = await sql`
    INSERT INTO excel_imports (file_name, sheet_name, total_rows)
    VALUES (${fileName}, ${sheetName}, ${totalRows})
    RETURNING *
  `
  return result[0]
}

export async function updateExcelImportProgress(id: string, processedRows: number, status: string) {
  await sql`
    UPDATE excel_imports 
    SET processed_rows = ${processedRows}, status = ${status}, updated_at = NOW()
    WHERE id = ${id}
  `
}

// ============ AGGREGATION HELPERS ============

export async function getDesignStats() {
  const result = await sql`
    SELECT 
      (SELECT COUNT(*) FROM design_references) as total_references,
      (SELECT COUNT(*) FROM design_patterns) as total_patterns,
      (SELECT COUNT(*) FROM design_systems) as total_systems,
      (SELECT COUNT(DISTINCT industry) FROM design_references WHERE industry IS NOT NULL) as unique_industries,
      (SELECT COUNT(DISTINCT style_category) FROM design_references WHERE style_category IS NOT NULL) as unique_styles,
      (SELECT AVG(quality_score) FROM design_references WHERE quality_score IS NOT NULL) as avg_quality
  `
  return result[0]
}

export async function getTopIndustries(limit = 10) {
  const result = await sql`
    SELECT industry, COUNT(*) as count
    FROM design_references
    WHERE industry IS NOT NULL
    GROUP BY industry
    ORDER BY count DESC
    LIMIT ${limit}
  `
  return result
}

export async function getTopStyles(limit = 10) {
  const result = await sql`
    SELECT style_category, COUNT(*) as count
    FROM design_references
    WHERE style_category IS NOT NULL
    GROUP BY style_category
    ORDER BY count DESC
    LIMIT ${limit}
  `
  return result
}

// ============ CONTEXT GENERATION ============

export function generateDesignContext(
  references: DesignReference[],
  patterns: DesignPattern[],
  system?: DesignSystem
): string {
  let context = "# Design Intelligence Context\n\n"
  
  if (system) {
    context += "## Active Design System\n"
    context += `Name: ${system.name}\n`
    context += `Industry: ${system.target_industry || "General"}\n`
    context += `Brand Personality: ${system.brand_personality.join(", ")}\n`
    context += `Primary Color: ${system.colors.primary}\n`
    context += `Typography: ${system.typography.fontSans}\n\n`
  }
  
  if (references.length > 0) {
    context += "## Reference Designs\n"
    references.slice(0, 5).forEach((ref, i) => {
      context += `\n### Reference ${i + 1}: ${ref.source_name || "Unnamed"}\n`
      context += `- Industry: ${ref.industry || "Unknown"}\n`
      context += `- Style: ${ref.style_category || "Unknown"}\n`
      context += `- Quality: ${ref.quality_score || "N/A"}/10\n`
      if (ref.color_palette.length > 0) {
        context += `- Colors: ${ref.color_palette.map(c => c.hex).join(", ")}\n`
      }
      if (ref.full_analysis) {
        context += `- Analysis: ${ref.full_analysis.slice(0, 500)}...\n`
      }
    })
    context += "\n"
  }
  
  if (patterns.length > 0) {
    context += "## Recommended Patterns\n"
    patterns.slice(0, 5).forEach(pattern => {
      context += `- ${pattern.name} (${pattern.category}): ${pattern.description || ""}\n`
      if (pattern.tailwind_classes) {
        context += `  Tailwind: ${pattern.tailwind_classes}\n`
      }
    })
  }
  
  return context
}

// Export all color palettes for quick access
export async function getAllColorPalettes(): Promise<{ industry: string, colors: ColorToken[] }[]> {
  const result = await sql`
    SELECT industry, color_palette as colors
    FROM design_references
    WHERE color_palette IS NOT NULL AND color_palette != '[]'
    ORDER BY quality_score DESC NULLS LAST
  `
  return result as { industry: string, colors: ColorToken[] }[]
}
