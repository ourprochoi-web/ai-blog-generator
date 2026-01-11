"""Article Pydantic schemas for API validation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from backend.app.models.article import ArticleEdition, ArticleStatus


class ReferenceSchema(BaseModel):
    """Schema for article reference."""

    title: str
    url: str
    verified: bool = False


class ArticleBase(BaseModel):
    """Base schema for article data."""

    title: str = Field(..., min_length=1, max_length=300)
    subtitle: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=1)


class ArticleCreate(ArticleBase):
    """Schema for creating a new article."""

    source_id: Optional[UUID] = None
    slug: Optional[str] = None  # Auto-generate if not provided
    tags: List[str] = Field(default_factory=list)
    references: List[ReferenceSchema] = Field(default_factory=list)
    meta_description: Optional[str] = Field(None, max_length=160)
    og_image_url: Optional[str] = Field(None, max_length=500)
    llm_model: Optional[str] = None
    generation_time_seconds: Optional[float] = None
    edition: Optional[ArticleEdition] = None  # morning or evening


class ArticleUpdate(BaseModel):
    """Schema for updating an article."""

    title: Optional[str] = Field(None, min_length=1, max_length=300)
    subtitle: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    references: Optional[List[ReferenceSchema]] = None
    meta_description: Optional[str] = Field(None, max_length=160)
    og_image_url: Optional[str] = Field(None, max_length=500)


class ArticleStatusUpdate(BaseModel):
    """Schema for updating article status."""

    status: ArticleStatus


class ArticleResponse(ArticleBase):
    """Schema for article response."""

    id: UUID
    source_id: Optional[UUID] = None
    slug: str
    tags: List[str] = Field(default_factory=list)
    references: List[Dict[str, Any]] = Field(default_factory=list)
    word_count: Optional[int] = None
    char_count: Optional[int] = None
    status: ArticleStatus
    edition: Optional[ArticleEdition] = None
    meta_description: Optional[str] = None
    og_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    llm_model: Optional[str] = None
    generation_time_seconds: Optional[float] = None
    # Source evaluation score (from linked source)
    source_relevance_score: Optional[int] = None

    class Config:
        from_attributes = True


class ArticleListResponse(BaseModel):
    """Schema for paginated article list response."""

    items: List[ArticleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ArticlePreviewResponse(BaseModel):
    """Schema for article preview (without saving)."""

    title: str
    subtitle: Optional[str] = None
    content: str
    tags: List[str] = Field(default_factory=list)
    references: List[ReferenceSchema] = Field(default_factory=list)
    word_count: int
    char_count: int
