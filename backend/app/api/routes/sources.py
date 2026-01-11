"""Sources API routes."""

from __future__ import annotations

import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.models.source import SourceStatus, SourceType
from backend.app.schemas.source import (
    SourceCreate,
    SourceListResponse,
    SourceResponse,
    SourceStatusUpdate,
    SourceUpdate,
)

router = APIRouter(prefix="/sources")


def get_source_repo():
    """Get source repository dependency."""
    client = get_supabase_client()
    return SourceRepository(client)


@router.get("", response_model=SourceListResponse)
async def list_sources(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[SourceStatus] = Query(None, description="Filter by status"),
    type: Optional[SourceType] = Query(None, description="Filter by type"),
    repo: SourceRepository = Depends(get_source_repo),
):
    """List all sources with pagination and filtering."""
    items, total = await repo.get_filtered(
        status=status,
        source_type=type,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return SourceListResponse(
        items=[SourceResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: UUID,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Get a source by ID."""
    source = await repo.get_by_id(str(source_id))
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    return SourceResponse(**source)


@router.post("", response_model=SourceResponse, status_code=201)
async def create_source(
    source_data: SourceCreate,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Create a new source manually."""
    # Check if URL already exists
    existing = await repo.get_by_url(str(source_data.url))
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Source with this URL already exists",
        )

    data = {
        "type": source_data.type.value,
        "title": source_data.title,
        "url": str(source_data.url),
        "content": source_data.content,
        "summary": source_data.summary,
        "metadata": source_data.metadata,
        "status": SourceStatus.PENDING.value,
    }

    created = await repo.create(data)
    return SourceResponse(**created)


@router.put("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: UUID,
    source_data: SourceUpdate,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Update a source."""
    existing = await repo.get_by_id(str(source_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    update_data = source_data.model_dump(exclude_unset=True)

    # Convert enum to value if present
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value

    updated = await repo.update(str(source_id), update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update source")

    return SourceResponse(**updated)


@router.delete("/{source_id}", status_code=204)
async def delete_source(
    source_id: UUID,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Delete a source."""
    existing = await repo.get_by_id(str(source_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    deleted = await repo.delete(str(source_id))
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete source")

    return None


@router.patch("/{source_id}/status", response_model=SourceResponse)
async def update_source_status(
    source_id: UUID,
    status_data: SourceStatusUpdate,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Update a source's status."""
    existing = await repo.get_by_id(str(source_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    updated = await repo.update_status(
        str(source_id),
        status_data.status,
        status_data.error_message,
    )

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update source status")

    return SourceResponse(**updated)
