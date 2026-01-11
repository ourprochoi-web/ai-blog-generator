"""Blog article writer using LLM."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from backend.app.services.generators.prompts import PromptTemplates, SourceType
from backend.app.services.generators.reference_validator import ReferenceValidator
from backend.app.services.llm.gemini import GeminiClient


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
        # Try to find all JSON blocks in the response (use last one)
        json_matches = re.findall(r"```json\s*(.*?)\s*```", response_text, re.DOTALL)

        if json_matches:
            # Use the last JSON block (usually the final answer)
            json_str = json_matches[-1]
        else:
            # Try to find JSON without code blocks - find last valid JSON object
            # Look for objects that start with {"title" which is our expected format
            json_match = re.search(r'\{"title":[^}]+.*?"meta_description":[^}]+\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                # Fallback: find any JSON object
                json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    # Fallback: treat entire response as content
                    return {
                        "title": "Generated Article",
                        "subtitle": "",
                        "content": response_text,
                        "tags": [],
                        "meta_description": "",
                    }

        try:
            parsed = json.loads(json_str)
            # Validate expected fields
            if "content" in parsed and "title" in parsed:
                return parsed
            else:
                return {
                    "title": "Generated Article",
                    "subtitle": "",
                    "content": response_text,
                    "tags": [],
                    "meta_description": "",
                }
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw content
            return {
                "title": "Generated Article",
                "subtitle": "",
                "content": response_text,
                "tags": [],
                "meta_description": "",
            }

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
