-- Add persistence layer for design library
-- This ensures all links are permanently stored in the database

-- Create design_library table if it doesn't exist
CREATE TABLE IF NOT EXISTS design_library (
  id SERIAL PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  source_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  tags TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on source_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_design_library_url ON design_library(source_url);
CREATE INDEX IF NOT EXISTS idx_design_library_industry ON design_library(industry);
CREATE INDEX IF NOT EXISTS idx_design_library_created ON design_library(created_at DESC);

-- Add backup table for disaster recovery
CREATE TABLE IF NOT EXISTS design_library_backup (
  id SERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  tags TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  backed_up_at TIMESTAMP DEFAULT NOW()
);

-- Create index for backups
CREATE INDEX IF NOT EXISTS idx_design_library_backup_created ON design_library_backup(backed_up_at DESC);

-- Add function to automatically backup designs when inserted
CREATE OR REPLACE FUNCTION backup_design_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO design_library_backup (source_url, source_name, industry, tags, metadata, created_at)
  VALUES (NEW.source_url, NEW.source_name, NEW.industry, NEW.tags, NEW.metadata, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic backups
DROP TRIGGER IF EXISTS design_library_backup_trigger ON design_library;
CREATE TRIGGER design_library_backup_trigger
AFTER INSERT ON design_library
FOR EACH ROW
EXECUTE FUNCTION backup_design_on_insert();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_design_library_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS design_library_timestamp_trigger ON design_library;
CREATE TRIGGER design_library_timestamp_trigger
BEFORE UPDATE ON design_library
FOR EACH ROW
EXECUTE FUNCTION update_design_library_timestamp();
