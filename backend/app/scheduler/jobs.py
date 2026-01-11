"""APScheduler jobs for automated scraping and article generation."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.app.config import SCRAPE_SOURCES, settings
from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.article_repo import ArticleRepository
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.models.source import SourceStatus
from backend.app.services.generators.blog_writer import BlogWriter
from backend.app.services.generators.source_evaluator import SourceEvaluator
from backend.app.services.scrapers.arxiv import ArxivScraper
from backend.app.services.scrapers.news import NewsScraper

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the scheduler instance."""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


async def scrape_all_sources() -> dict:
    """
    Scrape all configured sources (RSS feeds and arXiv).

    Returns:
        Dictionary with scraping results
    """
    logger.info("Starting scheduled scrape job")
    client = get_supabase_client()
    source_repo = SourceRepository(client)

    results = {
        "rss_scraped": 0,
        "arxiv_scraped": 0,
        "duplicates_skipped": 0,
        "errors": [],
    }

    # Scrape RSS feeds
    news_scraper = NewsScraper()
    for feed_config in SCRAPE_SOURCES["rss_feeds"]:
        try:
            logger.info(f"Scraping RSS feed: {feed_config['name']}")
            scraped_items = await news_scraper.scrape_feed(
                feed_config["url"],
                max_items=10,
            )

            for item in scraped_items:
                # Check if URL already exists
                existing = await source_repo.get_by_url(item.url)
                if existing:
                    results["duplicates_skipped"] += 1
                    continue

                # Save to database
                await source_repo.create({
                    "type": "news",
                    "title": item.title,
                    "url": item.url,
                    "content": item.content,
                    "summary": item.summary,
                    "metadata": {
                        **item.metadata,
                        "author": item.author,
                        "published_at": item.published_at.isoformat() if item.published_at else None,
                        "feed_name": feed_config["name"],
                    },
                    "status": SourceStatus.PENDING.value,
                })
                results["rss_scraped"] += 1

        except Exception as e:
            error_msg = f"Error scraping {feed_config['name']}: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)

    # Scrape arXiv
    arxiv_scraper = ArxivScraper()
    for category in SCRAPE_SOURCES["arxiv_categories"]:
        try:
            logger.info(f"Scraping arXiv category: {category}")
            # Search for recent papers in category
            scraped_papers = await arxiv_scraper.search(
                query=f"cat:{category}",
                max_results=10,
                sort_by="submittedDate",
                sort_order="descending",
            )

            for paper in scraped_papers:
                # Check if URL already exists
                existing = await source_repo.get_by_url(paper.url)
                if existing:
                    results["duplicates_skipped"] += 1
                    continue

                # Save to database
                await source_repo.create({
                    "type": "paper",
                    "title": paper.title,
                    "url": paper.url,
                    "content": paper.content,
                    "summary": paper.summary,
                    "metadata": {
                        **paper.metadata,
                        "author": paper.author,
                        "published_at": paper.published_at.isoformat() if paper.published_at else None,
                        "category": category,
                    },
                    "status": SourceStatus.PENDING.value,
                })
                results["arxiv_scraped"] += 1

        except Exception as e:
            error_msg = f"Error scraping arXiv {category}: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)

    logger.info(
        f"Scrape job completed: {results['rss_scraped']} RSS, "
        f"{results['arxiv_scraped']} arXiv, {results['duplicates_skipped']} skipped"
    )
    return results


async def evaluate_pending_sources() -> dict:
    """
    Evaluate pending sources using LLM and auto-select high-scoring ones.

    Returns:
        Dictionary with evaluation results
    """
    logger.info("Starting source evaluation job")
    client = get_supabase_client()
    source_repo = SourceRepository(client)
    evaluator = SourceEvaluator()

    results = {
        "evaluated": 0,
        "auto_selected": 0,
        "errors": [],
    }

    # Get unreviewed pending sources
    sources, _ = await source_repo.get_unreviewed_sources(page=1, page_size=20)

    for source in sources:
        try:
            # Evaluate source
            evaluation = await evaluator.evaluate_source(
                source_type=source["type"],
                title=source["title"],
                url=source["url"],
                content=source.get("content", ""),
                summary=source.get("summary"),
            )

            # Update source with evaluation results
            update_data = {
                "relevance_score": evaluation.relevance_score,
                "suggested_topic": evaluation.suggested_topic,
                "reviewed_at": datetime.utcnow().isoformat(),
            }

            # Auto-select if score meets threshold
            if evaluation.relevance_score >= settings.AUTO_GENERATE_MIN_SCORE * 10:
                update_data["is_selected"] = True
                update_data["status"] = SourceStatus.SELECTED.value
                update_data["selection_note"] = f"Auto-selected: {evaluation.reason}"
                results["auto_selected"] += 1

            await source_repo.update(source["id"], update_data)
            results["evaluated"] += 1

        except Exception as e:
            error_msg = f"Error evaluating source {source['id']}: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)

    logger.info(
        f"Evaluation job completed: {results['evaluated']} evaluated, "
        f"{results['auto_selected']} auto-selected"
    )
    return results


