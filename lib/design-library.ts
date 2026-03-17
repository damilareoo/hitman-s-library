import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// ============================================
// DESIGN SOURCE MANAGEMENT
// ============================================

export async function saveDesignSource(data: {
  url?: string
  file_name?: string
  source_type: "url" | "file" | "image"
  industry_id: number
  analyzed_content: Record<string, unknown>
  quality_score: number
  tags: string
}) {
  const result = await sql`
    INSERT INTO design_sources (
      url, file_name, source_type, industry_id,
      analyzed_content, quality_score, tags, analyzed_at
    ) VALUES (
      ${data.url || null},
      ${data.file_name || null},
      ${data.source_type},
      ${data.industry_id},
      ${JSON.stringify(data.analyzed_content)},
      ${data.quality_score},
      ${data.tags},
      NOW()
    )
    RETURNING *
  `

  return result[0]
}

// ============================================
// DESIGN PATTERN EXTRACTION
// ============================================

export async function saveDesignPattern(data: {
  source_id: number
  pattern_type: "layout" | "component" | "interaction" | "flow"
  pattern_name: string
  description: string
  code_snippet?: string
  visual_elements?: Record<string, unknown>
  usage_context: string
}) {
  const result = await sql`
    INSERT INTO design_patterns (
      source_id, pattern_type, pattern_name, description,
      code_snippet, visual_elements, usage_context
    ) VALUES (
      ${data.source_id},
      ${data.pattern_type},
      ${data.pattern_name},
      ${data.description},
      ${data.code_snippet || null},
      ${data.visual_elements ? JSON.stringify(data.visual_elements) : null},
      ${data.usage_context}
    )
    RETURNING *
  `

  return result[0]
}

// ============================================
// COLOR PALETTE EXTRACTION
// ============================================

export async function saveColorPalette(data: {
  source_id: number
  primary_color: string
  secondary_color?: string
  accent_color?: string
  neutral_colors?: string[]
  palette_name: string
  contrast_score: number
  accessibility_compliant: boolean
}) {
  const result = await sql`
    INSERT INTO design_colors (
      source_id, primary_color, secondary_color, accent_color,
      neutral_colors, palette_name, contrast_score, accessibility_compliant
    ) VALUES (
      ${data.source_id},
      ${data.primary_color},
      ${data.secondary_color || null},
      ${data.accent_color || null},
      ${data.neutral_colors ? JSON.stringify(data.neutral_colors) : null},
      ${data.palette_name},
      ${data.contrast_score},
      ${data.accessibility_compliant}
    )
    RETURNING *
  `

  return result[0]
}

// ============================================
// TYPOGRAPHY EXTRACTION
// ============================================

export async function saveTypography(data: {
  source_id: number
  font_family: string
  heading_size?: number
  body_size?: number
  line_height: number
  letter_spacing: number
  weight_scale?: string
  usage_context: string
}) {
  const result = await sql`
    INSERT INTO design_typography (
      source_id, font_family, heading_size, body_size,
      line_height, letter_spacing, weight_scale, usage_context
    ) VALUES (
      ${data.source_id},
      ${data.font_family},
      ${data.heading_size || null},
      ${data.body_size || null},
      ${data.line_height},
      ${data.letter_spacing},
      ${data.weight_scale || null},
      ${data.usage_context}
    )
    RETURNING *
  `

  return result[0]
}

// ============================================
// DESIGN SYSTEM STORAGE
// ============================================

export async function saveDesignSystem(data: {
  source_id: number
  system_name: string
  components: string[]
  design_tokens: Record<string, unknown>
  accessibility_features: string[]
  documentation_url?: string
}) {
  const result = await sql`
    INSERT INTO design_styles (
      source_id, style_name, components, design_tokens,
      accessibility_features, documentation_url
    ) VALUES (
      ${data.source_id},
      ${data.system_name},
      ${JSON.stringify(data.components)},
      ${JSON.stringify(data.design_tokens)},
      ${JSON.stringify(data.accessibility_features)},
      ${data.documentation_url || null}
    )
    RETURNING *
  `

  return result[0]
}

// ============================================
// SEMANTIC SEARCH WITH EMBEDDINGS
// ============================================

