"""Base scraper abstract class."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx


@dataclass
class ScrapedContent:
    """Data class for scraped content."""

    title: str
    url: str
    content: str
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage."""
        return {
            "title": self.title,
            "url": self.url,
            "content": self.content,
            "summary": self.summary,
            "metadata": {
                "author": self.author,
                "published_at": self.published_at.isoformat() if self.published_at else None,
                **(self.metadata or {}),
            },
        }


class BaseScraper(ABC):
    """Abstract base class for all scrapers."""

    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

    async def fetch(self, url: str) -> str:
        """Fetch content from URL."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, headers=self.headers, follow_redirects=True)
            response.raise_for_status()
            return response.text

    async def fetch_json(self, url: str) -> Dict[str, Any]:
        """Fetch JSON from URL."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, headers=self.headers, follow_redirects=True)
            response.raise_for_status()
            return response.json()

    @abstractmethod
    async def scrape(self, url: str) -> ScrapedContent:
        """Scrape content from a single URL."""
        pass

    @abstractmethod
    async def scrape_multiple(self, urls: List[str]) -> List[ScrapedContent]:
        """Scrape content from multiple URLs."""
        pass

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        """Check if this scraper can handle the given URL."""
        pass
