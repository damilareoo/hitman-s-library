-- Design Memory System Schema v2
-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS design_embeddings CASCADE;
DROP TABLE IF EXISTS design_styles CASCADE;
DROP TABLE IF EXISTS design_typography CASCADE;
DROP TABLE IF EXISTS design_colors CASCADE;
DROP TABLE IF EXISTS design_patterns CASCADE;
DROP TABLE IF EXISTS excel_imports CASCADE;
DROP TABLE IF EXISTS design_sources CASCADE;
DROP TABLE IF EXISTS design_industries CASCADE;

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Industry categorization (created first as it has no dependencies)
CREATE TABLE design_industries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  typical_patterns TEXT[],
  typical_colors TEXT[],
  typical_fonts TEXT[],
  example_sources INTEGER[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Main table for design sources (links, files, images)
CREATE TABLE design_sources (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_url TEXT,
  source_name VARCHAR(255),
  file_path TEXT,
  thumbnail_url TEXT,
  industry VARCHAR(100),
  tags TEXT[],
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Design patterns extracted from sources
CREATE TABLE design_patterns (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id) ON DELETE CASCADE,
  pattern_type VARCHAR(100) NOT NULL,
  pattern_name VARCHAR(255),
  description TEXT,
  layout_structure JSONB,
  spacing_system JSONB,
  responsive_behavior JSONB,
  css_classes TEXT,
  html_structure TEXT,
  screenshot_url TEXT,
  quality_score DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Color palettes extracted from designs
CREATE TABLE design_colors (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id) ON DELETE CASCADE,
  palette_name VARCHAR(255),
  primary_color VARCHAR(50),
  secondary_color VARCHAR(50),
  accent_color VARCHAR(50),
  background_color VARCHAR(50),
  text_color VARCHAR(50),
  muted_color VARCHAR(50),
  all_colors JSONB,
  color_harmony VARCHAR(50),
  mood VARCHAR(100),
  industry_fit TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Typography systems
CREATE TABLE design_typography (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id) ON DELETE CASCADE,
  heading_font VARCHAR(255),
  body_font VARCHAR(255),
  mono_font VARCHAR(255),
  font_scale JSONB,
  line_heights JSONB,
  letter_spacing JSONB,
  font_weights JSONB,
  pairing_notes TEXT,
  mood VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Overall design styles/languages
CREATE TABLE design_styles (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id) ON DELETE CASCADE,
  style_name VARCHAR(255),
  characteristics JSONB,
  border_radius VARCHAR(50),
  shadow_style VARCHAR(100),
  animation_style VARCHAR(100),
  density VARCHAR(50),
  visual_hierarchy_notes TEXT,
  accessibility_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector embeddings for semantic search
CREATE TABLE design_embeddings (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id) ON DELETE CASCADE,
  pattern_id INTEGER REFERENCES design_patterns(id) ON DELETE CASCADE,
  embedding_type VARCHAR(50),
  embedding VECTOR(1536),
  text_content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Excel import tracking
CREATE TABLE excel_imports (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255),
  sheet_name VARCHAR(255),
  column_mapping JSONB,
  last_import_at TIMESTAMP,
  total_links INTEGER DEFAULT 0,
  processed_links INTEGER DEFAULT 0,
  failed_links INTEGER DEFAULT 0,
  auto_sync BOOLEAN DEFAULT FALSE,
  sync_interval_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_design_sources_industry ON design_sources(industry);
CREATE INDEX idx_design_sources_type ON design_sources(source_type);
CREATE INDEX idx_design_sources_tags ON design_sources USING GIN(tags);
CREATE INDEX idx_design_patterns_type ON design_patterns(pattern_type);
CREATE INDEX idx_design_patterns_source ON design_patterns(source_id);
CREATE INDEX idx_design_colors_source ON design_colors(source_id);
CREATE INDEX idx_design_typography_source ON design_typography(source_id);
CREATE INDEX idx_design_styles_source ON design_styles(source_id);
CREATE INDEX idx_design_embeddings_source ON design_embeddings(source_id);

-- Insert common industries
INSERT INTO design_industries (name, description, typical_patterns, typical_colors, typical_fonts) VALUES
('SaaS', 'Software as a Service products', ARRAY['hero-gradient', 'feature-grid', 'pricing-cards', 'testimonials'], ARRAY['blue', 'purple', 'teal'], ARRAY['Inter', 'Geist', 'SF Pro']),
('E-commerce', 'Online retail and shopping', ARRAY['product-grid', 'hero-carousel', 'filters-sidebar', 'cart-drawer'], ARRAY['black', 'white', 'accent-warm'], ARRAY['Plus Jakarta Sans', 'DM Sans']),
('Fintech', 'Financial technology products', ARRAY['dashboard', 'stats-cards', 'charts', 'tables'], ARRAY['green', 'blue', 'dark'], ARRAY['IBM Plex Sans', 'Inter', 'Roboto Mono']),
('Healthcare', 'Medical and health services', ARRAY['trust-badges', 'service-cards', 'booking-flow'], ARRAY['blue', 'green', 'white'], ARRAY['Open Sans', 'Lato', 'Source Sans Pro']),
('Creative Agency', 'Design and creative services', ARRAY['portfolio-grid', 'case-study', 'team-section'], ARRAY['bold-accent', 'monochrome', 'gradient'], ARRAY['Monument Extended', 'Clash Display', 'Space Grotesk']),
('Real Estate', 'Property and real estate', ARRAY['property-cards', 'map-view', 'filters', 'gallery'], ARRAY['navy', 'gold', 'cream'], ARRAY['Playfair Display', 'Montserrat']),
('Education', 'Learning and educational platforms', ARRAY['course-cards', 'progress-tracking', 'lesson-view'], ARRAY['blue', 'orange', 'green'], ARRAY['Nunito', 'Poppins', 'Lato']),
('Restaurant', 'Food and dining establishments', ARRAY['menu-grid', 'hero-image', 'reservation-form'], ARRAY['warm-tones', 'black', 'cream'], ARRAY['Cormorant Garamond', 'Josefin Sans']),
('Portfolio', 'Personal and professional portfolios', ARRAY['project-showcase', 'about-section', 'contact-form'], ARRAY['monochrome', 'single-accent'], ARRAY['Space Mono', 'JetBrains Mono', 'Syne']),
('Media', 'News and media publications', ARRAY['article-grid', 'featured-story', 'sidebar-widgets'], ARRAY['black', 'white', 'red-accent'], ARRAY['Georgia', 'Merriweather', 'Source Serif Pro']);
