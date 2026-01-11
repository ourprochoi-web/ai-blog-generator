"""arXiv paper scraper."""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
import logging
from xml.etree import ElementTree

from backend.app.services.scrapers.base import BaseScraper, ScrapedContent

logger = logging.getLogger(__name__)


class ArxivScraper(BaseScraper):
    """Scraper for arXiv papers using the arXiv API."""

    ARXIV_API_BASE = "http://export.arxiv.org/api/query"
    ARXIV_URL_PATTERN = re.compile(
        r"arxiv\.org/(abs|pdf)/(\d{4}\.\d{4,5})(v\d+)?",
        re.IGNORECASE,
    )

    # XML namespaces used by arXiv API
    NAMESPACES = {
        "atom": "http://www.w3.org/2005/Atom",
        "arxiv": "http://arxiv.org/schemas/atom",
    }

    def can_handle(self, url: str) -> bool:
        """Check if URL is an arXiv paper."""
        return bool(self.ARXIV_URL_PATTERN.search(url))

    def extract_arxiv_id(self, url: str) -> Optional[str]:
        """Extract arXiv ID from URL."""
        match = self.ARXIV_URL_PATTERN.search(url)
        if match:
            arxiv_id = match.group(2)
            version = match.group(3) or ""
            return f"{arxiv_id}{version}"
        return None

    async def scrape(self, url: str) -> ScrapedContent:
        """Scrape a single arXiv paper."""
        arxiv_id = self.extract_arxiv_id(url)
        if not arxiv_id:
            raise ValueError(f"Invalid arXiv URL: {url}")

        # Query arXiv API
        api_url = f"{self.ARXIV_API_BASE}?id_list={arxiv_id}"
        xml_content = await self.fetch(api_url)

        # Parse XML response
        root = ElementTree.fromstring(xml_content)
        entry = root.find("atom:entry", self.NAMESPACES)

        if entry is None:
            raise ValueError(f"Paper not found: {arxiv_id}")

        # Extract data
        title = self._get_text(entry, "atom:title")
        summary = self._get_text(entry, "atom:summary")
        published = self._get_text(entry, "atom:published")
        updated = self._get_text(entry, "atom:updated")

        # Get authors
        authors = []
        for author in entry.findall("atom:author", self.NAMESPACES):
            name = self._get_text(author, "atom:name")
            if name:
                authors.append(name)

        # Get categories
        categories = []
        primary_category = entry.find("arxiv:primary_category", self.NAMESPACES)
        if primary_category is not None:
            categories.append(primary_category.get("term", ""))

        for category in entry.findall("atom:category", self.NAMESPACES):
            term = category.get("term", "")
            if term and term not in categories:
                categories.append(term)

        # Get PDF link
        pdf_link = None
        for link in entry.findall("atom:link", self.NAMESPACES):
            if link.get("title") == "pdf":
                pdf_link = link.get("href")
                break

        # Parse published date
        published_at = None
        if published:
            try:
                published_at = datetime.fromisoformat(published.replace("Z", "+00:00"))
            except ValueError:
                pass

        # Clean up title and summary
        title = self._clean_text(title)
        summary = self._clean_text(summary)

        # Construct full content (abstract as main content for papers)
        content = f"# {title}\n\n"
        content += f"**Authors:** {', '.join(authors)}\n\n"
        content += f"**Categories:** {', '.join(categories)}\n\n"
        content += f"## Abstract\n\n{summary}\n"

        return ScrapedContent(
            title=title,
            url=f"https://arxiv.org/abs/{arxiv_id}",
            content=content,
            summary=summary,
            author=", ".join(authors) if authors else None,
            published_at=published_at,
            metadata={
                "arxiv_id": arxiv_id,
                "categories": categories,
                "pdf_link": pdf_link,
                "updated": updated,
                "source_type": "paper",
            },
        )

    async def scrape_multiple(self, urls: List[str]) -> List[ScrapedContent]:
        """Scrape multiple arXiv papers."""
        results = []
        for url in urls:
            try:
                content = await self.scrape(url)
                results.append(content)
            except Exception as e:
                logger.error(f"Error scraping arXiv paper {url}: {e}")
        return results

    async def search(
        self,
        query: str,
        max_results: int = 10,
        sort_by: str = "submittedDate",
        sort_order: str = "descending",
    ) -> List[ScrapedContent]:
        """Search arXiv for papers matching query."""
        # Build search URL
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": sort_by,
            "sortOrder": sort_order,
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        api_url = f"{self.ARXIV_API_BASE}?{query_string}"

        xml_content = await self.fetch(api_url)
        root = ElementTree.fromstring(xml_content)

        results = []
        for entry in root.findall("atom:entry", self.NAMESPACES):
            # Get the arXiv URL
            arxiv_url = None
            for link in entry.findall("atom:link", self.NAMESPACES):
                if link.get("type") == "text/html":
                    arxiv_url = link.get("href")
                    break

            if arxiv_url:
                try:
                    content = await self.scrape(arxiv_url)
                    results.append(content)
                except Exception as e:
                    logger.error(f"Error scraping arXiv search result {arxiv_url}: {e}")

        return results

    def _get_text(self, element: ElementTree.Element, path: str) -> str:
        """Get text content from XML element."""
        child = element.find(path, self.NAMESPACES)
        return child.text.strip() if child is not None and child.text else ""

    def _clean_text(self, text: str) -> str:
        """Clean up text by removing extra whitespace."""
        if not text:
            return ""
        # Replace multiple whitespace with single space
        text = re.sub(r"\s+", " ", text)
        return text.strip()