async def generate_articles_from_selected() -> dict:
    """
    Generate articles from selected sources (up to daily limit).

    Returns:
        Dictionary with generation results
    """
    logger.info("Starting article generation job")
    client = get_supabase_client()
    source_repo = SourceRepository(client)
    article_repo = ArticleRepository(client)
    writer = BlogWriter()

    results = {
        "generated": 0,
        "skipped_existing": 0,
        "errors": [],
    }

    # Check how many articles generated today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    articles_today = await article_repo.count_since(today_start)
    remaining_quota = settings.MAX_ARTICLES_PER_DAY - articles_today

    if remaining_quota <= 0:
        logger.info(f"Daily article limit reached ({settings.MAX_ARTICLES_PER_DAY})")
        return results

    # Get selected sources ready for generation
    sources = await source_repo.get_sources_for_generation(limit=remaining_quota)

    for source in sources:
        # Check if article already exists for this source
        existing = await article_repo.get_by_source_id(source["id"])
        if existing:
            results["skipped_existing"] += 1
            continue

        try:
            logger.info(f"Generating article for: {source['title'][:50]}...")

            # Generate article
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
            from slugify import slugify
            slug = slugify(generated.title, max_length=200)
            if await article_repo.slug_exists(slug):
                base_slug = slug
                counter = 1
                while await article_repo.slug_exists(slug):
                    slug = f"{base_slug}-{counter}"
                    counter += 1

            # Save article
            await article_repo.create({
                "source_id": source["id"],
                "title": generated.title,
                "subtitle": generated.subtitle,
                "slug": slug,
                "content": generated.content,
                "tags": generated.tags,
                "references": generated.references,
                "word_count": generated.word_count,
                "char_count": generated.char_count,
                "status": "draft",
                "meta_description": generated.meta_description,
                "llm_model": generated.llm_model,
                "generation_time_seconds": generated.generation_time_seconds,
            })

            # Update source status to processed
            await source_repo.update_status(source["id"], SourceStatus.PROCESSED)
            results["generated"] += 1

            logger.info(f"Generated article: {generated.title}")

        except Exception as e:
            error_msg = f"Error generating article for {source['id']}: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)

            # Mark source as failed
            await source_repo.update_status(
                source["id"],
                SourceStatus.FAILED,
                error_message=str(e)
            )

    logger.info(f"Generation job completed: {results['generated']} articles generated")
    return results


async def run_full_pipeline() -> dict:
    """
    Run the full pipeline: scrape -> evaluate -> generate.

    Returns:
        Combined results from all steps
    """
    logger.info("Starting full pipeline job")

    results = {
        "scrape": {},
        "evaluate": {},
        "generate": {},
    }

    try:
        # Step 1: Scrape new sources
        results["scrape"] = await scrape_all_sources()

        # Step 2: Evaluate pending sources
        results["evaluate"] = await evaluate_pending_sources()

        # Step 3: Generate articles from selected sources
        results["generate"] = await generate_articles_from_selected()

    except Exception as e:
        logger.error(f"Pipeline error: {str(e)}")
        results["error"] = str(e)

    logger.info("Full pipeline completed")
    return results


def setup_scheduler() -> AsyncIOScheduler:
    """
    Set up the APScheduler with configured jobs.

    Runs at 8 AM and 8 PM KST (Korea Standard Time, UTC+9).
    - 8 AM KST = 23:00 UTC (previous day)
    - 8 PM KST = 11:00 UTC

    Returns:
        Configured AsyncIOScheduler instance
    """
    sched = get_scheduler()

    # Add the full pipeline job - runs at 8 AM and 8 PM KST
    # KST = UTC+9, so 8 AM KST = 23:00 UTC (prev day), 8 PM KST = 11:00 UTC
    sched.add_job(
        run_full_pipeline,
        trigger=CronTrigger(hour="23,11", minute=0, timezone="UTC"),
        id="full_pipeline",
        name="Full scrape-evaluate-generate pipeline (8AM/8PM KST)",
        replace_existing=True,
    )

    logger.info("Scheduler configured: pipeline runs at 8 AM and 8 PM KST")

    return sched


def start_scheduler() -> None:
    """Start the scheduler."""
    sched = get_scheduler()
    if not sched.running:
        sched.start()
        logger.info("Scheduler started")


def stop_scheduler() -> None:
    """Stop the scheduler."""
    sched = get_scheduler()
    if sched.running:
        sched.shutdown()
        logger.info("Scheduler stopped")
