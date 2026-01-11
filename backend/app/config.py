"""Application configuration using environment variables."""

import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Gemini
    GEMINI_API_KEY: str = ""

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api"

    # Scheduler settings
    SCRAPE_INTERVAL_HOURS: int = 12  # 스크래핑 주기
    MAX_ARTICLES_PER_EDITION: int = 3  # 에디션당 최대 글 생성 수 (morning/evening)
    MAX_ARTICLES_PER_DAY: int = 6  # 하루 최대 글 생성 수 (3글 x 2회)
    AUTO_GENERATE_MIN_SCORE: float = 70.0  # 자동 생성 최소 relevance_score (0-100 scale)

    # CORS settings
    CORS_ORIGINS: str = ""  # Comma-separated list of allowed origins (empty = allow all)

    # Image generation settings
    GENERATE_HERO_IMAGES: bool = False  # 글 생성 시 히어로 이미지 자동 생성
    IMAGE_STORAGE_BUCKET: str = "article-images"  # Supabase Storage 버킷 이름

    # Edition settings (KST = UTC+9)
    MORNING_EDITION_HOUR: int = 8   # 오전 8시 KST
    EVENING_EDITION_HOUR: int = 20  # 오후 8시 KST

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 스크래핑 소스 설정 (정적)
SCRAPE_SOURCES = {
    # arXiv 카테고리
    "arxiv_categories": [
        "cs.AI",   # Artificial Intelligence
        "cs.LG",   # Machine Learning
        "cs.CL",   # Computation and Language (NLP)
    ],
    # RSS 피드
    "rss_feeds": [
        {
            "name": "TechCrunch AI",
            "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
        },
        {
            "name": "VentureBeat AI",
            "url": "https://venturebeat.com/category/ai/feed/",
        },
        {
            "name": "MIT Technology Review AI",
            "url": "https://www.technologyreview.com/feed/",
        },
        {
            "name": "Google AI Blog",
            "url": "https://blog.google/technology/ai/rss/",
        },
        {
            "name": "OpenAI Blog",
            "url": "https://openai.com/blog/rss.xml",
        },
    ],
}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
