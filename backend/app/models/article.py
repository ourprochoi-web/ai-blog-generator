"""Article model definitions."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID


class ArticleStatus(str, Enum):
    """Article status enumeration."""

    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ArticleEdition(str, Enum):
    """Article edition enumeration."""

    MORNING = "morning"
    EVENING = "evening"


class HeroImageStatus(str, Enum):
    """Hero image generation status enumeration."""

    NONE = "none"  # No image requested
    PENDING = "pending"  # Waiting for generation
    GENERATING = "generating"  # Currently generating
    COMPLETED = "completed"  # Successfully generated
    FAILED = "failed"  # Generation failed
    SKIPPED = "skipped"  # Skipped (e.g., disabled in config)


class Reference:
    """Reference link model."""

    def __init__(
        self,
        title: str,
        url: str,
        verified: bool = False,
    ):
        self.title = title
        self.url = url
        self.verified = verified


class Article:
    """Article domain model."""

    def __init__(
        self,
        id: UUID,
        title: str,
        slug: str,
        content: str,
        source_id: Optional[UUID] = None,
        subtitle: Optional[str] = None,
        tags: Optional[List[str]] = None,
        references: Optional[List[Dict[str, Any]]] = None,
        word_count: Optional[int] = None,
        char_count: Optional[int] = None,
        status: ArticleStatus = ArticleStatus.DRAFT,
        meta_description: Optional[str] = None,
        og_image_url: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        published_at: Optional[datetime] = None,
        llm_model: Optional[str] = None,
        generation_time_seconds: Optional[float] = None,
    ):
        self.id = id
        self.source_id = source_id
        self.title = title
        self.subtitle = subtitle
        self.slug = slug
        self.content = content
        self.tags = tags or []
        self.references = references or []
        self.word_count = word_count
        self.char_count = char_count
        self.status = status
        self.meta_description = meta_description
        self.og_image_url = og_image_url
        self.created_at = created_at
        self.updated_at = updated_at
        self.published_at = published_at
        self.llm_model = llm_model
        self.generation_time_seconds = generation_time_seconds
