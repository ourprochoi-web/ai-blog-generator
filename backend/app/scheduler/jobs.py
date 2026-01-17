"""APScheduler jobs for automated scraping and article generation."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, AsyncGenerator, Dict, List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import UTC
from slugify import slugify

from backend.app.config import SCRAPE_SOURCES, settings
from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.activity_log_repo import ActivityLogRepository
from backend.app.db.repositories.article_repo import ArticleRepository
from backend.app.db.repositories.source_repo import SourceRepository
from backend.app.models.activity_log import ActivityStatus, ActivityType
from backend.app.models.article import ArticleEdition, HeroImageStatus
from backend.app.models.source import SourceStatus
from backend.app.services.generators.blog_writer import BlogWriter
from backend.app.services.generators.source_evaluator import SourceEvaluator
from backend.app.services.llm.image_generator import ImageGenerator
from backend.app.services.storage.supabase_storage import SupabaseStorage
from backend.app.services.scrapers.arxiv import ArxivScraper
from backend.app.services.scrapers.news import NewsScraper
from backend.app.services.notifications.slack import get_slack_notifier

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None

# Lock to prevent concurrent pipeline execution
_pipeline_lock = asyncio.Lock()


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the scheduler instance."""
    global scheduler
    if scheduler is None:
        # Use explicit UTC timezone to avoid warning
        scheduler = AsyncIOScheduler(timezone=UTC)
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
    activity_log_repo = ActivityLogRepository(client)
    slack = get_slack_notifier()

    # Log start
    await activity_log_repo.create(
        ActivityType.SCRAPE,
        ActivityStatus.RUNNING,
        "Starting scrape job",
    )

    # Slack notification: scrape started
    await slack.notify_scrape_started()

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

    # Log completion
    total_scraped = results["rss_scraped"] + results["arxiv_scraped"]
    status = ActivityStatus.SUCCESS if not results["errors"] else ActivityStatus.ERROR
    await activity_log_repo.create(
        ActivityType.SCRAPE,
        status,
        f"Scraped {total_scraped} sources ({results['rss_scraped']} RSS, {results['arxiv_scraped']} arXiv)",
        details={
            "rss_scraped": results["rss_scraped"],
            "arxiv_scraped": results["arxiv_scraped"],
            "duplicates_skipped": results["duplicates_skipped"],
            "errors": results["errors"][:5] if results["errors"] else [],  # Limit errors
        },
    )

    # Slack notification: scrape completed
    await slack.notify_scrape_completed(
        rss_count=results["rss_scraped"],
        arxiv_count=results["arxiv_scraped"],
        duplicates_skipped=results["duplicates_skipped"],
        errors=results["errors"],
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
    activity_log_repo = ActivityLogRepository(client)
    evaluator = SourceEvaluator()
    slack = get_slack_notifier()

    # Log start
    await activity_log_repo.create(
        ActivityType.EVALUATE,
        ActivityStatus.RUNNING,
        "Starting source evaluation",
    )

    results = {
        "evaluated": 0,
        "auto_selected": 0,
        "selected_sources": [],  # Track selected sources for notification
        "errors": [],
    }

    # Get unreviewed pending sources
    sources, _ = await source_repo.get_unreviewed_sources(page=1, page_size=100)

    # Slack notification: evaluation started
    if sources:
        await slack.notify_evaluation_started(len(sources))

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

            # Auto-select if score meets threshold (score is 0-100)
            if evaluation.relevance_score >= settings.AUTO_GENERATE_MIN_SCORE:
                update_data["is_selected"] = True
                update_data["status"] = SourceStatus.SELECTED.value
                update_data["selection_note"] = f"Auto-selected: {evaluation.reason}"
                results["auto_selected"] += 1
                # Track selected source for notification
                results["selected_sources"].append({
                    "title": source["title"],
                    "relevance_score": evaluation.relevance_score,
                })

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

    # Log completion
    status = ActivityStatus.SUCCESS if not results["errors"] else ActivityStatus.ERROR
    await activity_log_repo.create(
        ActivityType.EVALUATE,
        status,
        f"Evaluated {results['evaluated']} sources, {results['auto_selected']} auto-selected",
        details={
            "evaluated": results["evaluated"],
            "auto_selected": results["auto_selected"],
            "errors": results["errors"][:5] if results["errors"] else [],
        },
    )

    # Slack notification: evaluation completed
    await slack.notify_evaluation_completed(
        evaluated=results["evaluated"],
        auto_selected=results["auto_selected"],
        selected_sources=results["selected_sources"],
        errors=results["errors"],
    )

    return results


def get_current_edition() -> ArticleEdition:
    """
    Determine current edition based on KST time.

    Morning: before 2 PM KST (before 5:00 UTC)
    Evening: 2 PM KST and after (5:00 UTC and after)
    """
    utc_now = datetime.utcnow()
    kst_hour = (utc_now.hour + 9) % 24  # Convert to KST

    if kst_hour < 14:  # Before 2 PM KST
        return ArticleEdition.MORNING
    else:
        return ArticleEdition.EVENING


async def generate_articles_from_selected(edition: Optional[ArticleEdition] = None) -> dict:
    """
    Generate articles from selected sources (up to edition limit).

    Args:
        edition: Optional edition override. If not provided, auto-detect.

    Returns:
        Dictionary with generation results
    """
    logger.info("Starting article generation job")
    client = get_supabase_client()
    source_repo = SourceRepository(client)
    article_repo = ArticleRepository(client)
    activity_log_repo = ActivityLogRepository(client)
    slack = get_slack_notifier()

    # Log start
    await activity_log_repo.create(
        ActivityType.GENERATE,
        ActivityStatus.RUNNING,
        "Starting article generation",
    )

    # Initialize writer with optional image generation
    image_generator = None
    storage = None
    if settings.GENERATE_HERO_IMAGES:
        try:
            image_generator = ImageGenerator()
            storage = SupabaseStorage(bucket=settings.IMAGE_STORAGE_BUCKET)
            logger.info("Image generation enabled")
        except Exception as e:
            logger.warning(f"Failed to initialize image generator: {e}")

    writer = BlogWriter(
        image_generator=image_generator,
        storage=storage,
    )

    # Determine edition
    current_edition = edition or get_current_edition()
    logger.info(f"Generating for {current_edition.value} edition")

    results = {
        "generated": 0,
        "skipped_existing": 0,
        "edition": current_edition.value,
        "generated_articles": [],  # Track generated articles for notification
        "errors": [],
    }

    # Check how many articles generated for this edition today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    articles_this_edition = await article_repo.count_by_edition_since(today_start, current_edition)
    remaining_quota = settings.MAX_ARTICLES_PER_EDITION - articles_this_edition

    if remaining_quota <= 0:
        logger.info(f"Edition limit reached ({settings.MAX_ARTICLES_PER_EDITION} for {current_edition.value})")
        return results

    # Get selected sources ready for generation
    sources = await source_repo.get_sources_for_generation(limit=remaining_quota)

    # Slack notification: generation started
    if sources:
        await slack.notify_generation_started(len(sources), current_edition.value)

    for source in sources:
        # Check if article already exists for this source
        existing = await article_repo.get_by_source_id(source["id"])
        if existing:
            results["skipped_existing"] += 1
            continue

        try:
            logger.info(f"Generating article for: {source['title'][:50]}...")

            # Pre-generate slug for image upload path
            temp_slug = slugify(source["title"], max_length=200)

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
                generate_image=settings.GENERATE_HERO_IMAGES,
                article_slug=temp_slug,
            )

            # Generate final slug from generated title
            slug = slugify(generated.title, max_length=200)
            if await article_repo.slug_exists(slug):
                base_slug = slug
                counter = 1
                while await article_repo.slug_exists(slug):
                    slug = f"{base_slug}-{counter}"
                    counter += 1

            # Truncate fields to fit DB constraints
            meta_desc = generated.meta_description
            if meta_desc and len(meta_desc) > 160:
                meta_desc = meta_desc[:157] + "..."

            subtitle = generated.subtitle
            if subtitle and len(subtitle) > 200:
                subtitle = subtitle[:197] + "..."

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

            # Save article with edition
            article_data = {
                "source_id": source["id"],
                "title": generated.title[:300] if generated.title else "Untitled",
                "subtitle": subtitle,
                "slug": slug,
                "content": content_with_source,
                "tags": generated.tags,
                "references": generated.references,
                "word_count": generated.word_count,
                "char_count": generated.char_count,
                "status": "draft",
                "edition": current_edition.value,
                "meta_description": meta_desc,
                "llm_model": generated.llm_model,
                "generation_time_seconds": generated.generation_time_seconds,
            }

            # Set hero image status for async generation
            if settings.GENERATE_HERO_IMAGES:
                article_data["hero_image_status"] = HeroImageStatus.PENDING.value
                article_data["hero_image_requested_at"] = datetime.utcnow().isoformat()
            else:
                article_data["hero_image_status"] = HeroImageStatus.SKIPPED.value

            await article_repo.create(article_data)

            # Update source status to processed
            await source_repo.update_status(source["id"], SourceStatus.PROCESSED)
            results["generated"] += 1
            # Track generated article for notification
            results["generated_articles"].append({
                "title": generated.title,
                "slug": slug,
            })

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

    # Log completion
    status = ActivityStatus.SUCCESS if not results["errors"] else ActivityStatus.ERROR
    await activity_log_repo.create(
        ActivityType.GENERATE,
        status,
        f"Generated {results['generated']} articles ({current_edition.value} edition)",
        details={
            "generated": results["generated"],
            "skipped_existing": results["skipped_existing"],
            "edition": results["edition"],
            "errors": results["errors"][:5] if results["errors"] else [],
        },
    )

    # Slack notification: generation completed
    await slack.notify_generation_completed(
        generated=results["generated"],
        edition=current_edition.value,
        articles=results["generated_articles"],
        errors=results["errors"],
    )

    return results


