"""Sources API routes."""

from __future__ import annotations

import logging
import math

logger = logging.getLogger(__name__)
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, HttpUrl

from datetime import datetime

from backend.app.config import settings
from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.models.source import SourceStatus, SourceType
from backend.app.schemas.source import (
    SourceBulkSelectionRequest,
    SourceCreate,
    SourceListResponse,
    SourcePriorityUpdate,
    SourceResponse,
    SourceSelectionUpdate,
    SourceStatusUpdate,
    SourceUpdate,
)
from backend.app.services.generators.source_evaluator import SourceEvaluator
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


class SourceStats(BaseModel):
    """Statistics about sources."""

    total: int
    by_type: dict
    today_count: int


@router.get("/stats", response_model=SourceStats)
async def get_source_stats(
    repo: SourceRepository = Depends(get_source_repo),
):
    """Get statistics about sources."""
    client = get_supabase_client()

    # Get total count
    total_response = client.table("sources").select("id", count="exact").execute()
    total = total_response.count or 0

    # Get count by type
    news_response = client.table("sources").select("id", count="exact").eq("type", "news").execute()
    paper_response = client.table("sources").select("id", count="exact").eq("type", "paper").execute()
    article_response = client.table("sources").select("id", count="exact").eq("type", "article").execute()

    by_type = {
        "news": news_response.count or 0,
        "paper": paper_response.count or 0,
        "article": article_response.count or 0,
    }

    # Get today's count
    from datetime import datetime, timezone

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_response = (
        client.table("sources")
        .select("id", count="exact")
        .gte("created_at", today_start.isoformat())
        .execute()
    )
    today_count = today_response.count or 0

    return SourceStats(
        total=total,
        by_type=by_type,
        today_count=today_count,
    )


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


# =====================================================
# Source Selection Endpoints
# =====================================================


