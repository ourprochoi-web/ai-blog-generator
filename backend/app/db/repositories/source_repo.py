"""Source repository for database operations."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from backend.app.db.repositories.base import BaseRepository
from backend.app.models.source import SourceStatus, SourceType


class SourceRepository(BaseRepository):
    """Repository for source database operations."""

    def __init__(self, client: Client):
        super().__init__(client, "sources")

    async def get_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Get a source by URL."""
        response = self._query().select("*").eq("url", url).limit(1).execute()
        return response.data[0] if response.data else None

    async def get_by_status(
        self,
        status: SourceStatus,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get sources by status."""
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

    async def get_by_type(
        self,
        source_type: SourceType,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get sources by type."""
        # Get total count
        count_response = (
            self._query().select("*", count="exact").eq("type", source_type.value).execute()
        )
        total = count_response.count or 0

        # Get paginated data
        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .eq("type", source_type.value)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def get_filtered(
        self,
        status: Optional[SourceStatus] = None,
        source_type: Optional[SourceType] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get sources with optional filters."""
        query = self._query().select("*", count="exact")

        if status:
            query = query.eq("status", status.value)
        if source_type:
            query = query.eq("type", source_type.value)

        count_response = query.execute()
        total = count_response.count or 0

        # Build data query
        data_query = self._query().select("*")

        if status:
            data_query = data_query.eq("status", status.value)
        if source_type:
            data_query = data_query.eq("type", source_type.value)

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
        status: SourceStatus,
        error_message: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update source status."""
        data = {"status": status.value}
        if error_message is not None:
            data["error_message"] = error_message

        return await self.update(id, data)

    async def get_pending_sources(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get pending sources for processing."""
        response = (
            self._query()
            .select("*")
            .eq("status", SourceStatus.PENDING.value)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return response.data or []
