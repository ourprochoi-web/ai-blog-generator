"""Articles API routes."""

from __future__ import annotations

import json
import math
import re
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from slugify import slugify

from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.article_repo import (
    ArticleRepository,
    ArticleVersionRepository,
)
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.models.article import ArticleEdition, ArticleStatus
from backend.app.services.llm.image_generator import ImageGenerator
from backend.app.services.storage.supabase_storage import SupabaseStorage
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


def get_source_repo():
    """Get source repository dependency."""
    client = get_supabase_client()
    return SourceRepository(client)


def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title."""
    return slugify(title, max_length=200)


def count_words(text: str) -> int:
    """Count words in text."""
    return len(re.findall(r"\w+", text))


class ArticleDateGroup(BaseModel):
    """Articles grouped by date."""

    date: str
    count: int


class ArchiveResponse(BaseModel):
    """Archive listing response."""

    dates: list


@router.get("/archive", response_model=ArchiveResponse)
async def get_archive_dates(
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Get list of dates that have published articles."""
    client = get_supabase_client()

    response = (
        client.table("articles")
        .select("published_at")
        .eq("status", "published")
        .not_.is_("published_at", "null")
        .order("published_at", desc=True)
        .execute()
    )

    # Group by date
    dates_set = set()
    for article in response.data:
        if article.get("published_at"):
            date_str = article["published_at"][:10]  # YYYY-MM-DD
            dates_set.add(date_str)

    dates_list = sorted(list(dates_set), reverse=True)

    return ArchiveResponse(dates=dates_list)


