"""News RSS feed scraper."""

from __future__ import annotations

import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional

import feedparser
from bs4 import BeautifulSoup

from backend.app.services.scrapers.base import BaseScraper, ScrapedContent


class NewsScraper(BaseScraper):
    """Scraper for news articles via RSS feeds."""

    # Common AI/Tech news RSS feeds
    DEFAULT_FEEDS = {
        "techcrunch_ai": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "wired_ai": "https://www.wired.com/feed/tag/ai/latest/rss",
        "mit_tech_review": "https://www.technologyreview.com/feed/",
        "venturebeat_ai": "https://venturebeat.com/category/ai/feed/",
        "the_verge_ai": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    }

    def can_handle(self, url: str) -> bool:
        """Check if URL is an RSS feed or known news source."""
        # Check for RSS/feed indicators
        rss_patterns = [
            r"/feed/?$",
            r"/rss/?$",
            r"\.rss$",
            r"\.xml$",
            r"/atom/?$",
        ]
        for pattern in rss_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True

        # Check for known news domains
        news_domains = [
            "techcrunch.com",
            "wired.com",
            "technologyreview.com",
            "venturebeat.com",
            "theverge.com",
            "arstechnica.com",
            "zdnet.com",
            "cnet.com",
        ]
        for domain in news_domains:
            if domain in url.lower():
                return True

        return False

    async def scrape(self, url: str) -> ScrapedContent:
        """Scrape a single news article."""
        html = await self.fetch(url)
        soup = BeautifulSoup(html, "lxml")

        # Extract title
        title = self._extract_title(soup)

        # Extract content
        content = self._extract_content(soup)

        # Extract metadata
        author = self._extract_author(soup)
        published_at = self._extract_date(soup)
        summary = self._extract_summary(soup)

        return ScrapedContent(
            title=title,
            url=url,
            content=content,
            summary=summary,
            author=author,
            published_at=published_at,
            metadata={
                "source_type": "news",
            },
        )

    async def scrape_multiple(self, urls: List[str]) -> List[ScrapedContent]:
        """Scrape multiple news articles."""
        results = []
        for url in urls:
            try:
                content = await self.scrape(url)
                results.append(content)
            except Exception as e:
                print(f"Error scraping {url}: {e}")
        return results

    async def scrape_feed(
        self,
        feed_url: str,
        max_items: int = 10,
    ) -> List[ScrapedContent]:
        """Scrape articles from an RSS feed."""
        # Fetch and parse feed
        feed_content = await self.fetch(feed_url)
        feed = feedparser.parse(feed_content)

        results = []
        for entry in feed.entries[:max_items]:
            try:
                content = self._parse_feed_entry(entry, feed_url)
                results.append(content)
            except Exception as e:
                print(f"Error parsing feed entry: {e}")

        return results

    async def scrape_default_feeds(
        self,
        max_items_per_feed: int = 5,
    ) -> List[ScrapedContent]:
        """Scrape from all default AI/tech news feeds."""
        all_results = []
        for feed_name, feed_url in self.DEFAULT_FEEDS.items():
            try:
                results = await self.scrape_feed(feed_url, max_items_per_feed)
                for r in results:
                    r.metadata["feed_name"] = feed_name
                all_results.extend(results)
            except Exception as e:
                print(f"Error scraping feed {feed_name}: {e}")
        return all_results

    def _parse_feed_entry(self, entry: Any, feed_url: str) -> ScrapedContent:
        """Parse a single RSS feed entry."""
        title = entry.get("title", "Untitled")
        link = entry.get("link", "")

        # Get summary/description
        summary = ""
        if "summary" in entry:
            summary = self._clean_html(entry.summary)
        elif "description" in entry:
            summary = self._clean_html(entry.description)

        # Get content (may be full article in some feeds)
        content = summary
        if "content" in entry and entry.content:
            content = self._clean_html(entry.content[0].get("value", ""))

        # Get author
        author = entry.get("author", "")
        if not author and "authors" in entry:
            author = ", ".join(a.get("name", "") for a in entry.authors)

        # Get published date
        published_at = None
        if "published_parsed" in entry and entry.published_parsed:
            try:
                published_at = datetime(*entry.published_parsed[:6])
            except Exception:
                pass
        elif "published" in entry:
            try:
                published_at = parsedate_to_datetime(entry.published)
            except Exception:
                pass

        # Get tags/categories
        tags = []
        if "tags" in entry:
            tags = [t.get("term", "") for t in entry.tags if t.get("term")]

        return ScrapedContent(
            title=title,
            url=link,
            content=content if content else summary,
            summary=summary[:500] if len(summary) > 500 else summary,
            author=author if author else None,
            published_at=published_at,
            metadata={
                "source_type": "news",
                "feed_url": feed_url,
                "tags": tags,
            },
        )

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract article title from HTML."""
        # Try common title selectors
        selectors = [
            "h1.article-title",
            "h1.entry-title",
            "h1.post-title",
            "article h1",
            ".article-header h1",
            "h1",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return element.get_text(strip=True)

        # Fallback to <title> tag
        if soup.title:
            return soup.title.get_text(strip=True)

        return "Untitled"

    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Extract main article content from HTML."""
        # Try common content selectors
        selectors = [
            "article .entry-content",
            "article .post-content",
            "article .article-content",
            ".article-body",
            ".post-body",
            "article",
            ".content",
            "main",
        ]

        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                # Remove unwanted elements
                for unwanted in element.select(
                    "script, style, nav, aside, .advertisement, .social-share"
                ):
                    unwanted.decompose()

                # Get text with some formatting
                paragraphs = element.find_all("p")
                if paragraphs:
                    return "\n\n".join(p.get_text(strip=True) for p in paragraphs)
                return element.get_text(strip=True)

        return ""

    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract author from HTML."""
        selectors = [
            ".author-name",
            ".byline",
            "[rel='author']",
            ".post-author",
            "meta[name='author']",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                if element.name == "meta":
                    return element.get("content")
                return element.get_text(strip=True)
        return None

    def _extract_date(self, soup: BeautifulSoup) -> Optional[datetime]:
        """Extract publication date from HTML."""
        # Try meta tags first
        meta_selectors = [
            "meta[property='article:published_time']",
            "meta[name='date']",
            "meta[name='pubdate']",
        ]
        for selector in meta_selectors:
            element = soup.select_one(selector)
            if element:
                date_str = element.get("content")
                if date_str:
                    try:
                        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except ValueError:
                        pass

        # Try time elements
        time_element = soup.select_one("time[datetime]")
        if time_element:
            date_str = time_element.get("datetime")
            if date_str:
                try:
                    return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                except ValueError:
                    pass

        return None

    def _extract_summary(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract summary/description from HTML."""
        # Try meta description
        meta = soup.select_one("meta[name='description']")
        if meta:
            return meta.get("content")

        # Try og:description
        og_meta = soup.select_one("meta[property='og:description']")
        if og_meta:
            return og_meta.get("content")

        return None

    def _clean_html(self, html: str) -> str:
        """Remove HTML tags and clean up text."""
        if not html:
            return ""
        soup = BeautifulSoup(html, "lxml")
        return soup.get_text(strip=True)
