"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import activity_logs, admin, articles, generate, scheduler, sources
from backend.app.config import settings
from backend.app.scheduler.jobs import (
    check_and_run_missed_schedule,
    setup_scheduler,
    start_scheduler,
    stop_scheduler,
)

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

    # Check for missed scheduled runs (handles app restart during scheduled time)
    try:
        result = await check_and_run_missed_schedule()
        if result:
            logger.info(f"Catch-up pipeline completed: {result.get('generate', {}).get('generated', 0)} articles generated")
    except Exception as e:
        logger.error(f"Error checking missed schedule: {e}")

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
# In production, set CORS_ORIGINS to your frontend domain(s)
# Example: CORS_ORIGINS=https://your-blog.vercel.app,https://admin.your-blog.com
if settings.CORS_ORIGINS:
    allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
else:
    # Development mode: allow all origins but log a warning
    allowed_origins = ["*"]
    if settings.APP_ENV == "production":
        logger.warning(
            "CORS_ORIGINS not set in production! Set CORS_ORIGINS to restrict access."
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Page-Size"],
)

# Include routers
app.include_router(sources.router, prefix=settings.API_V1_PREFIX, tags=["sources"])
app.include_router(articles.router, prefix=settings.API_V1_PREFIX, tags=["articles"])
app.include_router(generate.router, prefix=settings.API_V1_PREFIX, tags=["generate"])
app.include_router(scheduler.router, prefix=settings.API_V1_PREFIX, tags=["scheduler"])
app.include_router(admin.router, prefix=settings.API_V1_PREFIX, tags=["admin"])
app.include_router(activity_logs.router, prefix=settings.API_V1_PREFIX, tags=["activity-logs"])


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
