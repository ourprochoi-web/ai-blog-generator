"""Scheduler API routes for manual triggering and status."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.scheduler.jobs import (
    evaluate_pending_sources,
    generate_articles_from_selected,
    get_scheduler,
    run_full_pipeline,
    scrape_all_sources,
)

router = APIRouter(prefix="/scheduler")


class SchedulerStatus(BaseModel):
    """Scheduler status response."""

    running: bool
    next_run: Optional[str] = None
    scrape_interval_hours: int
    max_articles_per_day: int
    auto_generate_min_score: float


class JobResult(BaseModel):
    """Job execution result."""

    success: bool
    message: str
    data: Optional[dict] = None


@router.get("/status", response_model=SchedulerStatus)
async def get_scheduler_status():
    """Get current scheduler status."""
    sched = get_scheduler()

    next_run = None
    if sched.running:
        job = sched.get_job("full_pipeline")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()

    return SchedulerStatus(
        running=sched.running,
        next_run=next_run,
        scrape_interval_hours=settings.SCRAPE_INTERVAL_HOURS,
        max_articles_per_day=settings.MAX_ARTICLES_PER_DAY,
        auto_generate_min_score=settings.AUTO_GENERATE_MIN_SCORE,
    )


@router.post("/run", response_model=JobResult)
async def run_pipeline_now(background_tasks: BackgroundTasks):
    """
    Trigger the full pipeline immediately (scrape -> evaluate -> generate).

    Runs in background to avoid timeout.
    """
    background_tasks.add_task(run_full_pipeline)

    return JobResult(
        success=True,
        message="Full pipeline started in background",
    )


@router.post("/scrape", response_model=JobResult)
async def run_scrape_now(background_tasks: BackgroundTasks):
    """Trigger scraping job immediately."""
    background_tasks.add_task(scrape_all_sources)

    return JobResult(
        success=True,
        message="Scrape job started in background",
    )


@router.post("/evaluate", response_model=JobResult)
async def run_evaluate_now(background_tasks: BackgroundTasks):
    """Trigger source evaluation job immediately."""
    background_tasks.add_task(evaluate_pending_sources)

    return JobResult(
        success=True,
        message="Evaluation job started in background",
    )


@router.post("/generate", response_model=JobResult)
async def run_generate_now(background_tasks: BackgroundTasks):
    """Trigger article generation job immediately."""
    background_tasks.add_task(generate_articles_from_selected)

    return JobResult(
        success=True,
        message="Generation job started in background",
    )