async def run_full_pipeline() -> dict:
    """
    Run the full pipeline: scrape -> evaluate -> generate.

    Uses a lock to prevent concurrent execution.

    Returns:
        Combined results from all steps
    """
    # Check if pipeline is already running
    if _pipeline_lock.locked():
        logger.warning("Pipeline already running, skipping this execution")
        return {"skipped": True, "reason": "Pipeline already running"}

    client = get_supabase_client()
    activity_log_repo = ActivityLogRepository(client)
    slack = get_slack_notifier()

    async with _pipeline_lock:
        logger.info("Starting full pipeline job")

        # Mark any stale running jobs as interrupted (handles app restarts)
        interrupted_count = await activity_log_repo.mark_stale_running_as_interrupted(
            timeout_minutes=30
        )
        if interrupted_count > 0:
            logger.info(f"Marked {interrupted_count} stale running jobs as interrupted")
            await slack.notify_stale_jobs_cleaned(interrupted_count)

        # Slack notification: pipeline started
        await slack.notify_pipeline_started()

        # Log pipeline start
        await activity_log_repo.create(
            ActivityType.PIPELINE,
            ActivityStatus.RUNNING,
            "Starting full pipeline (scrape → evaluate → generate)",
        )

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

            # Log pipeline success
            await activity_log_repo.create(
                ActivityType.PIPELINE,
                ActivityStatus.SUCCESS,
                "Full pipeline completed successfully",
                details={
                    "scraped": results["scrape"].get("rss_scraped", 0) + results["scrape"].get("arxiv_scraped", 0),
                    "evaluated": results["evaluate"].get("evaluated", 0),
                    "generated": results["generate"].get("generated", 0),
                },
            )

            # Slack notification: pipeline completed
            await slack.notify_pipeline_completed(
                scraped=results["scrape"].get("rss_scraped", 0) + results["scrape"].get("arxiv_scraped", 0),
                evaluated=results["evaluate"].get("evaluated", 0),
                auto_selected=results["evaluate"].get("auto_selected", 0),
                generated=results["generate"].get("generated", 0),
                edition=results["generate"].get("edition", "unknown"),
            )

            # Step 4: Generate hero images asynchronously (non-blocking)
            if settings.GENERATE_HERO_IMAGES and results["generate"].get("generated", 0) > 0:
                try:
                    results["hero_images"] = await generate_pending_hero_images()
                except Exception as img_error:
                    logger.warning(f"Hero image generation failed (non-critical): {img_error}")
                    results["hero_images"] = {"error": str(img_error)}

        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            results["error"] = str(e)

            # Log pipeline error
            await activity_log_repo.create(
                ActivityType.PIPELINE,
                ActivityStatus.ERROR,
                f"Pipeline failed: {str(e)}",
            )

            # Slack notification: pipeline error
            await slack.notify_pipeline_error("pipeline", str(e))

        logger.info("Full pipeline completed")
        return results


