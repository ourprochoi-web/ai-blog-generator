"""Source model definitions."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID


class SourceType(str, Enum):
    """Source type enumeration."""

    NEWS = "news"
    PAPER = "paper"
    ARTICLE = "article"


class SourceStatus(str, Enum):
    """Source processing status enumeration."""

    PENDING = "pending"
    PROCESSED = "processed"
    SKIPPED = "skipped"
    FAILED = "failed"


class Source:
    """Source domain model."""

    def __init__(
        self,
        id: UUID,
        type: SourceType,
        title: str,
        url: str,
        content: Optional[str] = None,
        summary: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        scraped_at: Optional[datetime] = None,
        status: SourceStatus = SourceStatus.PENDING,
        error_message: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        self.id = id
        self.type = type
        self.title = title
        self.url = url
        self.content = content
        self.summary = summary
        self.metadata = metadata or {}
        self.scraped_at = scraped_at
        self.status = status
        self.error_message = error_message
        self.created_at = created_at
        self.updated_at = updated_at
