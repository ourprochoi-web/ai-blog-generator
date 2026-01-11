"""API dependencies."""

from backend.app.db.database import get_supabase_client


async def get_db():
    """Get Supabase client dependency."""
    return get_supabase_client()
