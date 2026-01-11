"""Reference URL validator."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import List, Optional

import httpx


@dataclass
class ValidationResult:
    """Result of URL validation."""

    url: str
    is_valid: bool
    status_code: Optional[int] = None
    final_url: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self):
        return {
            "url": self.url,
            "is_valid": self.is_valid,
            "status_code": self.status_code,
            "final_url": self.final_url,
            "error": self.error,
        }


class ReferenceValidator:
    """Validates reference URLs for accessibility."""

    def __init__(
        self,
        timeout: float = 10.0,
        max_redirects: int = 5,
        concurrent_limit: int = 5,
    ):
        self.timeout = timeout
        self.max_redirects = max_redirects
        self.concurrent_limit = concurrent_limit
        self.headers = {
            "User-Agent": "Mozilla/5.0 (compatible; BlogBot/1.0; +https://example.com/bot)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

    async def validate_url(self, url: str) -> ValidationResult:
        """Validate a single URL."""
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                max_redirects=self.max_redirects,
            ) as client:
                # Use HEAD request first (faster)
                try:
                    response = await client.head(url, headers=self.headers)
                except httpx.HTTPStatusError:
                    # Some servers don't support HEAD, try GET
                    response = await client.get(url, headers=self.headers)

                is_valid = 200 <= response.status_code < 400
                final_url = str(response.url) if response.url != url else None

                return ValidationResult(
                    url=url,
                    is_valid=is_valid,
                    status_code=response.status_code,
                    final_url=final_url,
                )

        except httpx.TimeoutException:
            return ValidationResult(
                url=url,
                is_valid=False,
                error="Request timed out",
            )
        except httpx.TooManyRedirects:
            return ValidationResult(
                url=url,
                is_valid=False,
                error="Too many redirects",
            )
        except httpx.ConnectError:
            return ValidationResult(
                url=url,
                is_valid=False,
                error="Connection failed",
            )
        except Exception as e:
            return ValidationResult(
                url=url,
                is_valid=False,
                error=str(e),
            )

    async def validate_urls(self, urls: List[str]) -> List[ValidationResult]:
        """Validate multiple URLs concurrently."""
        semaphore = asyncio.Semaphore(self.concurrent_limit)

        async def validate_with_limit(url: str) -> ValidationResult:
            async with semaphore:
                return await self.validate_url(url)

        tasks = [validate_with_limit(url) for url in urls]
        return await asyncio.gather(*tasks)

    async def filter_valid_urls(self, urls: List[str]) -> List[str]:
        """Return only valid URLs from a list."""
        results = await self.validate_urls(urls)
        return [r.url for r in results if r.is_valid]

    async def validate_references(
        self,
        references: List[dict],
    ) -> List[dict]:
        """
        Validate references and update their 'verified' status.

        Args:
            references: List of reference dicts with 'url' key

        Returns:
            Updated references with 'verified' status
        """
        urls = [ref.get("url", "") for ref in references if ref.get("url")]
        results = await self.validate_urls(urls)

        # Create a map of URL -> validation result
        result_map = {r.url: r for r in results}

        # Update references
        updated = []
        for ref in references:
            url = ref.get("url", "")
            result = result_map.get(url)

            updated_ref = ref.copy()
            if result:
                updated_ref["verified"] = result.is_valid
                if result.final_url:
                    updated_ref["final_url"] = result.final_url
            else:
                updated_ref["verified"] = False

            updated.append(updated_ref)

        return updated