async def run_full_pipeline_with_progress() -> AsyncGenerator[Dict[str, Any], None]:
    """
    Run full pipeline with real-time progress updates.

    Yields progress events for SSE streaming.
    """
    # Check if pipeline is already running
    if _pipeline_lock.locked():
        yield {
            "step": "error",
            "status": "error",
            "message": "Pipeline already running",
        }
        return

    async with _pipeline_lock:
        logger.info("Starting full pipeline with progress tracking")

        # Step 1: Scrape
        yield {
            "step": "scrape",
            "status": "running",
            "message": "Scraping sources from RSS feeds and arXiv...",
        }

        try:
            scrape_result = await scrape_all_sources()
            yield {
                "step": "scrape",
                "status": "completed",
                "message": f"Scraped {scrape_result.get('rss_scraped', 0)} RSS, {scrape_result.get('arxiv_scraped', 0)} arXiv",
                "data": scrape_result,
            }
        except Exception as e:
            logger.error(f"Scrape error: {e}")
            yield {
                "step": "scrape",
                "status": "error",
                "message": f"Scrape failed: {str(e)}",
            }
            # Continue to next step even if scrape fails

        # Step 2: Evaluate
        yield {
            "step": "evaluate",
            "status": "running",
            "message": "Evaluating sources with AI...",
        }

        try:
            evaluate_result = await evaluate_pending_sources()
            yield {
                "step": "evaluate",
                "status": "completed",
                "message": f"Evaluated {evaluate_result.get('evaluated', 0)} sources, {evaluate_result.get('auto_selected', 0)} selected",
                "data": evaluate_result,
            }
        except Exception as e:
            logger.error(f"Evaluate error: {e}")
            yield {
                "step": "evaluate",
                "status": "error",
                "message": f"Evaluation failed: {str(e)}",
            }

        # Step 3: Generate
        yield {
            "step": "generate",
            "status": "running",
            "message": "Generating articles from selected sources...",
        }

        try:
            generate_result = await generate_articles_from_selected()
            yield {
                "step": "generate",
                "status": "completed",
                "message": f"Generated {generate_result.get('generated', 0)} articles",
                "data": generate_result,
            }
        except Exception as e:
            logger.error(f"Generate error: {e}")
            yield {
                "step": "generate",
                "status": "error",
                "message": f"Generation failed: {str(e)}",
            }

        # Final done event
        yield {
            "step": "done",
            "status": "completed",
            "message": "Pipeline completed!",
        }

        logger.info("Full pipeline with progress completed")


