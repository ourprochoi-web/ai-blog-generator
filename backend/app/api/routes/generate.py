"""Generate API routes for blog post generation."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.article_repo import ArticleRepository
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.schemas.article import ArticlePreviewResponse
from backend.app.services.generators.reference_validator import ReferenceValidator

router = APIRouter(prefix="/generate")


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


@router.post("")
async def generate_article(
    request: GenerateRequest,
    source_repo: SourceRepository = Depends(get_source_repo),
    article_repo: ArticleRepository = Depends(get_article_repo),
):
    """
    Generate a blog article from a source.

    This endpoint will be implemented in Phase 3 with:
    - Gemini API integration
    - Prompt templates
    - Content generation pipeline
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

    # TODO: Implement in Phase 3
    # 1. Load source content
    # 2. Determine article length based on source type
    # 3. Generate article using Gemini
    # 4. Validate references
    # 5. Save to database (if save=True)

    return {
        "message": "Article generation will be implemented in Phase 3",
        "source_id": str(request.source_id),
        "source_type": source["type"],
        "source_title": source["title"],
    }


@router.post("/preview", response_model=ArticlePreviewResponse)
async def generate_preview(
    request: GenerateRequest,
    source_repo: SourceRepository = Depends(get_source_repo),
):
    """
    Generate a preview of the article without saving.

    This endpoint will be implemented in Phase 3.
    """
    source = await source_repo.get_by_id(str(request.source_id))
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # TODO: Implement in Phase 3
    # Return mock preview for now
    return ArticlePreviewResponse(
        title=f"[Preview] {source['title']}",
        subtitle="This is a preview - actual generation coming in Phase 3",
        content="Article content will be generated here using Gemini AI.",
        tags=["AI", "Preview"],
        references=[],
        word_count=0,
        char_count=0,
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
