"""Article repository for database operations."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from backend.app.db.repositories.base import BaseRepository
from backend.app.models.article import ArticleEdition, ArticleStatus


class ArticleRepository(BaseRepository):
    """Repository for article database operations."""

    def __init__(self, client: Client):
        super().__init__(client, "articles")

    async def get_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get an article by slug."""
        response = self._query().select("*").eq("slug", slug).limit(1).execute()
        return response.data[0] if response.data else None

    async def get_by_source_id(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get an article by source ID."""
        response = self._query().select("*").eq("source_id", source_id).limit(1).execute()
        return response.data[0] if response.data else None

    async def get_by_status(
        self,
        status: ArticleStatus,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get articles by status."""
        # Get total count
        count_response = (
            self._query().select("*", count="exact").eq("status", status.value).execute()
        )
        total = count_response.count or 0

        # Get paginated data
        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .eq("status", status.value)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def get_published(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get published articles ordered by published_at."""
        # Get total count
        count_response = (
            self._query()
            .select("*", count="exact")
            .eq("status", ArticleStatus.PUBLISHED.value)
            .execute()
        )
        total = count_response.count or 0

        # Get paginated data
        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .eq("status", ArticleStatus.PUBLISHED.value)
            .order("published_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def get_by_tag(
        self,
        tag: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get articles by tag."""
        # Get total count
        count_response = (
            self._query().select("*", count="exact").contains("tags", [tag]).execute()
        )
        total = count_response.count or 0

        # Get paginated data
        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .contains("tags", [tag])
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def get_filtered(
        self,
        status: Optional[ArticleStatus] = None,
        tag: Optional[str] = None,
        edition: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get articles with optional filters."""
        query = self._query().select("*", count="exact")

        if status:
            query = query.eq("status", status.value)
        if tag:
            query = query.contains("tags", [tag])
        if edition:
            query = query.eq("edition", edition)

        count_response = query.execute()
        total = count_response.count or 0

        # Build data query
        data_query = self._query().select("*")

        if status:
            data_query = data_query.eq("status", status.value)
        if tag:
            data_query = data_query.contains("tags", [tag])
        if edition:
            data_query = data_query.eq("edition", edition)

        offset = (page - 1) * page_size
        response = (
            data_query.order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def update_status(
        self,
        id: str,
        status: ArticleStatus,
    ) -> Optional[Dict[str, Any]]:
        """Update article status."""
        data = {"status": status.value}

        # Set published_at when publishing
        if status == ArticleStatus.PUBLISHED:
            data["published_at"] = datetime.utcnow().isoformat()

        return await self.update(id, data)

    async def slug_exists(self, slug: str, exclude_id: Optional[str] = None) -> bool:
        """Check if a slug already exists."""
        query = self._query().select("id").eq("slug", slug)

        if exclude_id:
            query = query.neq("id", exclude_id)

        response = query.execute()
        return len(response.data) > 0 if response.data else False

    async def count_since(self, since: datetime) -> int:
        """Count articles created since a given datetime."""
        response = (
            self._query()
            .select("*", count="exact")
            .gte("created_at", since.isoformat())
            .execute()
        )
        return response.count or 0

    async def count_by_edition_since(
        self, since: datetime, edition: ArticleEdition
    ) -> int:
        """Count articles for a specific edition since a given datetime."""
        response = (
            self._query()
            .select("*", count="exact")
            .eq("edition", edition.value)
            .gte("created_at", since.isoformat())
            .execute()
        )
        return response.count or 0

    async def get_published_by_edition(
        self,
        edition: ArticleEdition,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get published articles for a specific edition."""
        # Get total count
        count_response = (
            self._query()
            .select("*", count="exact")
            .eq("status", ArticleStatus.PUBLISHED.value)
            .eq("edition", edition.value)
            .execute()
        )
        total = count_response.count or 0

        # Get paginated data
        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .eq("status", ArticleStatus.PUBLISHED.value)
            .eq("edition", edition.value)
            .order("published_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total


class ArticleVersionRepository(BaseRepository):
    """Repository for article version history."""

    def __init__(self, client: Client):
        super().__init__(client, "article_versions")

    async def get_versions_by_article(
        self, article_id: str
    ) -> List[Dict[str, Any]]:
        """Get all versions for an article."""
        response = (
            self._query()
            .select("*")
            .eq("article_id", article_id)
            .order("version_number", desc=True)
            .execute()
        )
        return response.data or []

    async def get_latest_version_number(self, article_id: str) -> int:
        """Get the latest version number for an article."""
        response = (
            self._query()
            .select("version_number")
            .eq("article_id", article_id)
            .order("version_number", desc=True)
            .limit(1)
            .execute()
        )

        if response.data and len(response.data) > 0:
            return response.data[0]["version_number"]
        return 0

    async def create_version(
        self,
        article_id: str,
        content: str,
        change_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new version for an article."""
        version_number = await self.get_latest_version_number(article_id) + 1

        data = {
            "article_id": article_id,
            "content": content,
            "version_number": version_number,
            "change_note": change_note,
        }

        return await self.create(data)
