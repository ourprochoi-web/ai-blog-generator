"""Gemini API client using the new google-genai SDK."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

from google import genai
from google.genai import types
from google.genai.errors import APIError

from backend.app.config import settings
from backend.app.services.llm.base import BaseLLM, LLMResponse

logger = logging.getLogger(__name__)

# Default timeout for API calls (seconds)
DEFAULT_TIMEOUT = 120  # 2 minutes for long article generation

# Retry settings
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 2  # seconds


class GeminiClient(BaseLLM):
    """Gemini API client for text generation."""

    def __init__(
        self,
        model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        """
        Initialize Gemini client.

        Args:
            model: Model name to use (default: gemini-2.5-flash)
            api_key: Optional API key (uses settings if not provided)
            timeout: Request timeout in seconds (default: 120)
        """
        self.model_name = model
        self.timeout = timeout
        api_key = api_key or settings.GEMINI_API_KEY

        if not api_key:
            raise ValueError("Gemini API key is required")

        # Initialize the new google-genai client
        self.client = genai.Client(api_key=api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Generate text from prompt using async API with timeout and retry."""
        start_time = time.time()

        # Build generation config
        config = types.GenerateContentConfig(
            temperature=temperature,
        )
        if max_tokens:
            config.max_output_tokens = max_tokens

        # Combine system prompt and user prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        # Retry loop with exponential backoff
        last_exception = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await asyncio.wait_for(
                    self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=full_prompt,
                        config=config,
                    ),
                    timeout=self.timeout,
                )
                break  # Success, exit retry loop
            except asyncio.TimeoutError:
                logger.error(f"Gemini API timeout after {self.timeout}s (attempt {attempt + 1}/{MAX_RETRIES})")
                last_exception = TimeoutError(f"Gemini API request timed out after {self.timeout} seconds")
            except APIError as e:
                error_code = getattr(e, 'code', None)
                # Rate limit error (429) or Service unavailable (503)
                if error_code in (429, 503):
                    delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                    logger.warning(f"API error {error_code}, retrying in {delay}s (attempt {attempt + 1}/{MAX_RETRIES})")
                    last_exception = e
                    await asyncio.sleep(delay)
                else:
                    # Other API errors - don't retry
                    logger.error(f"Gemini API error: {e}")
                    raise
            except Exception as e:
                # Other errors - don't retry
                logger.error(f"Gemini API error: {e}")
                raise
        else:
            # All retries exhausted
            logger.error(f"All {MAX_RETRIES} retries failed")
            raise last_exception

        generation_time = time.time() - start_time

        # Extract token counts from usage metadata
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, "usage_metadata"):
            input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0)
            output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0)

        return LLMResponse(
            content=response.text,
            model=self.model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            generation_time_seconds=generation_time,
        )

    async def generate_with_context(
        self,
        prompt: str,
        context: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Generate text with additional context."""
        # Combine context with prompt
        full_prompt = f"Context:\n{context}\n\n---\n\n{prompt}"

        return await self.generate(
            prompt=full_prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    def get_model_name(self) -> str:
        """Get the model name."""
        return self.model_name


class GeminiProClient(GeminiClient):
    """Gemini Pro client for high-quality generation."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            model="gemini-2.5-pro",
            api_key=api_key,
        )
