"""Activity log repository for database operations."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from backend.app.models.activity_log import ActivityStatus, ActivityType


class ActivityLogRepository:
    """Repository for activity log operations."""

    def __init__(self, client: Client):
        self.client = client
        self.table_name = "activity_logs"

    def _query(self):
        """Get table query builder."""
        return self.client.table(self.table_name)

    async def create(
        self,
        type: ActivityType,
        status: ActivityStatus,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new activity log entry."""
        data = {
            "type": type.value if isinstance(type, ActivityType) else type,
            "status": status.value if isinstance(status, ActivityStatus) else status,
            "message": message,
            "details": details or {},
        }

        response = self._query().insert(data).execute()
        return response.data[0] if response.data else {}

    async def get_recent(
        self,
        limit: int = 50,
        type_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        activity_type: Optional[ActivityType] = None,
        since: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Get recent activity logs."""
        query = self._query().select("*")

        # Support both type_filter (str) and activity_type (enum)
        if activity_type:
            query = query.eq("type", activity_type.value)
        elif type_filter:
            query = query.eq("type", type_filter)

        if status_filter:
            query = query.eq("status", status_filter)

        if since:
            query = query.gte("created_at", since.isoformat())

        response = query.order("created_at", desc=True).limit(limit).execute()
        return response.data or []

    async def get_paginated(
        self,
        page: int = 1,
        page_size: int = 50,
        type_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get paginated activity logs with total count."""
        # Count query
        count_query = self._query().select("*", count="exact")
        if type_filter:
            count_query = count_query.eq("type", type_filter)
        if status_filter:
            count_query = count_query.eq("status", status_filter)
        count_response = count_query.execute()
        total = count_response.count or 0

        # Data query
        offset = (page - 1) * page_size
        data_query = self._query().select("*")
        if type_filter:
            data_query = data_query.eq("type", type_filter)
        if status_filter:
            data_query = data_query.eq("status", status_filter)

        response = (
            data_query.order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return response.data or [], total

    async def delete_old_logs(self, days: int = 30) -> int:
        """Delete logs older than specified days."""
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Supabase doesn't return count on delete, so we count first
        count_response = (
            self._query()
            .select("id", count="exact")
            .lt("created_at", cutoff_date.isoformat())
            .execute()
        )
        count = count_response.count or 0

        if count > 0:
            self._query().delete().lt("created_at", cutoff_date.isoformat()).execute()

        return count

    async def mark_stale_running_as_interrupted(
        self,
        timeout_minutes: int = 30,
    ) -> int:
        """
        Mark stale RUNNING logs as INTERRUPTED.

        Called at job start to clean up any jobs that were interrupted
        by app restart or crash.

        Args:
            timeout_minutes: Consider RUNNING logs older than this as stale

        Returns:
            Number of logs marked as interrupted
        """
        from datetime import timedelta

        cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)

        # Find stale running logs
        stale_logs = (
            self._query()
            .select("id, type, message")
            .eq("status", ActivityStatus.RUNNING.value)
            .lt("created_at", cutoff_time.isoformat())
            .execute()
        )

        count = 0
        for log in stale_logs.data or []:
            # Update to interrupted
            self._query().update({
                "status": ActivityStatus.INTERRUPTED.value,
                "details": {
                    "reason": "Marked as interrupted - job did not complete within timeout",
                    "original_message": log.get("message", ""),
                },
            }).eq("id", log["id"]).execute()
            count += 1

        return count

    async def get_running_jobs(
        self,
        activity_type: Optional[ActivityType] = None,
    ) -> List[Dict[str, Any]]:
        """Get currently running jobs."""
        query = self._query().select("*").eq("status", ActivityStatus.RUNNING.value)

        if activity_type:
            query = query.eq("type", activity_type.value)

        response = query.order("created_at", desc=True).execute()
        return response.data or []


# Convenience function for logging from anywhere
async def log_activity(
    client: Client,
    type: ActivityType,
    status: ActivityStatus,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Convenience function to log an activity."""
    repo = ActivityLogRepository(client)
    return await repo.create(type, status, message, details)
