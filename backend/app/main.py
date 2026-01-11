"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import articles, generate, sources
from backend.app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting AI Blog Platform in {settings.APP_ENV} mode")
    yield
    # Shutdown
    print("Shutting down AI Blog Platform")


app = FastAPI(
    title="AI Blog Platform",
    description="AI-powered blog platform that generates high-quality blog posts from news, papers, and articles",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sources.router, prefix=settings.API_V1_PREFIX, tags=["sources"])
app.include_router(articles.router, prefix=settings.API_V1_PREFIX, tags=["articles"])
app.include_router(generate.router, prefix=settings.API_V1_PREFIX, tags=["generate"])


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
