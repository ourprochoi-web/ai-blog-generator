"""General article scraper for any web page."""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from backend.app.services.scrapers.base import BaseScraper, ScrapedContent


class ArticleScraper(BaseScraper):
    """General purpose scraper for web articles."""

    def can_handle(self, url: str) -> bool:
        """This scraper can handle any URL as a fallback."""
        # Check if it's a valid HTTP(S) URL
        try:
            result = urlparse(url)
            return result.scheme in ("http", "https") and bool(result.netloc)
        except Exception:
            return False

    async def scrape(self, url: str) -> ScrapedContent:
        """Scrape a single article."""
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
        domain = urlparse(url).netloc

        return ScrapedContent(
            title=title,
            url=url,
            content=content,
            summary=summary,
            author=author,
            published_at=published_at,
            metadata={
                "source_type": "article",
                "domain": domain,
            },
        )

    async def scrape_multiple(self, urls: List[str]) -> List[ScrapedContent]:
        """Scrape multiple articles."""
        results = []
        for url in urls:
            try:
                content = await self.scrape(url)
                results.append(content)
            except Exception as e:
                print(f"Error scraping {url}: {e}")
        return results

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract article title with multiple strategies."""
        # Strategy 1: Open Graph title
        og_title = soup.select_one("meta[property='og:title']")
        if og_title and og_title.get("content"):
            return og_title.get("content").strip()

        # Strategy 2: Twitter title
        twitter_title = soup.select_one("meta[name='twitter:title']")
        if twitter_title and twitter_title.get("content"):
            return twitter_title.get("content").strip()

        # Strategy 3: Common H1 patterns
        h1_selectors = [
            "article h1",
            ".article h1",
            ".post h1",
            ".entry h1",
            "main h1",
            ".content h1",
            "h1.title",
            "h1.headline",
            "h1",
        ]
        for selector in h1_selectors:
            h1 = soup.select_one(selector)
            if h1:
                text = h1.get_text(strip=True)
                if len(text) > 10:  # Avoid short navigation items
                    return text

        # Strategy 4: Title tag (cleaned)
        if soup.title:
            title = soup.title.get_text(strip=True)
            # Remove common suffixes like " | Site Name"
            title = re.split(r"\s*[\|\-–—]\s*", title)[0]
            return title.strip()

        return "Untitled"

    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Extract main article content using multiple strategies."""
        # Remove unwanted elements first
        for tag in soup.select(
            "script, style, nav, header, footer, aside, .advertisement, "
            ".social-share, .comments, .related-posts, .sidebar, "
            "[role='navigation'], [role='complementary']"
        ):
            tag.decompose()

        # Strategy 1: Article-specific containers
        article_selectors = [
            "article .content",
            "article .entry-content",
            "article .post-content",
            "article .article-body",
            ".article-content",
            ".post-content",
            ".entry-content",
            ".story-body",
            ".article-body",
            "[itemprop='articleBody']",
            ".prose",
        ]

        for selector in article_selectors:
            container = soup.select_one(selector)
            if container:
                content = self._extract_text_from_element(container)
                if len(content) > 200:
                    return content

        # Strategy 2: Main article element
        article = soup.select_one("article")
        if article:
            content = self._extract_text_from_element(article)
            if len(content) > 200:
                return content

        # Strategy 3: Main element
        main = soup.select_one("main")
        if main:
            content = self._extract_text_from_element(main)
            if len(content) > 200:
                return content

        # Strategy 4: Largest text block heuristic
        candidates = []
        for div in soup.find_all(["div", "section"]):
            text = self._extract_text_from_element(div)
            if len(text) > 200:
                candidates.append((len(text), text))

        if candidates:
            candidates.sort(reverse=True)
            return candidates[0][1]

        # Fallback: body text
        body = soup.body
        if body:
            return self._extract_text_from_element(body)

        return ""

    def _extract_text_from_element(self, element: BeautifulSoup) -> str:
        """Extract and format text from an HTML element."""
        paragraphs = []

        for p in element.find_all(["p", "h2", "h3", "h4", "li"]):
            text = p.get_text(strip=True)
            if text and len(text) > 20:  # Skip very short paragraphs
                if p.name.startswith("h"):
                    # Add markdown heading
                    level = int(p.name[1])
                    paragraphs.append(f"{'#' * level} {text}")
                elif p.name == "li":
                    paragraphs.append(f"- {text}")
                else:
                    paragraphs.append(text)

        return "\n\n".join(paragraphs)

    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract author information."""
        # Meta tags
        meta_selectors = [
            "meta[name='author']",
            "meta[property='article:author']",
            "meta[name='twitter:creator']",
        ]
        for selector in meta_selectors:
            meta = soup.select_one(selector)
            if meta and meta.get("content"):
                return meta.get("content").strip()

        # Common author patterns
        author_selectors = [
            ".author-name",
            ".byline a",
            ".byline",
            "[rel='author']",
            ".post-author",
            ".article-author",
            "[itemprop='author']",
        ]
        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                # Clean up common prefixes
                text = re.sub(r"^(by|written by|author:)\s*", "", text, flags=re.I)
                if text:
                    return text

        return None

    def _extract_date(self, soup: BeautifulSoup) -> Optional[datetime]:
        """Extract publication date."""
        # JSON-LD structured data
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                import json
                data = json.loads(script.string)
                if isinstance(data, dict):
                    for key in ["datePublished", "dateCreated"]:
                        if key in data:
                            return datetime.fromisoformat(
                                data[key].replace("Z", "+00:00")
                            )
            except Exception:
                pass

        # Meta tags
        meta_selectors = [
            "meta[property='article:published_time']",
            "meta[name='date']",
            "meta[name='pubdate']",
            "meta[name='publish-date']",
            "meta[itemprop='datePublished']",
        ]
        for selector in meta_selectors:
            meta = soup.select_one(selector)
            if meta and meta.get("content"):
                try:
                    return datetime.fromisoformat(
                        meta.get("content").replace("Z", "+00:00")
                    )
                except ValueError:
                    pass

        # Time element
        time_elem = soup.select_one("time[datetime]")
        if time_elem:
            try:
                return datetime.fromisoformat(
                    time_elem.get("datetime").replace("Z", "+00:00")
                )
            except ValueError:
                pass

        return None

    def _extract_summary(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract article summary/description."""
        # Meta description
        selectors = [
            "meta[name='description']",
            "meta[property='og:description']",
            "meta[name='twitter:description']",
        ]
        for selector in selectors:
            meta = soup.select_one(selector)
            if meta and meta.get("content"):
                return meta.get("content").strip()

        # First paragraph
        article = soup.select_one("article")
        if article:
            first_p = article.select_one("p")
            if first_p:
                text = first_p.get_text(strip=True)
                if len(text) > 50:
                    return text[:300] + "..." if len(text) > 300 else text

        return None
