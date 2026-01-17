"""Pipeline state repository for tracking and resuming interrupted pipelines."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from supabase import Client

from backend.app.models.article import ArticleEdition


class PipelineState:
    """Pipeline state constants."""

    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    INTERRUPTED = "interrupted"


class PipelineStateRepository:
    """Repository for pipeline state operations."""

    def __init__(self, client: Client):
        self.client = client
        self.table_name = "pipeline_state"

    def _query(self):
        """Get table query builder."""
        return self.client.table(self.table_name)

    async def create(self, edition: ArticleEdition) -> Dict[str, Any]:
        """
        Create a new pipeline state record.

        Args:
            edition: The edition (morning/evening) this pipeline is for

        Returns:
            Created pipeline state record
        """
        data = {
            "edition": edition.value,
            "status": PipelineState.RUNNING,
            "scrape_completed": False,
            "evaluate_completed": False,
            "generate_completed": False,
            "scrape_result": {},
            "evaluate_result": {},
            "generate_result": {},
        }

        response = self._query().insert(data).execute()
        return response.data[0] if response.data else {}

    async def get_incomplete(self, max_age_hours: int = 4) -> Optional[Dict[str, Any]]:
        """
        Get the most recent incomplete pipeline state.

        Only returns pipelines that are:
        - Status is 'running' or 'interrupted'
        - Started within max_age_hours (to avoid resuming very old runs)

        Args:
            max_age_hours: Maximum age in hours for resumable pipelines

        Returns:
            Pipeline state record if found, None otherwise
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)

        response = (
            self._query()
            .select("*")
            .in_("status", [PipelineState.RUNNING, PipelineState.INTERRUPTED])
            .gte("started_at", cutoff_time.isoformat())
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )

        return response.data[0] if response.data else None

    async def mark_step_completed(
        self,
        pipeline_id: str,
        step: str,
        result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Mark a pipeline step as completed.

        Args:
            pipeline_id: The pipeline state ID
            step: Step name ('scrape', 'evaluate', 'generate')
            result: Result data from the step

        Returns:
            Updated pipeline state record
        """
        update_data = {
            f"{step}_completed": True,
            f"{step}_result": result,
            "last_updated_at": datetime.utcnow().isoformat(),
        }

        response = (
            self._query()
            .update(update_data)
            .eq("id", pipeline_id)
            .execute()
        )

        return response.data[0] if response.data else {}

    async def mark_completed(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Mark the entire pipeline as completed.

        Args:
            pipeline_id: The pipeline state ID

        Returns:
            Updated pipeline state record
        """
        update_data = {
            "status": PipelineState.COMPLETED,
            "completed_at": datetime.utcnow().isoformat(),
            "last_updated_at": datetime.utcnow().isoformat(),
        }

        response = (
            self._query()
            .update(update_data)
            .eq("id", pipeline_id)
            .execute()
        )

        return response.data[0] if response.data else {}

    async def mark_failed(
        self,
        pipeline_id: str,
        error_message: str,
    ) -> Dict[str, Any]:
        """
        Mark the pipeline as failed.

        Args:
            pipeline_id: The pipeline state ID
            error_message: Error description

        Returns:
            Updated pipeline state record
        """
        update_data = {
            "status": PipelineState.FAILED,
            "error_message": error_message,
            "last_updated_at": datetime.utcnow().isoformat(),
        }

        response = (
            self._query()
            .update(update_data)
            .eq("id", pipeline_id)
            .execute()
        )

        return response.data[0] if response.data else {}

    async def mark_interrupted(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Mark the pipeline as interrupted (for server restart handling).

        Args:
            pipeline_id: The pipeline state ID

        Returns:
            Updated pipeline state record
        """
        update_data = {
            "status": PipelineState.INTERRUPTED,
            "last_updated_at": datetime.utcnow().isoformat(),
        }

        response = (
            self._query()
            .update(update_data)
            .eq("id", pipeline_id)
            .execute()
        )

        return response.data[0] if response.data else {}

    async def mark_stale_as_interrupted(
        self,
        timeout_minutes: int = 30,
    ) -> int:
        """
        Mark stale running pipelines as interrupted.

        Called on server startup to handle pipelines interrupted by crash/restart.

        Args:
            timeout_minutes: Consider running pipelines older than this as stale

        Returns:
            Number of pipelines marked as interrupted
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)

        # Find stale running pipelines
        stale_pipelines = (
            self._query()
            .select("id")
            .eq("status", PipelineState.RUNNING)
            .lt("last_updated_at", cutoff_time.isoformat())
            .execute()
        )

        count = 0
        for pipeline in stale_pipelines.data or []:
            self._query().update({
                "status": PipelineState.INTERRUPTED,
                "last_updated_at": datetime.utcnow().isoformat(),
            }).eq("id", pipeline["id"]).execute()
            count += 1

        return count

    async def get_recent(self, limit: int = 10) -> list:
        """
        Get recent pipeline states for monitoring.

        Args:
            limit: Maximum number of records to return

        Returns:
            List of recent pipeline state records
        """
        response = (
            self._query()
            .select("*")
            .order("started_at", desc=True)
            .limit(limit)
            .execute()
        )

        return response.data or []

    async def cleanup_old(self, days: int = 7) -> int:
        """
        Delete old pipeline state records.

        Args:
            days: Delete records older than this many days

        Returns:
            Number of deleted records
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Count first
        count_response = (
            self._query()
            .select("id", count="exact")
            .lt("started_at", cutoff_date.isoformat())
            .execute()
        )
        count = count_response.count or 0

        if count > 0:
            self._query().delete().lt("started_at", cutoff_date.isoformat()).execute()

        return count
