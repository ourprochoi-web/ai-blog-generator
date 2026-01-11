-- Migration: Add source selection fields
-- Run this in Supabase SQL Editor to update existing tables

-- Add new status value
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_status_check;
ALTER TABLE sources ADD CONSTRAINT sources_status_check
    CHECK (status IN ('pending', 'selected', 'processed', 'skipped', 'failed'));

-- Add selection fields
ALTER TABLE sources ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS relevance_score INTEGER DEFAULT NULL;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT FALSE;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS selection_note TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add constraints
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_priority_check;
ALTER TABLE sources ADD CONSTRAINT sources_priority_check
    CHECK (priority >= 0 AND priority <= 5);

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_relevance_score_check;
ALTER TABLE sources ADD CONSTRAINT sources_relevance_score_check
    CHECK (relevance_score >= 0 AND relevance_score <= 100);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_sources_priority ON sources(priority DESC);
CREATE INDEX IF NOT EXISTS idx_sources_is_selected ON sources(is_selected) WHERE is_selected = TRUE;
CREATE INDEX IF NOT EXISTS idx_sources_relevance ON sources(relevance_score DESC NULLS LAST);
