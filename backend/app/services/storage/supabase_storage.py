"""Supabase Storage service for image uploads."""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from backend.app.db.database import get_supabase_client

logger = logging.getLogger(__name__)

# Default bucket for article images
DEFAULT_BUCKET = "article-images"


class SupabaseStorage:
    """Handle file uploads to Supabase Storage."""

    def __init__(self, bucket: str = DEFAULT_BUCKET):
        """
        Initialize storage service.

        Args:
            bucket: Storage bucket name
        """
        self.bucket = bucket
        self.client = get_supabase_client()

    async def upload_image(
        self,
        image_data: bytes,
        article_slug: str,
        image_type: str = "hero",
        file_extension: str = "png",
    ) -> Optional[str]:
        """
        Upload an image to Supabase Storage.

        Args:
            image_data: Image bytes
            article_slug: Article slug for organizing files
            image_type: Type of image (hero, section, etc.)
            file_extension: File extension (png, jpg, webp)

        Returns:
            Public URL of uploaded image or None if failed
        """
        try:
            # Generate unique filename
            unique_id = str(uuid.uuid4())[:8]
            file_path = f"{article_slug}/{image_type}-{unique_id}.{file_extension}"

            # Upload to Supabase Storage
            response = self.client.storage.from_(self.bucket).upload(
                path=file_path,
                file=image_data,
                file_options={"content-type": f"image/{file_extension}"},
            )

            if response:
                # Get public URL
                public_url = self.client.storage.from_(self.bucket).get_public_url(file_path)
                logger.info(f"Uploaded image: {public_url}")
                return public_url

            logger.error("Upload returned empty response")
            return None

        except Exception as e:
            logger.error(f"Failed to upload image: {e}")
            return None

    async def delete_image(self, file_path: str) -> bool:
        """
        Delete an image from Supabase Storage.

        Args:
            file_path: Path to the file in storage

        Returns:
            True if deleted successfully
        """
        try:
            self.client.storage.from_(self.bucket).remove([file_path])
            logger.info(f"Deleted image: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete image: {e}")
            return False

    async def list_article_images(self, article_slug: str) -> list:
        """
        List all images for an article.

        Args:
            article_slug: Article slug

        Returns:
            List of file objects
        """
        try:
            response = self.client.storage.from_(self.bucket).list(article_slug)
            return response if response else []
        except Exception as e:
            logger.error(f"Failed to list images: {e}")
            return []