@router.get("/selection/pending", response_model=SourceListResponse)
async def list_unreviewed_sources(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    repo: SourceRepository = Depends(get_source_repo),
):
    """List sources pending review for selection."""
    items, total = await repo.get_unreviewed_sources(
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


@router.get("/selection/selected", response_model=SourceListResponse)
async def list_selected_sources(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    repo: SourceRepository = Depends(get_source_repo),
):
    """List sources marked for blog generation."""
    items, total = await repo.get_selected_sources(
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


@router.get("/selection/ready", response_model=SourceListResponse)
async def list_sources_ready_for_generation(
    limit: int = Query(10, ge=1, le=50, description="Number of sources to return"),
    repo: SourceRepository = Depends(get_source_repo),
):
    """Get sources ready for blog generation, ordered by priority."""
    items = await repo.get_sources_for_generation(limit=limit)

    return SourceListResponse(
        items=[SourceResponse(**item) for item in items],
        total=len(items),
        page=1,
        page_size=limit,
        total_pages=1,
    )


@router.patch("/{source_id}/select", response_model=SourceResponse)
async def update_source_selection(
    source_id: UUID,
    selection_data: SourceSelectionUpdate,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Update a source's selection status."""
    existing = await repo.get_by_id(str(source_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    updated = await repo.update_selection(
        str(source_id),
        is_selected=selection_data.is_selected,
        priority=selection_data.priority,
        selection_note=selection_data.selection_note,
    )

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update source selection")

    return SourceResponse(**updated)


@router.patch("/{source_id}/priority", response_model=SourceResponse)
async def update_source_priority(
    source_id: UUID,
    priority_data: SourcePriorityUpdate,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Update a source's priority (0-5)."""
    existing = await repo.get_by_id(str(source_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    updated = await repo.update_priority(str(source_id), priority_data.priority)

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update source priority")

    return SourceResponse(**updated)


class BulkSelectionResponse(BaseModel):
    """Response from bulk selection."""

    updated_count: int
    message: str


@router.post("/selection/bulk", response_model=BulkSelectionResponse)
async def bulk_select_sources(
    request: SourceBulkSelectionRequest,
    repo: SourceRepository = Depends(get_source_repo),
):
    """Bulk update selection for multiple sources."""
    source_ids = [str(sid) for sid in request.source_ids]

    updated_count = await repo.bulk_update_selection(
        ids=source_ids,
        is_selected=request.is_selected,
        priority=request.priority,
    )

    action = "selected" if request.is_selected else "deselected"
    return BulkSelectionResponse(
        updated_count=updated_count,
        message=f"Successfully {action} {updated_count} sources",
    )


# =====================================================
# Source Evaluation Endpoints
# =====================================================


class EvaluationResponse(BaseModel):
    """Response from source evaluation."""

    source_id: UUID
    relevance_score: int
    suggested_topic: str
    key_points: List[str]
    reason: str
    is_recommended: bool


class BulkEvaluationRequest(BaseModel):
    """Request for bulk evaluation."""

    source_ids: List[UUID]


class BulkEvaluationResponse(BaseModel):
    """Response from bulk evaluation."""

    evaluations: List[dict]
    evaluated_count: int


def get_evaluator():
    """Get source evaluator dependency."""
    return SourceEvaluator()


@router.post("/{source_id}/evaluate", response_model=EvaluationResponse)
async def evaluate_source(
    source_id: UUID,
    save_to_db: bool = Query(True, description="Save relevance score to database"),
    repo: SourceRepository = Depends(get_source_repo),
    evaluator: SourceEvaluator = Depends(get_evaluator),
):
    """Evaluate a source using LLM and optionally update its relevance score."""
    source = await repo.get_by_id(str(source_id))
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    try:
        evaluation = await evaluator.evaluate_source(
            source_type=source["type"],
            title=source["title"],
            url=source["url"],
            content=source.get("content", ""),
            summary=source.get("summary"),
        )

        # Update the source with relevance score if requested
        if save_to_db:
            try:
                await repo.update_relevance_score(str(source_id), evaluation.relevance_score)

                # If recommended, also update selection note with suggested topic
                if evaluation.is_recommended:
                    await repo.update(
                        str(source_id),
                        {"selection_note": f"Suggested: {evaluation.suggested_topic}"},
                    )
            except Exception as e:
                logger.warning(f"Failed to save evaluation to DB for source {source_id}: {e}")

        return EvaluationResponse(
            source_id=source_id,
            relevance_score=evaluation.relevance_score,
            suggested_topic=evaluation.suggested_topic,
            key_points=evaluation.key_points,
            reason=evaluation.reason,
            is_recommended=evaluation.is_recommended,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate source: {str(e)}",
        )


@router.post("/evaluate/batch", response_model=BulkEvaluationResponse)
async def evaluate_sources_batch(
    request: BulkEvaluationRequest,
    repo: SourceRepository = Depends(get_source_repo),
    evaluator: SourceEvaluator = Depends(get_evaluator),
):
    """Evaluate multiple sources in batch."""
    sources = []
    for sid in request.source_ids:
        source = await repo.get_by_id(str(sid))
        if source:
            sources.append(source)

    if not sources:
        raise HTTPException(status_code=404, detail="No valid sources found")

    try:
        evaluations = await evaluator.evaluate_sources_batch(sources)

        # Update relevance scores and auto-select high-scoring sources
        for eval_result in evaluations:
            source_id = eval_result.get("source_id")
            score = eval_result.get("relevance_score", 50)
            if source_id:
                update_data = {
                    "relevance_score": score,
                    "reviewed_at": datetime.utcnow().isoformat(),
                }

                # Auto-select if score meets threshold
                if score >= settings.AUTO_GENERATE_MIN_SCORE:
                    update_data["is_selected"] = True
                    update_data["status"] = SourceStatus.SELECTED.value
                    update_data["selection_note"] = f"Auto-selected: score {score}"

                await repo.update(source_id, update_data)

        return BulkEvaluationResponse(
            evaluations=evaluations,
            evaluated_count=len(evaluations),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate sources: {str(e)}",
        )


@router.post("/evaluate/pending", response_model=BulkEvaluationResponse)
async def evaluate_pending_sources(
    limit: int = Query(20, ge=1, le=100, description="Number of sources to evaluate"),
    repo: SourceRepository = Depends(get_source_repo),
    evaluator: SourceEvaluator = Depends(get_evaluator),
):
    """Evaluate all pending unreviewed sources."""
    # Get unreviewed sources (increased default limit to process all pending)
    sources, total = await repo.get_unreviewed_sources(page=1, page_size=limit)

    if not sources:
        return BulkEvaluationResponse(evaluations=[], evaluated_count=0)

    try:
        evaluations = await evaluator.evaluate_sources_batch(sources)

        # Update relevance scores and auto-select high-scoring sources
        for eval_result in evaluations:
            source_id = eval_result.get("source_id")
            score = eval_result.get("relevance_score", 50)
            if source_id:
                update_data = {
                    "relevance_score": score,
                    "reviewed_at": datetime.utcnow().isoformat(),
                }

                # Auto-select if score meets threshold
                if score >= settings.AUTO_GENERATE_MIN_SCORE:
                    update_data["is_selected"] = True
                    update_data["status"] = SourceStatus.SELECTED.value
                    update_data["selection_note"] = f"Auto-selected: score {score}"

                await repo.update(source_id, update_data)

        return BulkEvaluationResponse(
            evaluations=evaluations,
            evaluated_count=len(evaluations),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate sources: {str(e)}",
        )