async def check_and_run_missed_schedule() -> Optional[dict]:
    """
    Check if we missed a scheduled run and execute if needed.

    This handles cases where the app was down during scheduled time.
    Checks activity_logs to see if pipeline ran recently.

    Returns:
        Pipeline results if run, None otherwise
    """
    logger.info("Checking for missed scheduled runs...")

    client = get_supabase_client()
    activity_log_repo = ActivityLogRepository(client)
    slack = get_slack_notifier()

    utc_now = datetime.utcnow()
    kst_hour = (utc_now.hour + 9) % 24

    # Determine which edition we should have run
    # Morning: 8 AM KST (23:00 UTC prev day)
    # Evening: 8 PM KST (11:00 UTC)

    # Check if we're within the "catch-up window" (within 2 hours of scheduled time)
    morning_window = kst_hour >= 8 and kst_hour < 10  # 8-10 AM KST
    evening_window = kst_hour >= 20 and kst_hour < 22  # 8-10 PM KST

    if not (morning_window or evening_window):
        logger.info("Not within catch-up window, skipping missed schedule check")
        return None

    edition = ArticleEdition.MORNING if morning_window else ArticleEdition.EVENING

    # Check if pipeline already ran for this edition today
    today_start = utc_now.replace(hour=0, minute=0, second=0, microsecond=0)

    # For morning edition, check from previous day 23:00 UTC
    if edition == ArticleEdition.MORNING:
        check_from = today_start - timedelta(hours=1)  # 23:00 UTC previous day
    else:
        check_from = today_start + timedelta(hours=11)  # 11:00 UTC today

    # Look for recent pipeline runs
    recent_logs = await activity_log_repo.get_recent(
        activity_type=ActivityType.PIPELINE,
        since=check_from,
        limit=5,
    )

    # Check if any pipeline run exists (SUCCESS or RUNNING)
    # RUNNING means currently in progress or interrupted - either way, don't start another
    pipeline_ran = any(
        log.get("status") in [ActivityStatus.SUCCESS.value, ActivityStatus.RUNNING.value]
        for log in recent_logs
    )

    if pipeline_ran:
        status = next(
            (log.get("status") for log in recent_logs
             if log.get("status") in [ActivityStatus.SUCCESS.value, ActivityStatus.RUNNING.value]),
            "unknown"
        )
        logger.info(f"Pipeline already ran/running for {edition.value} edition (status: {status}), skipping")
        return None

    logger.info(f"Missed {edition.value} edition pipeline detected! Running now...")

    # Slack notification: pipeline resumed
    await slack.notify_pipeline_resumed(
        edition=edition.value,
        reason="App restarted during scheduled time window",
    )

    # Log that we're running a catch-up
    await activity_log_repo.create(
        ActivityType.PIPELINE,
        ActivityStatus.RUNNING,
        f"Running missed {edition.value} edition pipeline (catch-up)",
    )

    # Run the pipeline
    result = await run_full_pipeline()

    return result


