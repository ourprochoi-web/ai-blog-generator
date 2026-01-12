"""Activity log model definitions."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID


class ActivityType(str, Enum):
    """Activity type enumeration."""

    SCRAPE = "scrape"
    EVALUATE = "evaluate"
    GENERATE = "generate"
    PIPELINE = "pipeline"


class ActivityStatus(str, Enum):
    """Activity status enumeration."""

    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


class ActivityLog:
    """Activity log domain model."""

    def __init__(
        self,
        id: UUID,
        type: ActivityType,
        status: ActivityStatus,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        created_at: Optional[datetime] = None,
    ):
        self.id = id
        self.type = type
        self.status = status
        self.message = message
        self.details = details or {}
        self.created_at = created_at
