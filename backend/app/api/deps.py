"""API dependencies."""

import secrets
from typing import Optional

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from backend.app.config import settings
from backend.app.db.database import get_supabase_client

# API Key header scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_db():
    """Get Supabase client dependency."""
    return get_supabase_client()


async def verify_admin_api_key(
    api_key: Optional[str] = Security(api_key_header),
) -> bool:
    """
    Verify admin API key for protected endpoints.

    In development mode (no ADMIN_API_KEY set), allows all requests.
    In production (ADMIN_API_KEY set), requires valid API key.
    """
    # If no API key is configured, allow access (development mode)
    if not settings.ADMIN_API_KEY:
        return True

    # API key is configured, require it
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Use secrets.compare_digest to prevent timing attacks
    if not secrets.compare_digest(api_key, settings.ADMIN_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return True


# Dependency for admin routes
AdminAuth = Depends(verify_admin_api_key)