export async function searchDesignsByEmbedding(
  embedding: number[],
  limit: number = 5,
  minSimilarity: number = 0.7
) {
  return sql`
    SELECT
      de.id,
      de.source_id,
      de.embedding_type,
      de.text_content,
      ds.url,
      ds.source_type,
      di.industry_name,
      1 - (de.embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
    FROM design_embeddings de
    JOIN design_sources ds ON de.source_id = ds.id
    JOIN design_industries di ON ds.industry_id = di.id
    WHERE 1 - (de.embedding <=> ${JSON.stringify(embedding)}::vector) > ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `
}

// ============================================
// DESIGN RETRIEVAL BY INDUSTRY AND STYLE
// ============================================

export async function getDesignsByIndustry(industryName: string, limit: number = 10) {
  return sql`
    SELECT
      ds.*,
      di.industry_name,
      COUNT(DISTINCT dp.id) as pattern_count,
      COUNT(DISTINCT dc.id) as color_count,
      COUNT(DISTINCT dt.id) as typography_count
    FROM design_sources ds
    JOIN design_industries di ON ds.industry_id = di.id
    LEFT JOIN design_patterns dp ON ds.id = dp.source_id
    LEFT JOIN design_colors dc ON ds.id = dc.source_id
    LEFT JOIN design_typography dt ON ds.id = dt.source_id
    WHERE di.industry_name ILIKE ${industryName}
    GROUP BY ds.id, di.id
    ORDER BY ds.analyzed_at DESC
    LIMIT ${limit}
  `
}

// ============================================
// EXCEL IMPORT TRACKING
// ============================================

export async function saveExcelImport(data: {
  file_name: string
  import_date: Date
  total_rows: number
  successful_imports: number
  failed_rows: number
  error_log?: Record<string, unknown>
}) {
  const result = await sql`
    INSERT INTO excel_imports (
      file_name, import_date, total_rows,
      successful_imports, failed_rows, error_log
    ) VALUES (
      ${data.file_name},
      ${data.import_date},
      ${data.total_rows},
      ${data.successful_imports},
      ${data.failed_rows},
      ${data.error_log ? JSON.stringify(data.error_log) : null}
    )
    RETURNING *
  `

  return result[0]
}

// ============================================
// DESIGN CONTEXT RETRIEVAL FOR GENERATION
// ============================================

export async function getDesignContextForGeneration(industryId: number, styleCategory?: string) {
  const result = await sql`
    SELECT
      json_build_object(
        'colors', (
          SELECT json_agg(
            json_build_object(
              'primary', primary_color,
              'secondary', secondary_color,
              'accent', accent_color,
              'palette_name', palette_name,
              'accessibility_compliant', accessibility_compliant
            )
          )
          FROM design_colors WHERE source_id IN (
            SELECT id FROM design_sources WHERE industry_id = ${industryId}
          )
          LIMIT 5
        ),
        'typography', (
          SELECT json_agg(
            json_build_object(
              'font_family', font_family,
              'heading_size', heading_size,
              'body_size', body_size,
              'line_height', line_height
            )
          )
          FROM design_typography WHERE source_id IN (
            SELECT id FROM design_sources WHERE industry_id = ${industryId}
          )
          LIMIT 5
        ),
        'patterns', (
          SELECT json_agg(
            json_build_object(
              'pattern_name', pattern_name,
              'description', description,
              'pattern_type', pattern_type,
              'code_snippet', code_snippet
            )
          )
          FROM design_patterns WHERE source_id IN (
            SELECT id FROM design_sources WHERE industry_id = ${industryId}
          )
          LIMIT 10
        ),
        'design_systems', (
          SELECT json_agg(
            json_build_object(
              'style_name', style_name,
              'components', components,
              'design_tokens', design_tokens
            )
          )
          FROM design_styles WHERE source_id IN (
            SELECT id FROM design_sources WHERE industry_id = ${industryId}
          )
          LIMIT 3
        )
      ) as design_context
  `
  return result[0]?.design_context || null
}

export async function getIndustries() {
  return sql`SELECT * FROM design_industries ORDER BY industry_name`
}
