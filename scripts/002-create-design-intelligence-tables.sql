-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Design references table - stores analyzed design patterns
CREATE TABLE IF NOT EXISTS design_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('url', 'image', 'file', 'excel', 'manual')),
  source_url TEXT,
  source_name VARCHAR(500),
  
  -- Design metadata
  industry VARCHAR(100), -- e.g., 'SaaS', 'E-commerce', 'Portfolio', 'Agency', 'Healthcare'
  style_category VARCHAR(100), -- e.g., 'Minimalist', 'Bold', 'Corporate', 'Playful', 'Luxury'
  design_era VARCHAR(50), -- e.g., '2024-modern', 'brutalist', 'neo-morphism'
  
  -- Extracted design tokens
  color_palette JSONB DEFAULT '[]', -- Array of hex colors with roles
  typography JSONB DEFAULT '{}', -- Font families, sizes, weights, line-heights
  spacing_system JSONB DEFAULT '{}', -- Spacing scale, padding patterns
  layout_patterns JSONB DEFAULT '[]', -- Grid systems, section structures
  component_patterns JSONB DEFAULT '[]', -- Button styles, card designs, nav patterns
  
  -- Visual analysis
  visual_hierarchy TEXT, -- Description of visual flow
  whitespace_usage VARCHAR(50), -- 'generous', 'balanced', 'compact'
  animation_style VARCHAR(100), -- 'subtle', 'dynamic', 'minimal', 'none'
  imagery_style VARCHAR(100), -- 'photography', 'illustration', '3d', 'abstract'
  
  -- Quality metrics (1-10 scale)
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  accessibility_score INTEGER CHECK (accessibility_score >= 1 AND accessibility_score <= 10),
  modernity_score INTEGER CHECK (modernity_score >= 1 AND modernity_score <= 10),
  
  -- Full analysis text (for AI context)
  full_analysis TEXT,
  
  -- Vector embedding for semantic search
  embedding vector(1536),
  
  -- Tags for filtering
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Design patterns library - reusable UI patterns
CREATE TABLE IF NOT EXISTS design_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'hero', 'navigation', 'footer', 'card', 'form', 'cta', 'pricing', 'testimonial'
  
  -- Pattern details
  description TEXT,
  use_cases TEXT[], -- When to use this pattern
  best_for_industries TEXT[], -- Which industries this works well for
  
  -- Visual properties
  layout_type VARCHAR(50), -- 'centered', 'split', 'asymmetric', 'grid', 'masonry'
  color_approach VARCHAR(100), -- 'monochromatic', 'complementary', 'analogous', 'triadic'
  typography_approach TEXT,
  spacing_approach TEXT,
  
  -- Code/implementation hints
  tailwind_classes TEXT,
  css_properties JSONB DEFAULT '{}',
  
  -- Example references
  example_urls TEXT[] DEFAULT '{}',
  example_image_urls TEXT[] DEFAULT '{}',
  
  -- Vector embedding
  embedding vector(1536),
  
  -- Metadata
  quality_tier VARCHAR(20) DEFAULT 'standard' CHECK (quality_tier IN ('standard', 'premium', 'exceptional')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Design system presets - complete design systems
CREATE TABLE IF NOT EXISTS design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Target context
  target_industry VARCHAR(100),
  target_audience TEXT,
  brand_personality TEXT[], -- e.g., ['professional', 'innovative', 'trustworthy']
  
  -- Complete design tokens
  colors JSONB NOT NULL DEFAULT '{}', -- Primary, secondary, accent, neutrals, semantic
  typography JSONB NOT NULL DEFAULT '{}', -- Font families, scale, weights
  spacing JSONB NOT NULL DEFAULT '{}', -- Base unit, scale
  radii JSONB NOT NULL DEFAULT '{}', -- Border radius scale
  shadows JSONB NOT NULL DEFAULT '{}', -- Shadow definitions
  
  -- Component styles
  button_styles JSONB DEFAULT '{}',
  card_styles JSONB DEFAULT '{}',
  input_styles JSONB DEFAULT '{}',
  
  -- Layout guidelines
  max_width VARCHAR(20) DEFAULT '1280px',
  grid_columns INTEGER DEFAULT 12,
  breakpoints JSONB DEFAULT '{}',
  
  -- Generated CSS variables
  css_variables TEXT,
  tailwind_config TEXT,
  
  -- Vector embedding
  embedding vector(1536),
  
  -- Metadata
  source_references UUID[] DEFAULT '{}', -- References to design_references that inspired this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Excel import tracking
CREATE TABLE IF NOT EXISTS excel_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(500),
  sheet_name VARCHAR(255),
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  column_mapping JSONB DEFAULT '{}', -- Maps Excel columns to our fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_design_references_industry ON design_references(industry);
CREATE INDEX IF NOT EXISTS idx_design_references_style ON design_references(style_category);
CREATE INDEX IF NOT EXISTS idx_design_references_tags ON design_references USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_design_references_quality ON design_references(quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_design_patterns_category ON design_patterns(category);
CREATE INDEX IF NOT EXISTS idx_design_patterns_industries ON design_patterns USING GIN(best_for_industries);

CREATE INDEX IF NOT EXISTS idx_design_systems_industry ON design_systems(target_industry);

-- Vector similarity search indexes (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_design_references_embedding ON design_references 
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_design_patterns_embedding ON design_patterns 
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_design_systems_embedding ON design_systems 
  USING hnsw (embedding vector_cosine_ops);

-- Function to search similar designs
CREATE OR REPLACE FUNCTION search_similar_designs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_industry text DEFAULT NULL,
  filter_style text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_name VARCHAR(500),
  industry VARCHAR(100),
  style_category VARCHAR(100),
  color_palette JSONB,
  typography JSONB,
  layout_patterns JSONB,
  full_analysis TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.id,
    dr.source_name,
    dr.industry,
    dr.style_category,
    dr.color_palette,
    dr.typography,
    dr.layout_patterns,
    dr.full_analysis,
    1 - (dr.embedding <=> query_embedding) as similarity
  FROM design_references dr
  WHERE 
    dr.embedding IS NOT NULL
    AND (filter_industry IS NULL OR dr.industry = filter_industry)
    AND (filter_style IS NULL OR dr.style_category = filter_style)
    AND 1 - (dr.embedding <=> query_embedding) > match_threshold
  ORDER BY dr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get design recommendations for a prompt
CREATE OR REPLACE FUNCTION get_design_recommendations(
  query_embedding vector(1536),
  target_industry text DEFAULT NULL,
  min_quality int DEFAULT 7
)
RETURNS TABLE (
  patterns JSONB,
  color_suggestions JSONB,
  typography_suggestions JSONB,
  layout_suggestions JSONB,
  reference_count int
)
LANGUAGE plpgsql
AS $$
DECLARE
  relevant_refs RECORD;
  all_patterns JSONB := '[]'::JSONB;
  all_colors JSONB := '[]'::JSONB;
  all_typography JSONB := '[]'::JSONB;
  all_layouts JSONB := '[]'::JSONB;
  ref_count int := 0;
BEGIN
  -- Aggregate patterns from similar designs
  FOR relevant_refs IN 
    SELECT 
      dr.color_palette,
      dr.typography,
      dr.layout_patterns,
      dr.component_patterns
    FROM design_references dr
    WHERE 
      dr.embedding IS NOT NULL
      AND dr.quality_score >= min_quality
      AND (target_industry IS NULL OR dr.industry = target_industry)
    ORDER BY dr.embedding <=> query_embedding
    LIMIT 5
  LOOP
    all_colors := all_colors || relevant_refs.color_palette;
    all_typography := all_typography || to_jsonb(relevant_refs.typography);
    all_layouts := all_layouts || relevant_refs.layout_patterns;
    all_patterns := all_patterns || relevant_refs.component_patterns;
    ref_count := ref_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT 
    all_patterns,
    all_colors,
    all_typography,
    all_layouts,
    ref_count;
END;
$$;
