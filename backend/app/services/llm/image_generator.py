"""Image generation using Gemini 2.5 Flash Image."""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Optional

from google import genai
from google.genai import types

from backend.app.config import settings

logger = logging.getLogger(__name__)

# Default timeout for image generation (seconds)
DEFAULT_TIMEOUT = 60


class ImageGenerator:
    """Generate images using Gemini 2.5 Flash Image model."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        """
        Initialize image generator.

        Args:
            api_key: Optional API key (uses settings if not provided)
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        api_key = api_key or settings.GEMINI_API_KEY

        if not api_key:
            raise ValueError("Gemini API key is required")

        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.0-flash-exp"  # Image generation model

    async def generate_hero_image(
        self,
        article_title: str,
        article_summary: str,
        style: str = "professional blog header",
    ) -> Optional[bytes]:
        """
        Generate a hero image for an article.

        Args:
            article_title: Title of the article
            article_summary: Brief summary of the article
            style: Style description for the image

        Returns:
            Image bytes (PNG format) or None if failed
        """
        prompt = self._create_image_prompt(article_title, article_summary, style)

        try:
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"],
                    ),
                ),
                timeout=self.timeout,
            )

            # Extract image from response
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "inline_data") and part.inline_data:
                        if part.inline_data.mime_type.startswith("image/"):
                            data = part.inline_data.data
                            # Handle both bytes and base64-encoded string
                            if isinstance(data, bytes):
                                return data
                            elif isinstance(data, str):
                                return base64.b64decode(data)
                            else:
                                logger.warning(f"Unexpected data type: {type(data)}")
                                return None

            logger.warning("No image found in response")
            return None

        except asyncio.TimeoutError:
            logger.error(f"Image generation timeout after {self.timeout}s")
            return None
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return None

    async def generate_section_image(
        self,
        section_title: str,
        section_content: str,
        article_context: str,
    ) -> Optional[bytes]:
        """
        Generate an image for a specific section.

        Args:
            section_title: Title of the section
            section_content: Content of the section
            article_context: Brief context about the article

        Returns:
            Image bytes (PNG format) or None if failed
        """
        prompt = f"""Generate a clean, professional illustration for a blog section.

Article context: {article_context}
Section: {section_title}
Content summary: {section_content[:500]}

Style: Modern, minimalist tech illustration. Use a clean color palette.
The image should visually represent the concept without text overlay.
Suitable for a professional AI/tech blog."""

        try:
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"],
                    ),
                ),
                timeout=self.timeout,
            )

            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "inline_data") and part.inline_data:
                        if part.inline_data.mime_type.startswith("image/"):
                            data = part.inline_data.data
                            # Handle both bytes and base64-encoded string
                            if isinstance(data, bytes):
                                return data
                            elif isinstance(data, str):
                                return base64.b64decode(data)
                            else:
                                return None

            return None

        except Exception as e:
            logger.error(f"Section image generation failed: {e}")
            return None

    def _create_image_prompt(
        self,
        title: str,
        summary: str,
        style: str,
    ) -> str:
        """Create a prompt for hero image generation."""
        return f"""Generate a visually striking hero image for a tech blog article.

Title: {title}
Summary: {summary}

Requirements:
- Style: {style}
- Modern, professional aesthetic suitable for an AI/tech blog
- Abstract or conceptual representation of the topic
- Clean composition with good visual hierarchy
- NO text, logos, or watermarks in the image
- 16:9 aspect ratio preferred
- High contrast and vibrant but professional colors

The image should capture the essence of the article topic in a visually appealing way
that would work well as a blog header image."""
