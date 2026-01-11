"""Source Pydantic schemas for API validation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from backend.app.models.source import SourceStatus, SourceType


class SourceBase(BaseModel):
    """Base schema for source data."""

    type: SourceType
    title: str = Field(..., min_length=1, max_length=500)
    url: HttpUrl


class SourceCreate(SourceBase):
    """Schema for creating a new source."""

    content: Optional[str] = None
    summary: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SourceUpdate(BaseModel):
    """Schema for updating a source."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    summary: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[SourceStatus] = None


class SourceStatusUpdate(BaseModel):
    """Schema for updating source status."""

    status: SourceStatus
    error_message: Optional[str] = None


class SourceScrapeRequest(BaseModel):
    """Schema for scrape request."""

    url: HttpUrl
    type: Optional[SourceType] = None  # Auto-detect if not provided


class SourceResponse(SourceBase):
    """Schema for source response."""

    id: UUID
    content: Optional[str] = None
    summary: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    scraped_at: Optional[datetime] = None
    status: SourceStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceListResponse(BaseModel):
    """Schema for paginated source list response."""

    items: List[SourceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
