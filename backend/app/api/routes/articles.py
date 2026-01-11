"""Articles API routes."""

from __future__ import annotations

import math
import re
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from slugify import slugify

from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.article_repo import (
    ArticleRepository,
    ArticleVersionRepository,
)
from backend.app.models.article import ArticleStatus
from backend.app.schemas.article import (
    ArticleCreate,
    ArticleListResponse,
    ArticleResponse,
    ArticleStatusUpdate,
    ArticleUpdate,
)

router = APIRouter(prefix="/articles")


def get_article_repo():
    """Get article repository dependency."""
    client = get_supabase_client()
    return ArticleRepository(client)


def get_version_repo():
    """Get article version repository dependency."""
    client = get_supabase_client()
    return ArticleVersionRepository(client)


def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title."""
    return slugify(title, max_length=200)


def count_words(text: str) -> int:
    """Count words in text."""
    return len(re.findall(r"\w+", text))


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[ArticleStatus] = Query(None, description="Filter by status"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    repo: ArticleRepository = Depends(get_article_repo),
):
    """List all articles with pagination and filtering."""
    items, total = await repo.get_filtered(
        status=status,
        tag=tag,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ArticleListResponse(
        items=[ArticleResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/slug/{slug}", response_model=ArticleResponse)
async def get_article_by_slug(
    slug: str,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Get an article by slug."""
    article = await repo.get_by_slug(slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return ArticleResponse(**article)


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: UUID,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Get an article by ID."""
    article = await repo.get_by_id(str(article_id))
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return ArticleResponse(**article)


@router.post("", response_model=ArticleResponse, status_code=201)
async def create_article(
    article_data: ArticleCreate,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Create a new article manually."""
    # Generate slug if not provided
    slug = article_data.slug or generate_slug(article_data.title)

    # Check if slug already exists
    if await repo.slug_exists(slug):
        # Append number to make unique
        base_slug = slug
        counter = 1
        while await repo.slug_exists(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

    # Calculate word and char counts
    word_count = count_words(article_data.content)
    char_count = len(article_data.content)

    data = {
        "title": article_data.title,
        "subtitle": article_data.subtitle,
        "slug": slug,
        "content": article_data.content,
        "source_id": str(article_data.source_id) if article_data.source_id else None,
        "tags": article_data.tags,
        "references": [ref.model_dump() for ref in article_data.references],
        "word_count": word_count,
        "char_count": char_count,
        "status": ArticleStatus.DRAFT.value,
        "meta_description": article_data.meta_description,
        "og_image_url": article_data.og_image_url,
        "llm_model": article_data.llm_model,
        "generation_time_seconds": article_data.generation_time_seconds,
    }

    created = await repo.create(data)
    return ArticleResponse(**created)


@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: UUID,
    article_data: ArticleUpdate,
    repo: ArticleRepository = Depends(get_article_repo),
    version_repo: ArticleVersionRepository = Depends(get_version_repo),
):
    """Update an article."""
    existing = await repo.get_by_id(str(article_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    update_data = article_data.model_dump(exclude_unset=True)

    # Convert references if present
    if "references" in update_data and update_data["references"]:
        update_data["references"] = [ref.model_dump() for ref in update_data["references"]]

    # Recalculate counts if content changed
    if "content" in update_data:
        # Save version history before updating
        await version_repo.create_version(
            article_id=str(article_id),
            content=existing["content"],
            change_note="Auto-saved before update",
        )

        update_data["word_count"] = count_words(update_data["content"])
        update_data["char_count"] = len(update_data["content"])

    updated = await repo.update(str(article_id), update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update article")

    return ArticleResponse(**updated)


@router.delete("/{article_id}", status_code=204)
async def delete_article(
    article_id: UUID,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Delete an article."""
    existing = await repo.get_by_id(str(article_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    deleted = await repo.delete(str(article_id))
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete article")

    return None


@router.patch("/{article_id}/status", response_model=ArticleResponse)
async def update_article_status(
    article_id: UUID,
    status_data: ArticleStatusUpdate,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Update an article's status (publish, archive, etc.)."""
    existing = await repo.get_by_id(str(article_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    updated = await repo.update_status(str(article_id), status_data.status)

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update article status")

    return ArticleResponse(**updated)


@router.get("/{article_id}/versions")
async def get_article_versions(
    article_id: UUID,
    repo: ArticleRepository = Depends(get_article_repo),
    version_repo: ArticleVersionRepository = Depends(get_version_repo),
):
    """Get version history for an article."""
    existing = await repo.get_by_id(str(article_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    versions = await version_repo.get_versions_by_article(str(article_id))
    return {"article_id": str(article_id), "versions": versions}
