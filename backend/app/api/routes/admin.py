"""Admin API routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from fastapi import APIRouter

from backend.app.db.database import get_supabase_client

router = APIRouter(prefix="/admin")


class ArticleStats(BaseModel):
    """Article statistics."""
    total: int
    draft: int
    review: int
    published: int
    archived: int


class SourceStats(BaseModel):
    """Source statistics."""
    total: int
    pending: int
    selected: int
    processed: int
    failed: int
    skipped: int


class TodayStats(BaseModel):
    """Today's activity statistics."""
    articles_generated: int
    sources_scraped: int


class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    articles: ArticleStats
    sources: SourceStats
    today: TodayStats


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics for admin panel."""
    client = get_supabase_client()

    # Get article counts by status
    articles_response = client.table("articles").select("status").execute()
    articles = articles_response.data or []

    article_stats = {
        "total": len(articles),
        "draft": sum(1 for a in articles if a.get("status") == "draft"),
        "review": sum(1 for a in articles if a.get("status") == "review"),
        "published": sum(1 for a in articles if a.get("status") == "published"),
        "archived": sum(1 for a in articles if a.get("status") == "archived"),
    }

    # Get source counts by status
    sources_response = client.table("sources").select("status").execute()
    sources = sources_response.data or []

    source_stats = {
        "total": len(sources),
        "pending": sum(1 for s in sources if s.get("status") == "pending"),
        "selected": sum(1 for s in sources if s.get("status") == "selected"),
        "processed": sum(1 for s in sources if s.get("status") == "processed"),
        "failed": sum(1 for s in sources if s.get("status") == "failed"),
        "skipped": sum(1 for s in sources if s.get("status") == "skipped"),
    }

    # Get today's activity (using UTC)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_iso = today_start.isoformat()

    # Articles created today
    today_articles_response = (
        client.table("articles")
        .select("id")
        .gte("created_at", today_iso)
        .execute()
    )
    articles_today = len(today_articles_response.data or [])

    # Sources scraped today
    today_sources_response = (
        client.table("sources")
        .select("id")
        .gte("scraped_at", today_iso)
        .execute()
    )
    sources_today = len(today_sources_response.data or [])

    return DashboardStats(
        articles=ArticleStats(**article_stats),
        sources=SourceStats(**source_stats),
        today=TodayStats(
            articles_generated=articles_today,
            sources_scraped=sources_today,
        ),
    )
