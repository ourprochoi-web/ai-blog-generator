"""Scraper services."""

from backend.app.services.scrapers.arxiv import ArxivScraper
from backend.app.services.scrapers.article import ArticleScraper
from backend.app.services.scrapers.base import BaseScraper, ScrapedContent
from backend.app.services.scrapers.news import NewsScraper

__all__ = [
    "BaseScraper",
    "ScrapedContent",
    "ArxivScraper",
    "NewsScraper",
    "ArticleScraper",
]
