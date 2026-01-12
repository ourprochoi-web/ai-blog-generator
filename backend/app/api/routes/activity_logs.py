"""Activity logs API routes."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.activity_log_repo import ActivityLogRepository


router = APIRouter(prefix="/activity-logs")


class ActivityLogResponse(BaseModel):
    """Activity log response schema."""

    id: str
    type: str
    status: str
    message: str
    details: Dict[str, Any]
    created_at: str


class ActivityLogListResponse(BaseModel):
    """Paginated activity log list response."""

    items: List[ActivityLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


def get_activity_log_repo():
    """Get activity log repository dependency."""
    client = get_supabase_client()
    return ActivityLogRepository(client)


@router.get("", response_model=ActivityLogListResponse)
async def list_activity_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    type: Optional[str] = Query(None, description="Filter by type (scrape, evaluate, generate, pipeline)"),
    status: Optional[str] = Query(None, description="Filter by status (running, success, error)"),
    repo: ActivityLogRepository = Depends(get_activity_log_repo),
):
    """Get paginated activity logs with optional filtering."""
    items, total = await repo.get_paginated(
        page=page,
        page_size=page_size,
        type_filter=type,
        status_filter=status,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ActivityLogListResponse(
        items=[ActivityLogResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/recent", response_model=List[ActivityLogResponse])
async def get_recent_logs(
    limit: int = Query(50, ge=1, le=100, description="Number of logs to return"),
    type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    repo: ActivityLogRepository = Depends(get_activity_log_repo),
):
    """Get recent activity logs without pagination."""
    items = await repo.get_recent(
        limit=limit,
        type_filter=type,
        status_filter=status,
    )
    return [ActivityLogResponse(**item) for item in items]


@router.delete("/cleanup")
async def cleanup_old_logs(
    days: int = Query(30, ge=1, le=365, description="Delete logs older than N days"),
    repo: ActivityLogRepository = Depends(get_activity_log_repo),
):
    """Delete activity logs older than specified days."""
    deleted_count = await repo.delete_old_logs(days=days)
    return {
        "message": f"Deleted {deleted_count} logs older than {days} days",
        "deleted_count": deleted_count,
    }
