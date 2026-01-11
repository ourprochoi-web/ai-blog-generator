"""Sources API routes."""

from __future__ import annotations

import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, HttpUrl

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
from backend.app.services.scrapers import ArxivScraper, ArticleScraper, NewsScraper

router = APIRouter(prefix="/sources")


class ScrapeRequest(BaseModel):
    """Request to scrape a URL."""

    url: HttpUrl
    type: Optional[SourceType] = None  # Auto-detect if not provided


class ScrapeResponse(BaseModel):
    """Response from scraping."""

    source: SourceResponse
    message: str


def get_source_repo():
    """Get source repository dependency."""
    client = get_supabase_client()
    return SourceRepository(client)


def detect_source_type(url: str) -> SourceType:
    """Auto-detect source type from URL."""
    arxiv_scraper = ArxivScraper()
    news_scraper = NewsScraper()

    if arxiv_scraper.can_handle(url):
        return SourceType.PAPER
    elif news_scraper.can_handle(url):
        return SourceType.NEWS
    else:
        return SourceType.ARTICLE


async def scrape_url(url: str, source_type: SourceType):
    """Scrape URL using appropriate scraper."""
    if source_type == SourceType.PAPER:
        scraper = ArxivScraper()
    elif source_type == SourceType.NEWS:
        scraper = NewsScraper()
    else:
        scraper = ArticleScraper()

    return await scraper.scrape(url)


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


@router.post("/scrape", response_model=ScrapeResponse, status_code=201)
async def scrape_source(
    request: ScrapeRequest,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Scrape content from a URL and create a source."""
    url = str(request.url)

    # Check if URL already exists
    existing = await repo.get_by_url(url)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Source with this URL already exists",
        )

    # Detect or use provided source type
    source_type = request.type or detect_source_type(url)

    try:
        # Scrape the URL
        scraped = await scrape_url(url, source_type)

        # Create source in database
        data = {
            "type": source_type.value,
            "title": scraped.title,
            "url": scraped.url,
            "content": scraped.content,
            "summary": scraped.summary,
            "metadata": scraped.metadata or {},
            "status": SourceStatus.PENDING.value,
        }

        created = await repo.create(data)

        return ScrapeResponse(
            source=SourceResponse(**created),
            message=f"Successfully scraped {source_type.value} from {url}",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape URL: {str(e)}",
        )


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


@router.post("/{source_id}/rescrape", response_model=SourceResponse)
async def rescrape_source(
    source_id: UUID,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Re-scrape an existing source to update its content."""
    existing = await repo.get_by_id(str(source_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    url = existing["url"]
    source_type = SourceType(existing["type"])

    try:
        # Scrape the URL again
        scraped = await scrape_url(url, source_type)

        # Update source in database
        update_data = {
            "title": scraped.title,
            "content": scraped.content,
            "summary": scraped.summary,
            "metadata": scraped.metadata or {},
        }

        updated = await repo.update(str(source_id), update_data)

        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update source")

        return SourceResponse(**updated)

    except Exception as e:
        # Update status to failed
        await repo.update_status(str(source_id), SourceStatus.FAILED, str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to re-scrape URL: {str(e)}",
        )