async def generate_pending_hero_images() -> dict:
    """
    Generate hero images for articles with pending status.

    This runs as a separate job to avoid blocking article generation.

    Returns:
        Dictionary with generation results
    """
    logger.info("Starting hero image generation job")

    if not settings.GENERATE_HERO_IMAGES:
        logger.info("Hero image generation disabled, skipping")
        return {"skipped": True, "reason": "disabled"}

    client = get_supabase_client()
    article_repo = ArticleRepository(client)
    activity_log_repo = ActivityLogRepository(client)
    slack = get_slack_notifier()

    results = {
        "generated": 0,
        "failed": 0,
        "errors": [],
    }

    try:
        image_generator = ImageGenerator()
        storage = SupabaseStorage(bucket=settings.IMAGE_STORAGE_BUCKET)
    except Exception as e:
        logger.error(f"Failed to initialize image generator: {e}")
        return {"error": str(e)}

    # Get articles with pending hero images
    pending_articles = await article_repo.get_pending_hero_images(limit=5)

    if not pending_articles:
        logger.info("No pending hero images to generate")
        return results

    logger.info(f"Found {len(pending_articles)} articles with pending hero images")

    for article in pending_articles:
        article_id = article["id"]
        try:
            # Mark as generating
            await article_repo.update_hero_image_status(
                article_id,
                HeroImageStatus.GENERATING,
            )

            logger.info(f"Generating hero image for: {article['title'][:50]}...")

            # Generate image
            image_data = await image_generator.generate_hero_image(
                article_title=article["title"],
                article_summary=article.get("meta_description", ""),
            )

            if image_data:
                # Upload to storage
                image_url = await storage.upload_image(
                    image_data=image_data,
                    article_slug=article["slug"],
                    image_type="hero",
                )

                if image_url:
                    await article_repo.update_hero_image_status(
                        article_id,
                        HeroImageStatus.COMPLETED,
                        image_url=image_url,
                    )
                    results["generated"] += 1
                    logger.info(f"Hero image uploaded: {image_url}")
                else:
                    raise Exception("Failed to upload image to storage")
            else:
                raise Exception("Image generator returned no data")

        except Exception as e:
            error_msg = f"Failed to generate hero image for {article_id}: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
            results["failed"] += 1

            await article_repo.update_hero_image_status(
                article_id,
                HeroImageStatus.FAILED,
                error=str(e),
            )

    logger.info(
        f"Hero image generation completed: {results['generated']} generated, "
        f"{results['failed']} failed"
    )

    # Slack notification if any images were processed
    if results["generated"] > 0 or results["failed"] > 0:
        await slack.notify_hero_images_generated(
            generated=results["generated"],
            failed=results["failed"],
            errors=results["errors"],
        )

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