@router.get("/by-date/{date}", response_model=ArticleListResponse)
async def get_articles_by_date(
    date: str,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Get published articles for a specific date (YYYY-MM-DD format)."""
    client = get_supabase_client()

    # Parse date and create range
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
        next_date = parsed_date.replace(hour=23, minute=59, second=59)
        start_date = parsed_date.replace(hour=0, minute=0, second=0)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    response = (
        client.table("articles")
        .select("*")
        .eq("status", "published")
        .gte("published_at", start_date.isoformat())
        .lte("published_at", next_date.isoformat())
        .order("published_at", desc=True)
        .execute()
    )

    items = response.data or []

    return ArticleListResponse(
        items=[ArticleResponse(**item) for item in items],
        total=len(items),
        page=1,
        page_size=len(items),
        total_pages=1,
    )


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[ArticleStatus] = Query(None, description="Filter by status"),
    edition: Optional[ArticleEdition] = Query(None, description="Filter by edition (morning/evening)"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    repo: ArticleRepository = Depends(get_article_repo),
    source_repo: SourceRepository = Depends(get_source_repo),
):
    """List all articles with pagination and filtering."""
    # Use edition-specific query if edition is specified for published articles
    if edition and status == ArticleStatus.PUBLISHED:
        items, total = await repo.get_published_by_edition(
            edition=edition,
            page=page,
            page_size=page_size,
        )
    else:
        # Use DB query for edition filter (not memory filter)
        items, total = await repo.get_filtered(
            status=status,
            tag=tag,
            edition=edition.value if edition else None,
            page=page,
            page_size=page_size,
        )

    # Fetch source relevance scores for articles with source_id
    source_ids = [item.get("source_id") for item in items if item.get("source_id")]
    source_scores = {}
    if source_ids:
        for source_id in source_ids:
            try:
                source = await source_repo.get_by_id(source_id)
                if source:
                    source_scores[source_id] = source.get("relevance_score")
            except Exception:
                pass

    # Add source_relevance_score to each article
    enriched_items = []
    for item in items:
        item_dict = dict(item)
        source_id = item_dict.get("source_id")
        if source_id and source_id in source_scores:
            item_dict["source_relevance_score"] = source_scores[source_id]
        enriched_items.append(item_dict)

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ArticleListResponse(
        items=[ArticleResponse(**item) for item in enriched_items],
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


def extract_json_from_content(content: str) -> Optional[Dict[str, Any]]:
    """Extract JSON data from content that contains nested JSON."""
    if not content:
        return None

    content_stripped = content.strip()

    # If content starts with ```json
    if content_stripped.startswith("```json"):
        match = re.search(r"```json\s*(.*?)\s*```", content_stripped, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

    # If content is just a JSON object
    elif content_stripped.startswith("{") and '"title"' in content_stripped:
        try:
            return json.loads(content_stripped)
        except json.JSONDecodeError:
            pass

    return None


@router.post("/fix-nested-json")
async def fix_nested_json_articles(
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Fix all articles that have nested JSON in their content."""
    client = get_supabase_client()
    response = client.table("articles").select("*").execute()
    articles = response.data

    fixed_count = 0
    fixed_articles = []

    for article in articles:
        content = article.get("content", "")
        article_id = article.get("id")
        current_title = article.get("title")

        # Check if content contains nested JSON
        parsed = extract_json_from_content(content)

        if parsed and "title" in parsed and "content" in parsed:
            # Extract the actual values
            new_title = parsed.get("title", current_title)
            new_subtitle = parsed.get("subtitle", "")
            new_content = parsed.get("content", content)
            new_tags = parsed.get("tags", [])
            new_meta = parsed.get("meta_description", "")

            # Calculate new word/char counts
            word_count = len(re.findall(r"\w+", new_content))
            char_count = len(new_content)

            # Generate new slug from new title
            new_slug = generate_slug(new_title)

            # Check if slug exists and make unique if needed
            if await repo.slug_exists(new_slug):
                base_slug = new_slug
                counter = 1
                while await repo.slug_exists(new_slug):
                    new_slug = f"{base_slug}-{counter}"
                    counter += 1

            # Update the article
            update_data = {
                "title": new_title,
                "subtitle": new_subtitle,
                "slug": new_slug,
                "content": new_content,
                "tags": new_tags,
                "meta_description": new_meta,
                "word_count": word_count,
                "char_count": char_count,
            }

            await repo.update(article_id, update_data)
            fixed_articles.append({
                "id": article_id,
                "old_title": current_title,
                "new_title": new_title,
                "new_slug": new_slug,
            })
            fixed_count += 1

    return {
        "fixed_count": fixed_count,
        "total_articles": len(articles),
        "fixed_articles": fixed_articles,
    }


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


@router.post("/assign-categories")
async def assign_categories_to_articles(
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Assign category tags to existing articles based on their content."""
    CATEGORY_KEYWORDS = {
        "Breakthrough": [
            "breakthrough", "first", "new record", "achieves", "surpasses",
            "revolutionary", "unprecedented", "milestone", "landmark", "beats",
            "outperforms", "state-of-the-art", "sota", "world's first"
        ],
        "Industry": [
            "company", "startup", "funding", "acquisition", "launch", "release",
            "product", "service", "business", "market", "commercial", "enterprise",
            "announces", "unveils", "partnership", "collaboration", "deal"
        ],
        "Research": [
            "study", "paper", "research", "arxiv", "journal", "scientists",
            "researchers", "methodology", "experiment", "findings", "analysis",
            "theoretical", "empirical", "dataset", "benchmark", "evaluate"
        ],
        "Regulation": [
            "regulation", "policy", "law", "government", "compliance", "ethics",
            "privacy", "safety", "ban", "restrict", "legal", "court", "ruling",
            "legislation", "act", "bill", "guideline", "framework", "oversight"
        ],
    }

    VALID_CATEGORIES = ["Breakthrough", "Industry", "Research", "Regulation"]

    client = get_supabase_client()
    response = client.table("articles").select("*").execute()
    articles = response.data

    updated_count = 0
    updated_articles = []

    for article in articles:
        article_id = article.get("id")
        title = article.get("title", "").lower()
        subtitle = article.get("subtitle", "").lower() if article.get("subtitle") else ""
        tags = article.get("tags", [])

        # Check if already has a valid category as first tag
        if tags and tags[0] in VALID_CATEGORIES:
            continue  # Already has category

        # Determine category from keywords
        combined_text = f"{title} {subtitle}"
        category_scores = {cat: 0 for cat in VALID_CATEGORIES}

        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in combined_text:
                    category_scores[category] += 1

        # Get category with highest score, default to "Industry"
        best_category = max(category_scores, key=category_scores.get)
        if category_scores[best_category] == 0:
            best_category = "Industry"  # Default

        # Insert category as first tag
        new_tags = [best_category] + [t for t in tags if t not in VALID_CATEGORIES]

        # Update article
        await repo.update(article_id, {"tags": new_tags})
        updated_articles.append({
            "id": article_id,
            "title": article.get("title"),
            "category": best_category,
            "old_tags": tags,
            "new_tags": new_tags,
        })
        updated_count += 1

    return {
        "updated_count": updated_count,
        "total_articles": len(articles),
        "updated_articles": updated_articles,
    }


@router.post("/{article_id}/regenerate-image")
async def regenerate_article_image(
    article_id: UUID,
    repo: ArticleRepository = Depends(get_article_repo),
):
    """Regenerate hero image for an existing article."""
    import logging
    logger = logging.getLogger(__name__)

    existing = await repo.get_by_id(str(article_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")

    title = existing.get("title", "")
    slug = existing.get("slug", "")
    meta_description = existing.get("meta_description", "")

    try:
        # Initialize image generator and storage
        image_generator = ImageGenerator()
        storage = SupabaseStorage()

        logger.info(f"Generating hero image for: {title[:50]}")

        # Generate image
        image_data = await image_generator.generate_hero_image(
            article_title=title,
            article_summary=meta_description or title,
        )

        if not image_data:
            raise HTTPException(status_code=500, detail="Failed to generate image")

        # Log image data info for debugging
        logger.info(f"Image data type: {type(image_data)}, length: {len(image_data)}")

        # Check if it's valid PNG (starts with PNG magic bytes)
        if isinstance(image_data, bytes) and len(image_data) > 8:
            header_hex = image_data[:8].hex()
            logger.info(f"Image header (hex): {header_hex}")
            if not header_hex.startswith("89504e47"):  # PNG magic bytes
                logger.warning("Image does not have valid PNG header!")

        # Upload to storage
        hero_image_url = await storage.upload_image(
            image_data=image_data,
            article_slug=slug,
            image_type="hero",
        )

        if not hero_image_url:
            raise HTTPException(status_code=500, detail="Failed to upload image")

        # Update article with new image URL
        updated = await repo.update(str(article_id), {"og_image_url": hero_image_url})

        return {
            "success": True,
            "article_id": str(article_id),
            "og_image_url": hero_image_url,
            "image_size_bytes": len(image_data),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image regeneration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
