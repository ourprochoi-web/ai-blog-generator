"""Slack notification service using webhooks."""

import logging
from typing import Any, Dict, List, Optional

import httpx

from backend.app.config import settings

logger = logging.getLogger(__name__)


class SlackNotifier:
    """Send notifications to Slack via webhook."""

    def __init__(self, webhook_url: Optional[str] = None):
        """Initialize with webhook URL from settings or parameter."""
        self.webhook_url = webhook_url or settings.SLACK_WEBHOOK_URL
        self.enabled = bool(self.webhook_url)

        if not self.enabled:
            logger.warning("Slack notifications disabled: SLACK_WEBHOOK_URL not set")

    async def send_message(
        self,
        text: str,
        blocks: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """
        Send a message to Slack.

        Args:
            text: Fallback text (shown in notifications)
            blocks: Optional rich message blocks

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.debug(f"Slack disabled, skipping: {text[:50]}...")
            return False

        payload: Dict[str, Any] = {"text": text}
        if blocks:
            payload["blocks"] = blocks

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                    timeout=10.0,
                )
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to send Slack message: {e}")
            return False

    # Pipeline notification methods

    async def notify_scrape_started(self) -> bool:
        """Notify that scraping has started."""
        return await self.send_message(
            text=":mag: Starting source scraping...",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":mag: *Scraping Started*\nCollecting sources from RSS feeds and arXiv...",
                    },
                }
            ],
        )

    async def notify_scrape_completed(
        self,
        rss_count: int,
        arxiv_count: int,
        duplicates_skipped: int,
        errors: List[str],
    ) -> bool:
        """Notify scraping completion with results."""
        total = rss_count + arxiv_count
        status_emoji = ":white_check_mark:" if not errors else ":warning:"

        text = f"{status_emoji} Scraping completed: {total} sources collected"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_emoji} *Scraping Completed*",
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*RSS Sources:*\n{rss_count}"},
                    {"type": "mrkdwn", "text": f"*arXiv Papers:*\n{arxiv_count}"},
                    {"type": "mrkdwn", "text": f"*Duplicates Skipped:*\n{duplicates_skipped}"},
                    {"type": "mrkdwn", "text": f"*Total New:*\n{total}"},
                ],
            },
        ]

        if errors:
            error_text = "\n".join(f"- {e[:100]}" for e in errors[:3])
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":x: *Errors ({len(errors)}):*\n{error_text}",
                },
            })

        return await self.send_message(text=text, blocks=blocks)

    async def notify_evaluation_started(self, count: int) -> bool:
        """Notify that evaluation has started."""
        return await self.send_message(
            text=f":brain: Evaluating {count} sources...",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":brain: *Evaluation Started*\nAnalyzing {count} pending sources with AI...",
                    },
                }
            ],
        )

    async def notify_evaluation_completed(
        self,
        evaluated: int,
        auto_selected: int,
        selected_sources: Optional[List[Dict[str, Any]]] = None,
        errors: List[str] = None,
    ) -> bool:
        """Notify evaluation completion with results."""
        errors = errors or []
        status_emoji = ":white_check_mark:" if not errors else ":warning:"

        text = f"{status_emoji} Evaluation completed: {auto_selected}/{evaluated} sources selected"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_emoji} *Evaluation Completed*",
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Evaluated:*\n{evaluated}"},
                    {"type": "mrkdwn", "text": f"*Auto-selected:*\n{auto_selected}"},
                ],
            },
        ]

        # Show selected sources if available
        if selected_sources:
            source_list = "\n".join(
                f"- {s.get('title', 'Untitled')[:60]}... (Score: {s.get('relevance_score', 'N/A')})"
                for s in selected_sources[:5]
            )
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":star: *Selected Sources:*\n{source_list}",
                },
            })

        if errors:
            error_text = "\n".join(f"- {e[:100]}" for e in errors[:3])
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":x: *Errors ({len(errors)}):*\n{error_text}",
                },
            })

        return await self.send_message(text=text, blocks=blocks)

    async def notify_generation_started(self, count: int, edition: str) -> bool:
        """Notify that article generation has started."""
        return await self.send_message(
            text=f":pencil2: Generating {count} articles ({edition} edition)...",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":pencil2: *Article Generation Started*\nGenerating up to {count} articles for {edition} edition...",
                    },
                }
            ],
        )

    async def notify_generation_completed(
        self,
        generated: int,
        edition: str,
        articles: Optional[List[Dict[str, Any]]] = None,
        errors: List[str] = None,
    ) -> bool:
        """Notify article generation completion."""
        errors = errors or []
        status_emoji = ":white_check_mark:" if not errors else ":warning:"

        text = f"{status_emoji} Generated {generated} articles ({edition} edition)"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_emoji} *Article Generation Completed*",
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Generated:*\n{generated}"},
                    {"type": "mrkdwn", "text": f"*Edition:*\n{edition}"},
                ],
            },
        ]

        # Show generated articles if available
        if articles:
            article_list = "\n".join(
                f"- {a.get('title', 'Untitled')[:60]}..."
                for a in articles[:5]
            )
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":page_facing_up: *Generated Articles:*\n{article_list}",
                },
            })

        if errors:
            error_text = "\n".join(f"- {e[:100]}" for e in errors[:3])
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":x: *Errors ({len(errors)}):*\n{error_text}",
                },
            })

        return await self.send_message(text=text, blocks=blocks)

    async def notify_article_published(
        self,
        title: str,
        url: str,
        slug: str,
    ) -> bool:
        """Notify when an article is published."""
        return await self.send_message(
            text=f":rocket: Article Published: {title}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":rocket: *Article Published!*\n*{title}*",
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":link: <{url}|View Article>",
                    },
                },
            ],
        )

    async def notify_pipeline_started(self) -> bool:
        """Notify that the full pipeline has started."""
        return await self.send_message(
            text=":gear: Full pipeline started (Scrape -> Evaluate -> Generate)",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":gear: *Full Pipeline Started*\n`Scrape` :arrow_right: `Evaluate` :arrow_right: `Generate`",
                    },
                }
            ],
        )

    async def notify_pipeline_completed(
        self,
        scraped: int,
        evaluated: int,
        auto_selected: int,
        generated: int,
        edition: str,
    ) -> bool:
        """Notify pipeline completion with summary."""
        return await self.send_message(
            text=f":tada: Pipeline completed! Generated {generated} articles",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":tada: *Pipeline Completed!*",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Sources Scraped:*\n{scraped}"},
                        {"type": "mrkdwn", "text": f"*Sources Evaluated:*\n{evaluated}"},
                        {"type": "mrkdwn", "text": f"*Auto-selected:*\n{auto_selected}"},
                        {"type": "mrkdwn", "text": f"*Articles Generated:*\n{generated}"},
                    ],
                },
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f":clock1: Edition: {edition}"},
                    ],
                },
            ],
        )

    async def notify_pipeline_error(self, step: str, error: str) -> bool:
        """Notify when pipeline encounters an error."""
        return await self.send_message(
            text=f":x: Pipeline error at {step}: {error[:100]}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":x: *Pipeline Error*\nFailed at step: *{step}*",
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"```{error[:500]}```",
                    },
                },
            ],
        )

    # New notification methods for enhanced status reporting

    async def notify_stale_jobs_cleaned(self, count: int) -> bool:
        """Notify when stale running jobs are marked as interrupted."""
        return await self.send_message(
            text=f":broom: Cleaned up {count} stale jobs",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":broom: *Stale Jobs Cleaned*\nMarked {count} interrupted job(s) from previous run.",
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "These jobs were running when the app restarted and didn't complete.",
                        }
                    ],
                },
            ],
        )

    async def notify_pipeline_resumed(self, edition: str, reason: str) -> bool:
        """Notify when a missed pipeline is being resumed."""
        return await self.send_message(
            text=f":arrows_counterclockwise: Resuming missed {edition} pipeline",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":arrows_counterclockwise: *Pipeline Resumed*\nRunning missed *{edition}* edition pipeline.",
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Reason: {reason}",
                        }
                    ],
                },
            ],
        )

    async def notify_hero_images_generated(
        self,
        generated: int,
        failed: int,
        errors: List[str] = None,
    ) -> bool:
        """Notify hero image generation results."""
        errors = errors or []
        total = generated + failed
        status_emoji = ":white_check_mark:" if failed == 0 else ":warning:"

        text = f"{status_emoji} Hero images: {generated}/{total} generated"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status_emoji} *Hero Image Generation*",
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Generated:*\n{generated}"},
                    {"type": "mrkdwn", "text": f"*Failed:*\n{failed}"},
                ],
            },
        ]

        if errors:
            error_text = "\n".join(f"- {e[:80]}..." for e in errors[:3])
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":x: *Errors:*\n{error_text}",
                },
            })

        return await self.send_message(text=text, blocks=blocks)

    async def notify_job_timeout(self, job_type: str, job_id: str, duration_minutes: int) -> bool:
        """Notify when a job times out."""
        return await self.send_message(
            text=f":hourglass: Job timeout: {job_type}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":hourglass: *Job Timeout*\n*{job_type}* job exceeded time limit.",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Job ID:*\n{job_id[:8]}..."},
                        {"type": "mrkdwn", "text": f"*Duration:*\n{duration_minutes} min"},
                    ],
                },
            ],
        )

    async def notify_daily_summary(
        self,
        date: str,
        total_scraped: int,
        total_evaluated: int,
        total_generated: int,
        total_published: int,
        errors_count: int,
    ) -> bool:
        """Send daily summary notification."""
        status_emoji = ":chart_with_upwards_trend:" if errors_count == 0 else ":warning:"

        return await self.send_message(
            text=f"{status_emoji} Daily Summary for {date}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"{status_emoji} *Daily Summary - {date}*",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Sources Scraped:*\n{total_scraped}"},
                        {"type": "mrkdwn", "text": f"*Sources Evaluated:*\n{total_evaluated}"},
                        {"type": "mrkdwn", "text": f"*Articles Generated:*\n{total_generated}"},
                        {"type": "mrkdwn", "text": f"*Articles Published:*\n{total_published}"},
                    ],
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f":x: Errors: {errors_count}" if errors_count > 0 else ":white_check_mark: No errors",
                        }
                    ],
                },
            ],
        )


# Global instance (lazy initialization)
_slack_notifier: Optional[SlackNotifier] = None


def get_slack_notifier() -> SlackNotifier:
    """Get or create the global SlackNotifier instance."""
    global _slack_notifier
    if _slack_notifier is None:
        _slack_notifier = SlackNotifier()
    return _slack_notifier
