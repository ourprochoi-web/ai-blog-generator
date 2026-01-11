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
        }


class BlogWriter:
    """Blog article generator using LLM."""

    def __init__(
        self,
        llm_client: Optional[GeminiClient] = None,
        validator: Optional[ReferenceValidator] = None,
    ):
        """
        Initialize blog writer.

        Args:
            llm_client: Optional LLM client (creates default Gemini client if not provided)
            validator: Optional reference validator
        """
        self.llm = llm_client or GeminiClient()
        self.validator = validator or ReferenceValidator()

    async def generate_article(
        self,
        source_type: str,
        title: str,
        content: str,
        summary: Optional[str] = None,
        author: Optional[str] = None,
        metadata: Optional[Dict] = None,
        validate_references: bool = True,
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

        # Generate article using LLM
        response = await self.llm.generate(
            prompt=prompt,
            system_prompt=PromptTemplates.SYSTEM_PROMPT,
            temperature=0.7,
        )

        # Parse the JSON response
        article_data = self._parse_article_response(response.content)

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
            logger.info(f"Trying JSON block {i}, title: {parsed.get('title', 'NO TITLE')[:50] if isinstance(parsed, dict) else 'NOT DICT'}")
            # Handle nested JSON - if content itself contains ```json, parse it
            parsed = self._unwrap_nested_json(parsed)
            if self._is_valid_article(parsed):
                logger.info(f"Successfully parsed article: {parsed.get('title', '')[:50]}")
                return parsed

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

        # Fallback: treat entire response as content
        logger.warning(f"Falling back to raw content. Response starts with: {response_text[:100]}")
        return {
            "title": "Generated Article",
            "subtitle": "",
            "content": response_text,
            "tags": [],
            "meta_description": "",
        }

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
            # Find next ```json marker
            code_block_start = text.find("```json", search_start)
            if code_block_start == -1:
                break

            # Find the start of the JSON object after ```json
            json_start = text.find("{", code_block_start)
            if json_start == -1:
                break

            # Extract JSON using brace-matching
            json_str = self._extract_json_object(text[json_start:])
            if json_str:
                try:
                    parsed = json.loads(json_str)
                    if isinstance(parsed, dict):
                        results.append(parsed)
                except json.JSONDecodeError:
                    pass

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
        return (
            isinstance(data, dict)
            and "title" in data
            and "content" in data
            and isinstance(data.get("content"), str)
            and len(data.get("content", "")) > 100  # Meaningful content
        )

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
