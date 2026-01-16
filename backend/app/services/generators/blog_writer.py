"""Blog article writer using LLM."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from backend.app.services.generators.prompts import PromptTemplates, SourceType
from backend.app.services.generators.reference_validator import ReferenceValidator
from backend.app.services.llm.gemini import GeminiClient
from backend.app.services.llm.image_generator import ImageGenerator
from backend.app.services.storage.supabase_storage import SupabaseStorage

logger = logging.getLogger(__name__)


@dataclass
class GeneratedArticle:
    """Generated article data."""

    title: str
    subtitle: str
    content: str
    tags: List[str]
    meta_description: str
    word_count: int
    char_count: int
    llm_model: str
    generation_time_seconds: float
    references: List[Dict[str, Any]]
    hero_image_url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "subtitle": self.subtitle,
            "content": self.content,
            "tags": self.tags,
            "meta_description": self.meta_description,
            "word_count": self.word_count,
            "char_count": self.char_count,
            "llm_model": self.llm_model,
            "generation_time_seconds": self.generation_time_seconds,
            "references": self.references,
            "hero_image_url": self.hero_image_url,
        }


class BlogWriter:
    """Blog article generator using LLM."""

    def __init__(
        self,
        llm_client: Optional[GeminiClient] = None,
        validator: Optional[ReferenceValidator] = None,
        image_generator: Optional[ImageGenerator] = None,
        storage: Optional[SupabaseStorage] = None,
    ):
        """
        Initialize blog writer.

        Args:
            llm_client: Optional LLM client (creates default Gemini client if not provided)
            validator: Optional reference validator
            image_generator: Optional image generator for hero images
            storage: Optional storage service for uploading images
        """
        self.llm = llm_client or GeminiClient()
        self.validator = validator or ReferenceValidator()
        self.image_generator = image_generator
        self.storage = storage

    async def generate_article(
        self,
        source_type: str,
        title: str,
        content: str,
        summary: Optional[str] = None,
        author: Optional[str] = None,
        metadata: Optional[Dict] = None,
        validate_references: bool = True,
        generate_image: bool = False,
        article_slug: Optional[str] = None,
    ) -> GeneratedArticle:
        """
        Generate a blog article from source material.

        Args:
            source_type: Type of source (news, paper, article)
            title: Source title
            content: Source content
            summary: Optional summary
            author: Optional author
            metadata: Optional metadata
            validate_references: Whether to validate reference URLs

        Returns:
            GeneratedArticle object
        """
        # Map source type string to enum
        try:
            src_type = SourceType(source_type)
        except ValueError:
            src_type = SourceType.ARTICLE

        # Generate the article prompt
        prompt = PromptTemplates.get_article_prompt(
            source_type=src_type,
            title=title,
            content=content,
            summary=summary,
            author=author,
            metadata=metadata,
        )

        # Generate article using LLM with retry logic
        # Use high max_tokens for long articles (15k-20k chars need ~20k+ tokens)
        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt=PromptTemplates.SYSTEM_PROMPT,
                temperature=0.7 if attempt == 0 else 0.5,  # Lower temp on retry
                max_tokens=32000,
            )

            try:
                # Parse the JSON response
                article_data = self._parse_article_response(response.content)
                break  # Success, exit retry loop
            except ValueError as e:
                last_error = e
                if attempt < max_retries:
                    logger.warning(f"JSON parse failed (attempt {attempt + 1}/{max_retries + 1}), retrying...")
                else:
                    raise last_error

        # Extract references from content (if any URLs were included)
        references = self._extract_references(article_data.get("content", ""))

        # Validate references if requested
        if validate_references and references:
            references = await self.validator.validate_references(references)
            # Remove invalid references
            references = [r for r in references if r.get("verified", False)]

        # Calculate word and character counts
        content_text = article_data.get("content", "")
        word_count = len(re.findall(r"\w+", content_text))
        char_count = len(content_text)

        # Hero image generation is now handled asynchronously by a separate job.
        # The article will be saved with hero_image_status='pending' and
        # generate_pending_hero_images() will process it later.
        # This prevents image generation from blocking article creation.
        hero_image_url = None

        return GeneratedArticle(
            title=article_data.get("title", title),
            subtitle=article_data.get("subtitle", ""),
            content=content_text,
            tags=article_data.get("tags", []),
            meta_description=article_data.get("meta_description", ""),
            word_count=word_count,
            char_count=char_count,
            llm_model=response.model,
            generation_time_seconds=response.generation_time_seconds,
            references=references,
            hero_image_url=hero_image_url,
        )

    def _parse_article_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM response.

        Args:
            response_text: Raw response from LLM

        Returns:
            Parsed article data dictionary
        """
        logger.info(f"Parsing response (first 500 chars): {response_text[:500]}")

        # Find all ```json markers and extract JSON using brace-matching
        json_objects = self._find_json_in_code_blocks(response_text)
        logger.info(f"Found {len(json_objects)} JSON objects in code blocks")

        # Try each JSON block (prefer later ones as they're usually the final answer)
        for i, parsed in enumerate(reversed(json_objects)):
            title_preview = parsed.get('title', 'NO TITLE')[:50] if isinstance(parsed, dict) else 'NOT DICT'
            content_len = len(parsed.get('content', '')) if isinstance(parsed, dict) else 0
            logger.info(f"Trying JSON block {i}, title: {title_preview}, content_len: {content_len}")
            # Handle nested JSON - if content itself contains ```json, parse it
            parsed = self._unwrap_nested_json(parsed)
            if self._is_valid_article(parsed):
                logger.info(f"Successfully parsed article: {parsed.get('title', '')[:50]}")
                return parsed
            else:
                logger.warning(f"JSON block {i} not valid article")

        # If no valid JSON in code blocks, try to extract JSON object directly
        # Find balanced braces for JSON object
        json_str = self._extract_json_object(response_text)
        if json_str:
            logger.debug(f"Extracted JSON directly (first 200 chars): {json_str[:200]}")
            try:
                parsed = json.loads(json_str)
                parsed = self._unwrap_nested_json(parsed)
                if self._is_valid_article(parsed):
                    logger.info(f"Successfully parsed article from direct extraction: {parsed.get('title', '')[:50]}")
                    return parsed
            except json.JSONDecodeError as e:
                logger.warning(f"JSON decode error: {e}")

        # Try to recover truncated JSON
        logger.info("Attempting to recover truncated JSON...")
        recovered = self._recover_truncated_json(response_text)
        if recovered and self._is_valid_article(recovered):
            logger.info(f"Successfully recovered truncated article: {recovered.get('title', '')[:50]}")
            return recovered

        # No valid JSON found - log full response for debugging
        logger.error(f"Failed to parse article JSON. Response length: {len(response_text)}")
        logger.error(f"Response starts with: {response_text[:500]}")
        logger.error(f"Response ends with: {response_text[-500:]}")
        raise ValueError(
            f"Failed to parse LLM response as valid article JSON. "
            f"Response length: {len(response_text)} chars. "
            f"Response preview: {response_text[:200]}..."
        )

    def _clean_content_field(self, content: str) -> str:
        """
        Clean content field - remove any JSON wrapper or code blocks.

        Sometimes LLM outputs the content wrapped in markdown code blocks.
        """
        if not content:
            return content

        content = content.strip()

        # Remove leading ```json or ``` and trailing ```
        if content.startswith("```"):
            # Find end of first line
            first_newline = content.find("\n")
            if first_newline != -1:
                content = content[first_newline + 1:]
            # Remove trailing ```
            if content.rstrip().endswith("```"):
                content = content.rstrip()[:-3].rstrip()

        return content

    def _find_json_in_code_blocks(self, text: str) -> List[Dict[str, Any]]:
        """
        Find JSON objects in ```json code blocks using brace-matching.

        This is more robust than regex for handling nested backticks.
        """
        results = []
        search_start = 0

        while True:
            # Find next ```json marker (case insensitive, allow whitespace)
            # Try multiple patterns
            code_block_start = -1
            for marker in ["```json", "``` json", "```JSON"]:
                pos = text.find(marker, search_start)
                if pos != -1 and (code_block_start == -1 or pos < code_block_start):
                    code_block_start = pos

            if code_block_start == -1:
                break

            logger.debug(f"Found code block marker at position {code_block_start}")

            # Find the start of the JSON object after ```json
            json_start = text.find("{", code_block_start)
            if json_start == -1:
                logger.debug("No opening brace found after code block marker")
                break

            # Extract JSON using brace-matching
            json_str = self._extract_json_object(text[json_start:])
            if json_str:
                logger.debug(f"Extracted JSON string of length {len(json_str)}")
                try:
                    parsed = json.loads(json_str)
                    if isinstance(parsed, dict):
                        results.append(parsed)
                        logger.debug(f"Successfully parsed JSON with keys: {list(parsed.keys())[:5]}")
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON decode error in code block: {e}")
            else:
                logger.debug("Failed to extract JSON object with brace matching")

            # Move search position forward
            search_start = json_start + len(json_str) if json_str else code_block_start + 7

        return results

    def _unwrap_nested_json(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unwrap nested JSON if content contains another JSON block.

        Sometimes LLM outputs JSON with content that itself is a JSON string.
        Uses brace-matching to handle nested backticks correctly.
        """
        if not isinstance(data, dict):
            return data

        content = data.get("content", "")
        if not isinstance(content, str):
            return data

        content_stripped = content.strip()

        # Case 1: Content starts with ```json - use brace matching
        if content_stripped.startswith("```json") or content_stripped.startswith("```"):
            json_start = content_stripped.find("{")
            if json_start != -1:
                inner_json = self._extract_json_object(content_stripped[json_start:])
                if inner_json:
                    try:
                        inner_parsed = json.loads(inner_json)
                        if isinstance(inner_parsed, dict) and "title" in inner_parsed and "content" in inner_parsed:
                            # Recursively unwrap in case of double nesting
                            return self._unwrap_nested_json(inner_parsed)
                    except json.JSONDecodeError:
                        pass

        # Case 2: Content is a raw JSON object
        elif content_stripped.startswith("{") and "\"title\"" in content_stripped:
            try:
                inner_parsed = json.loads(content_stripped)
                if isinstance(inner_parsed, dict) and "title" in inner_parsed:
                    return self._unwrap_nested_json(inner_parsed)
            except json.JSONDecodeError:
                pass

        return data

    def _is_valid_article(self, data: Dict[str, Any]) -> bool:
        """Check if parsed data has required article fields."""
        if not isinstance(data, dict):
            logger.debug(f"Invalid article: not a dict, got {type(data)}")
            return False
        if "title" not in data:
            logger.debug(f"Invalid article: missing 'title' key. Keys: {list(data.keys())[:10]}")
            return False
        if "content" not in data:
            logger.debug(f"Invalid article: missing 'content' key. Keys: {list(data.keys())[:10]}")
            return False
        content = data.get("content")
        if not isinstance(content, str):
            logger.debug(f"Invalid article: content is not string, got {type(content)}")
            return False
        if len(content) < 100:
            logger.debug(f"Invalid article: content too short ({len(content)} chars). Content preview: {content[:200]}")
            return False
        return True

    def _recover_truncated_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Attempt to recover a truncated JSON response.

        When Gemini truncates output, the JSON is often cut in the middle of content.
        This tries to find and close the JSON properly.
        """
        # Find the start of JSON
        json_start = text.find("{")
        if json_start == -1:
            return None

        # Get the JSON portion
        json_text = text[json_start:]

        # Try to find where we have valid fields and truncate content there
        # Look for common patterns that indicate content field
        try:
            # First, try to extract just the fields we have
            # Find title, subtitle, content fields using regex
            title_match = re.search(r'"title"\s*:\s*"([^"]*)"', json_text)
            subtitle_match = re.search(r'"subtitle"\s*:\s*"([^"]*)"', json_text)

            # For content, it might be very long and truncated
            content_match = re.search(r'"content"\s*:\s*"', json_text)

            if title_match and content_match:
                title = title_match.group(1)
                subtitle = subtitle_match.group(1) if subtitle_match else ""

                # Extract content - find where it starts and try to get as much as possible
                content_start = content_match.end()

                # Find the content by looking for the closing quote
                # Content is tricky because it contains escaped quotes
                content = self._extract_string_value(json_text[content_start - 1:])

                if content and len(content) > 100:
                    logger.info(f"Recovered JSON with title: {title[:50]}, content length: {len(content)}")

                    # Try to extract other fields
                    tags_match = re.search(r'"tags"\s*:\s*\[(.*?)\]', json_text, re.DOTALL)
                    tags = []
                    if tags_match:
                        tags_str = tags_match.group(1)
                        tags = re.findall(r'"([^"]*)"', tags_str)

                    meta_match = re.search(r'"meta_description"\s*:\s*"([^"]*)"', json_text)
                    meta_desc = meta_match.group(1) if meta_match else ""

                    return {
                        "title": title,
                        "subtitle": subtitle,
                        "content": content,
                        "tags": tags[:10],  # Limit tags
                        "meta_description": meta_desc,
                    }
        except Exception as e:
            logger.warning(f"Failed to recover truncated JSON: {e}")

        return None

    def _extract_string_value(self, text: str) -> Optional[str]:
        """
        Extract a JSON string value starting with opening quote.
        Handles escaped quotes properly.
        """
        if not text.startswith('"'):
            return None

        result = []
        i = 1  # Skip opening quote
        while i < len(text):
            char = text[i]
            if char == '\\' and i + 1 < len(text):
                # Escape sequence
                next_char = text[i + 1]
                if next_char == '"':
                    result.append('"')
                elif next_char == 'n':
                    result.append('\n')
                elif next_char == 't':
                    result.append('\t')
                elif next_char == '\\':
                    result.append('\\')
                else:
                    result.append(next_char)
                i += 2
            elif char == '"':
                # End of string
                return ''.join(result)
            else:
                result.append(char)
                i += 1

        # String was truncated - return what we have
        return ''.join(result) if len(result) > 100 else None

    def _extract_json_object(self, text: str) -> Optional[str]:
        """Extract JSON object with balanced braces from text."""
        # Find the start of JSON object with "title" key
        start_patterns = [
            r'\{\s*"title"\s*:',
            r'\{\s*\\?"title\\?"\s*:',
        ]

        for pattern in start_patterns:
            match = re.search(pattern, text)
            if match:
                start = match.start()
                # Find balanced closing brace
                brace_count = 0
                in_string = False
                escape_next = False

                for i, char in enumerate(text[start:]):
                    if escape_next:
                        escape_next = False
                        continue
                    if char == '\\':
                        escape_next = True
                        continue
                    if char == '"' and not escape_next:
                        in_string = not in_string
                        continue
                    if in_string:
                        continue
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            return text[start:start + i + 1]

        return None

    def _extract_references(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract URLs from content as references.

        Args:
            content: Article content

        Returns:
            List of reference dictionaries
        """
        # Find all URLs in the content
        url_pattern = r'https?://[^\s\)\]\"\'<>]+'
        urls = re.findall(url_pattern, content)

        # Remove duplicates while preserving order
        seen = set()
        unique_urls = []
        for url in urls:
            # Clean up URL (remove trailing punctuation)
            url = url.rstrip(".,;:!?")
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)

        # Create reference objects
        references = []
        for url in unique_urls:
            references.append({
                "url": url,
                "title": self._extract_title_from_url(url),
                "verified": False,
            })

        return references

    def _extract_title_from_url(self, url: str) -> str:
        """
        Extract a readable title from URL.

        Args:
            url: URL string

        Returns:
            Extracted title
        """
        # Remove protocol and www
        title = re.sub(r"https?://(www\.)?", "", url)
        # Get the path
        parts = title.split("/")
        if len(parts) > 1:
            # Use the last meaningful part
            for part in reversed(parts):
                if part and part not in ["", "index.html", "index.php"]:
                    # Clean up the part
                    title = part.replace("-", " ").replace("_", " ")
                    title = re.sub(r"\.(html|php|asp|htm)$", "", title)
                    return title.title()
        return parts[0]

    async def improve_article(
        self,
        content: str,
        feedback: str,
    ) -> GeneratedArticle:
        """
        Improve an existing article based on feedback.

        Args:
            content: Existing article content
            feedback: Improvement feedback

        Returns:
            Improved GeneratedArticle object
        """
        prompt = PromptTemplates.get_improvement_prompt(content, feedback)

        response = await self.llm.generate(
            prompt=prompt,
            system_prompt=PromptTemplates.SYSTEM_PROMPT,
            temperature=0.5,  # Lower temperature for more consistent edits
        )

        article_data = self._parse_article_response(response.content)
        references = self._extract_references(article_data.get("content", ""))

        content_text = article_data.get("content", "")
        word_count = len(re.findall(r"\w+", content_text))
        char_count = len(content_text)

        return GeneratedArticle(
            title=article_data.get("title", ""),
            subtitle=article_data.get("subtitle", ""),
            content=content_text,
            tags=article_data.get("tags", []),
            meta_description=article_data.get("meta_description", ""),
            word_count=word_count,
            char_count=char_count,
            llm_model=response.model,
            generation_time_seconds=response.generation_time_seconds,
            references=references,
        )
