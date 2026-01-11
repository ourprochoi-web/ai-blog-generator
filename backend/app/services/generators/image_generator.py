"""Image generation using Gemini 2.5 Flash Image API."""

from __future__ import annotations

import base64
import logging
from typing import Optional

from google import genai
from google.genai import types

from backend.app.config import settings
from backend.app.services.generators.prompts import PromptTemplates

logger = logging.getLogger(__name__)


class ImageGenerator:
    """Generate hero images for blog articles using Gemini."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize image generator.

        Args:
            api_key: Optional API key (uses settings if not provided)
        """
        api_key = api_key or settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("Gemini API key is required")

        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash-exp"  # Image generation model

    async def generate_hero_image(
        self,
        title: str,
        content_summary: str,
    ) -> Optional[bytes]:
        """
        Generate a hero image for an article.

        Args:
            title: Article title
            content_summary: Brief summary of article content (first 500 chars)

        Returns:
            Image bytes if successful, None otherwise
        """
        try:
            prompt = PromptTemplates.get_image_prompt(title, content_summary[:500])

            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )

            # Extract image from response
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # Return raw bytes
                        return base64.b64decode(part.inline_data.data)

            logger.warning("No image generated in response")
            return None

        except Exception as e:
            logger.error(f"Failed to generate image: {e}")
            return None

    async def generate_and_upload(
        self,
        title: str,
        content_summary: str,
        article_slug: str,
    ) -> Optional[str]:
        """
        Generate image and upload to Supabase Storage.

        Args:
            title: Article title
            content_summary: Brief summary of article content
            article_slug: Article slug for naming the file

        Returns:
            Public URL of uploaded image, or None if failed
        """
        # Generate image
        image_bytes = await self.generate_hero_image(title, content_summary)
        if not image_bytes:
            return None

        try:
            # Upload to Supabase Storage
            from backend.app.db.database import get_supabase_client

            client = get_supabase_client()
            bucket_name = "article-images"
            file_path = f"hero/{article_slug}.png"

            # Upload image
            client.storage.from_(bucket_name).upload(
                file_path,
                image_bytes,
                {"content-type": "image/png"},
            )

            # Get public URL
            public_url = client.storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"Image uploaded: {public_url}")
            return public_url

        except Exception as e:
            logger.error(f"Failed to upload image to storage: {e}")
            return None
