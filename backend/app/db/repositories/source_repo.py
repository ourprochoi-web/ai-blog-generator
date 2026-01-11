"""Source repository for database operations."""

from __future__ import annotations

from datetime import datetime
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

    # =====================================================
    # Source Selection Methods
    # =====================================================

    async def get_selected_sources(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get sources marked for blog generation."""
        count_response = (
            self._query()
            .select("*", count="exact")
            .eq("is_selected", True)
            .execute()
        )
        total = count_response.count or 0

        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .eq("is_selected", True)
            .order("priority", desc=True)
            .order("relevance_score", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def get_unreviewed_sources(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get sources not yet reviewed for selection."""
        count_response = (
            self._query()
            .select("*", count="exact")
            .is_("reviewed_at", "null")
            .eq("status", SourceStatus.PENDING.value)
            .execute()
        )
        total = count_response.count or 0

        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .is_("reviewed_at", "null")
            .eq("status", SourceStatus.PENDING.value)
            .order("scraped_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def update_selection(
        self,
        id: str,
        is_selected: bool,
        priority: Optional[int] = None,
        selection_note: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update source selection status."""
        data = {
            "is_selected": is_selected,
            "reviewed_at": datetime.utcnow().isoformat(),
        }

        if priority is not None:
            data["priority"] = priority

        if selection_note is not None:
            data["selection_note"] = selection_note

        # Update status if selected
        if is_selected:
            data["status"] = SourceStatus.SELECTED.value

        return await self.update(id, data)

    async def update_priority(
        self,
        id: str,
        priority: int,
    ) -> Optional[Dict[str, Any]]:
        """Update source priority."""
        return await self.update(id, {"priority": priority})

    async def update_relevance_score(
        self,
        id: str,
        score: int,
    ) -> Optional[Dict[str, Any]]:
        """Update source relevance score (from LLM evaluation)."""
        return await self.update(id, {"relevance_score": score})

    async def bulk_update_selection(
        self,
        ids: List[str],
        is_selected: bool,
        priority: Optional[int] = None,
    ) -> int:
        """Bulk update selection for multiple sources."""
        data = {
            "is_selected": is_selected,
            "reviewed_at": datetime.utcnow().isoformat(),
        }

        if priority is not None:
            data["priority"] = priority

        if is_selected:
            data["status"] = SourceStatus.SELECTED.value

        # Update each source
        updated_count = 0
        for source_id in ids:
            result = await self.update(source_id, data)
            if result:
                updated_count += 1

        return updated_count

    async def get_sources_for_generation(
        self,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Get selected sources ready for blog generation, ordered by priority."""
        response = (
            self._query()
            .select("*")
            .eq("is_selected", True)
            .eq("status", SourceStatus.SELECTED.value)
            .order("priority", desc=True)
            .order("relevance_score", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    async def get_sources_by_priority(
        self,
        min_priority: int = 1,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get sources with priority >= min_priority."""
        count_response = (
            self._query()
            .select("*", count="exact")
            .gte("priority", min_priority)
            .execute()
        )
        total = count_response.count or 0

        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .gte("priority", min_priority)
            .order("priority", desc=True)
            .order("scraped_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total
