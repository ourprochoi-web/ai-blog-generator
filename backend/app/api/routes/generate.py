"""Generate API routes for blog post generation."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from slugify import slugify

from backend.app.api.deps import verify_admin_api_key
from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.article_repo import ArticleRepository
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.models.article import ArticleEdition, ArticleStatus
from backend.app.scheduler.jobs import get_current_edition
from backend.app.models.source import SourceStatus
from backend.app.schemas.article import ArticlePreviewResponse, ArticleResponse
from backend.app.services.generators.blog_writer import BlogWriter
from backend.app.services.generators.reference_validator import ReferenceValidator

router = APIRouter(
    prefix="/generate",
    dependencies=[Depends(verify_admin_api_key)],  # Protect generation routes
)


class GenerateRequest(BaseModel):
    """Request schema for article generation."""

    source_id: UUID
    save: bool = True  # If False, returns preview only


class ValidateRefsRequest(BaseModel):
    """Request schema for reference validation."""

    urls: List[str]


class RefValidationResult(BaseModel):
    """Result of reference URL validation."""

    url: str
    is_valid: bool
    status_code: Optional[int] = None
    final_url: Optional[str] = None
    error: Optional[str] = None


def get_source_repo():
    """Get source repository dependency."""
    client = get_supabase_client()
    return SourceRepository(client)


def get_article_repo():
    """Get article repository dependency."""
    client = get_supabase_client()
    return ArticleRepository(client)


@router.post("", response_model=ArticleResponse)
async def generate_article(
    request: GenerateRequest,
    source_repo: SourceRepository = Depends(get_source_repo),
    article_repo: ArticleRepository = Depends(get_article_repo),
):
    """
    Generate a blog article from a source using Gemini AI.

    This endpoint:
    1. Loads source content
    2. Generates article using Gemini LLM
    3. Validates any references in the generated content
    4. Saves to database (if save=True)
    """
    # Check if source exists
    source = await source_repo.get_by_id(str(request.source_id))
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # Check if article already exists for this source
    existing_article = await article_repo.get_by_source_id(str(request.source_id))
    if existing_article:
        raise HTTPException(
            status_code=409,
            detail="Article already exists for this source",
        )

    try:
        # Generate article using BlogWriter
        writer = BlogWriter()
        metadata = source.get("metadata", {})

        generated = await writer.generate_article(
            source_type=source["type"],
            title=source["title"],
            content=source.get("content", ""),
            summary=source.get("summary"),
            author=metadata.get("author") or metadata.get("authors"),
            metadata=metadata,
            validate_references=True,
        )

        # Generate slug
        slug = slugify(generated.title, max_length=200)
        if await article_repo.slug_exists(slug):
            base_slug = slug
            counter = 1
            while await article_repo.slug_exists(slug):
                slug = f"{base_slug}-{counter}"
                counter += 1

        # Truncate fields to fit DB constraints
        title = generated.title[:300] if generated.title else "Untitled"
        subtitle = generated.subtitle
        if subtitle and len(subtitle) > 200:
            subtitle = subtitle[:197] + "..."
        meta_desc = generated.meta_description
        if meta_desc and len(meta_desc) > 160:
            meta_desc = meta_desc[:157] + "..."

        # Add source reference to content footer
        source_url = source.get("url", "")
        source_title = source.get("title", "Original Source")
        source_type = source.get("type", "article")

        content_with_source = generated.content
        if source_url:
            source_label = {
                "paper": "Original Paper",
                "news": "Original Article",
                "article": "Original Source"
            }.get(source_type, "Original Source")

            content_with_source += f"\n\n---\n\n## References\n\n"
            content_with_source += f"- [{source_label}: {source_title}]({source_url})"

        # Determine current edition based on time
        current_edition = get_current_edition()

        # Prepare article data
        article_data = {
            "source_id": str(request.source_id),
            "title": title,
            "subtitle": subtitle,
            "slug": slug,
            "content": content_with_source,
            "tags": generated.tags,
            "references": generated.references,
            "word_count": generated.word_count,
            "char_count": generated.char_count,
            "status": ArticleStatus.DRAFT.value,
            "edition": current_edition.value,
            "meta_description": meta_desc,
            "llm_model": generated.llm_model,
            "generation_time_seconds": generated.generation_time_seconds,
        }

        if request.save:
            # Save to database
            created = await article_repo.create(article_data)

            # Update source status to processed
            await source_repo.update_status(
                str(request.source_id),
                SourceStatus.PROCESSED
            )

            return ArticleResponse(**created)
        else:
            # Return preview without saving
            article_data["id"] = "00000000-0000-0000-0000-000000000000"
            article_data["created_at"] = None
            article_data["updated_at"] = None
            article_data["published_at"] = None
            article_data["og_image_url"] = None
            return ArticleResponse(**article_data)

    except Exception as e:
        # Update source status to failed
        await source_repo.update_status(
            str(request.source_id),
            SourceStatus.FAILED,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate article: {str(e)}"
        )


@router.post("/preview", response_model=ArticlePreviewResponse)
async def generate_preview(
    request: GenerateRequest,
    source_repo: SourceRepository = Depends(get_source_repo),
):
    """
    Generate a preview of the article without saving.

    Returns the generated article content without persisting to database.
    """
    source = await source_repo.get_by_id(str(request.source_id))
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    try:
        # Generate article using BlogWriter
        writer = BlogWriter()
        metadata = source.get("metadata", {})

        generated = await writer.generate_article(
            source_type=source["type"],
            title=source["title"],
            content=source.get("content", ""),
            summary=source.get("summary"),
            author=metadata.get("author") or metadata.get("authors"),
            metadata=metadata,
            validate_references=False,  # Skip validation for preview
        )

        return ArticlePreviewResponse(
            title=generated.title,
            subtitle=generated.subtitle,
            content=generated.content,
            tags=generated.tags,
            references=generated.references,
            word_count=generated.word_count,
            char_count=generated.char_count,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate preview: {str(e)}"
        )


@router.post("/validate-refs", response_model=List[RefValidationResult])
async def validate_references(request: ValidateRefsRequest):
    """
    Validate reference URLs.

    Checks if URLs are accessible and returns validation results.
    """
    validator = ReferenceValidator()
    results = await validator.validate_urls(request.urls)

    return [
        RefValidationResult(
            url=r.url,
            is_valid=r.is_valid,
            status_code=r.status_code,
            final_url=r.final_url,
            error=r.error,
        )
        for r in results
    ]
