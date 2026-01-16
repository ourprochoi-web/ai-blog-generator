-- AI Blog Platform Database Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- Sources Table
-- Stores scraped content from news, papers, and articles
-- =====================================================
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('news', 'paper', 'article')),
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000) UNIQUE NOT NULL,
    content TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}',
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'processed', 'skipped', 'failed')),
    error_message TEXT,

    -- Source selection fields
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),  -- 0=unset, 1-5 manual priority
    relevance_score INTEGER DEFAULT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),  -- LLM auto-score
    is_selected BOOLEAN DEFAULT FALSE,  -- Marked for blog generation
    selection_note TEXT,  -- Why this source was selected/rejected
    reviewed_at TIMESTAMP WITH TIME ZONE,  -- When selection was made

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sources
CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_scraped_at ON sources(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
CREATE INDEX IF NOT EXISTS idx_sources_priority ON sources(priority DESC);
CREATE INDEX IF NOT EXISTS idx_sources_is_selected ON sources(is_selected) WHERE is_selected = TRUE;
CREATE INDEX IF NOT EXISTS idx_sources_relevance ON sources(relevance_score DESC NULLS LAST);

-- =====================================================
-- Articles Table
-- Stores generated blog posts
-- =====================================================
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,

    -- Content
    title VARCHAR(300) NOT NULL,
    subtitle VARCHAR(200),
    slug VARCHAR(300) UNIQUE NOT NULL,
    content TEXT NOT NULL,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    references JSONB DEFAULT '[]',
    word_count INTEGER,
    char_count INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),

    -- Edition (morning/evening)
    edition VARCHAR(10) CHECK (edition IN ('morning', 'evening')),

    -- SEO
    meta_description VARCHAR(160),
    og_image_url VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,

    -- LLM metadata
    llm_model VARCHAR(50),
    generation_time_seconds FLOAT
);

-- Indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_edition ON articles(edition);

-- =====================================================
-- Article Versions Table
-- Stores version history for articles
-- =====================================================
CREATE TABLE IF NOT EXISTS article_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_note VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);

-- =====================================================
-- Reference Checks Table
-- Logs reference link validation results
-- =====================================================
CREATE TABLE IF NOT EXISTS reference_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL,
    is_valid BOOLEAN,
    status_code INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_checks_article_id ON reference_checks(article_id);

-- =====================================================
-- Updated At Trigger Function
-- Automatically updates updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to sources table
DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to articles table
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) - Optional
-- Enable if you need fine-grained access control
-- =====================================================
-- ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reference_checks ENABLE ROW LEVEL SECURITY;

-- Example policy for public read access to published articles
-- CREATE POLICY "Public can read published articles" ON articles
--     FOR SELECT USING (status = 'published');

-- =====================================================
-- Activity Logs Table
-- Stores pipeline activity logs for monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('scrape', 'evaluate', 'generate', 'pipeline')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'error')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',  -- Additional context (counts, errors, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- =====================================================
-- Migration: Add new status values to activity_logs
-- Run this to support INTERRUPTED and TIMEOUT statuses
-- =====================================================
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_status_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_status_check
    CHECK (status IN ('running', 'success', 'error', 'interrupted', 'timeout'));

-- =====================================================
-- Migration: Add hero image async generation fields to articles
-- =====================================================
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_image_status VARCHAR(20)
    DEFAULT 'none' CHECK (hero_image_status IN ('none', 'pending', 'generating', 'completed', 'failed', 'skipped'));
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_image_error TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_image_requested_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_articles_hero_image_status ON articles(hero_image_status)
    WHERE hero_image_status = 'pending';
