"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import admin, articles, generate, scheduler, sources
from backend.app.config import settings
from backend.app.scheduler.jobs import setup_scheduler, start_scheduler, stop_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def validate_required_settings():
    """Validate required environment variables on startup."""
    required = {
        "SUPABASE_URL": settings.SUPABASE_URL,
        "SUPABASE_KEY": settings.SUPABASE_KEY,
        "GEMINI_API_KEY": settings.GEMINI_API_KEY,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Validate required settings
    validate_required_settings()
    logger.info("Environment validation passed")

    # Startup
    logger.info(f"Starting AI Blog Platform in {settings.APP_ENV} mode")

    # Setup and start scheduler
    setup_scheduler()
    start_scheduler()
    logger.info("Scheduler started: runs at 8 AM and 8 PM KST")

    yield

    # Shutdown
    stop_scheduler()
    logger.info("Shutting down AI Blog Platform")


app = FastAPI(
    title="AI Blog Platform",
    description="AI-powered blog platform that generates high-quality blog posts from news, papers, and articles",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
allowed_origins = (
    settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sources.router, prefix=settings.API_V1_PREFIX, tags=["sources"])
app.include_router(articles.router, prefix=settings.API_V1_PREFIX, tags=["articles"])
app.include_router(generate.router, prefix=settings.API_V1_PREFIX, tags=["generate"])
app.include_router(scheduler.router, prefix=settings.API_V1_PREFIX, tags=["scheduler"])
app.include_router(admin.router, prefix=settings.API_V1_PREFIX, tags=["admin"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Blog Platform API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "env": settings.APP_ENV}
