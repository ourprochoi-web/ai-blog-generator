"""Base repository class."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from supabase import Client


class BaseRepository:
    """Base repository with common CRUD operations."""

    def __init__(self, client: Client, table_name: str):
        self.client = client
        self.table_name = table_name

    def _query(self):
        """Get table query builder."""
        return self.client.table(self.table_name)

    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Get a record by ID."""
        response = self._query().select("*").eq("id", id).limit(1).execute()
        return response.data[0] if response.data else None

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "created_at",
        ascending: bool = False,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get all records with pagination."""
        # Get total count
        count_response = self._query().select("*", count="exact").execute()
        total = count_response.count or 0

        # Get paginated data
        offset = (page - 1) * page_size
        response = (
            self._query()
            .select("*")
            .order(order_by, desc=not ascending)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new record."""
        response = self._query().insert(data).execute()
        return response.data[0] if response.data else {}

    async def update(self, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a record by ID."""
        # Remove None values
        update_data = {k: v for k, v in data.items() if v is not None}
        if not update_data:
            return await self.get_by_id(id)

        response = self._query().update(update_data).eq("id", id).execute()
        return response.data[0] if response.data else None

    async def delete(self, id: str) -> bool:
        """Delete a record by ID."""
        response = self._query().delete().eq("id", id).execute()
        return len(response.data) > 0 if response.data else False
