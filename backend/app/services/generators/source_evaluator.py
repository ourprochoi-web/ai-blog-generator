"""Source evaluator using LLM for automatic relevance scoring."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from backend.app.services.llm.gemini import GeminiClient


@dataclass
class SourceEvaluation:
    """Evaluation result for a source."""

    relevance_score: int  # 0-100
    suggested_topic: str  # Suggested article angle/topic
    key_points: List[str]  # Key points to cover
    reason: str  # Explanation for the score
    is_recommended: bool  # Whether to recommend for blog generation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "relevance_score": self.relevance_score,
            "suggested_topic": self.suggested_topic,
            "key_points": self.key_points,
            "reason": self.reason,
            "is_recommended": self.is_recommended,
        }


class SourceEvaluator:
    """Evaluates sources for blog generation suitability using LLM."""

    EVALUATION_PROMPT = """You are an AI blog editor evaluating sources for a tech/AI blog.

Evaluate the following source and provide:
1. A relevance score (0-100) based on:
   - Timeliness and newsworthiness (is this current/relevant news?)
   - Technical depth and quality of content
   - Interest level for AI/tech audience
   - Uniqueness and novelty of the topic

2. A suggested topic/angle for a blog article based on this source.

3. Key points that should be covered in the article.

4. A brief reason for your score.

SOURCE INFORMATION:
- Type: {source_type}
- Title: {title}
- URL: {url}

{summary_section}

Content:
{content}

Respond ONLY with a JSON object in this exact format:
```json
{{
    "relevance_score": <0-100>,
    "suggested_topic": "<catchy article title/angle>",
    "key_points": ["<point 1>", "<point 2>", "<point 3>"],
    "reason": "<brief explanation for the score>",
    "is_recommended": <true if score >= 60, false otherwise>
}}
```
"""

    BATCH_EVALUATION_PROMPT = """You are an AI blog editor evaluating multiple sources for a tech/AI blog.

Evaluate each source and provide relevance scores. Consider:
- Timeliness and newsworthiness
- Technical depth and quality
- Interest level for AI/tech audience
- Uniqueness and novelty

SOURCES TO EVALUATE:
{sources_list}

Respond ONLY with a JSON array:
```json
[
    {{
        "source_id": "<id>",
        "relevance_score": <0-100>,
        "suggested_topic": "<catchy article title/angle>",
        "reason": "<brief explanation>"
    }},
    ...
]
```
"""

    def __init__(self, llm_client: Optional[GeminiClient] = None):
        """
        Initialize source evaluator.

        Args:
            llm_client: Optional LLM client (creates default Gemini client if not provided)
        """
        self.llm = llm_client or GeminiClient()

    async def evaluate_source(
        self,
        source_type: str,
        title: str,
        url: str,
        content: str,
        summary: Optional[str] = None,
    ) -> SourceEvaluation:
        """
        Evaluate a single source for blog generation suitability.

        Args:
            source_type: Type of source (news, paper, article)
            title: Source title
            url: Source URL
            content: Source content
            summary: Optional source summary

        Returns:
            SourceEvaluation object with scores and recommendations
        """
        # Truncate content if too long (to fit in context window)
        max_content_length = 10000
        truncated_content = content[:max_content_length]
        if len(content) > max_content_length:
            truncated_content += "\n\n[Content truncated...]"

        summary_section = ""
        if summary:
            summary_section = f"Summary:\n{summary}\n"

        prompt = self.EVALUATION_PROMPT.format(
            source_type=source_type,
            title=title,
            url=url,
            summary_section=summary_section,
            content=truncated_content,
        )

        response = await self.llm.generate(
            prompt=prompt,
            temperature=0.3,  # Lower temperature for consistent evaluation
        )

        return self._parse_evaluation_response(response.content)

    async def evaluate_sources_batch(
        self,
        sources: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Evaluate multiple sources in a single LLM call.

        Args:
            sources: List of source dictionaries with id, type, title, url, summary

        Returns:
            List of evaluation results with source_id, relevance_score, suggested_topic, reason
        """
        if not sources:
            return []

        # Build sources list for prompt
        sources_text = ""
        for i, source in enumerate(sources, 1):
            sources_text += f"""
---
Source {i}:
- ID: {source.get('id')}
- Type: {source.get('type')}
- Title: {source.get('title')}
- URL: {source.get('url')}
- Summary: {source.get('summary', 'N/A')[:500]}
"""

        prompt = self.BATCH_EVALUATION_PROMPT.format(sources_list=sources_text)

        response = await self.llm.generate(
            prompt=prompt,
            temperature=0.3,
        )

        return self._parse_batch_response(response.content)

    def _parse_evaluation_response(self, response_text: str) -> SourceEvaluation:
        """Parse the evaluation JSON response from LLM."""
        # Try to find JSON in code blocks
        json_match = re.search(r"```json\s*(.*?)\s*```", response_text, re.DOTALL)

        json_str = ""
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON object
            json_str = self._extract_json_object(response_text)

        if json_str:
            try:
                data = json.loads(json_str)
                return SourceEvaluation(
                    relevance_score=min(100, max(0, int(data.get("relevance_score", 50)))),
                    suggested_topic=data.get("suggested_topic", ""),
                    key_points=data.get("key_points", []),
                    reason=data.get("reason", ""),
                    is_recommended=data.get("is_recommended", False),
                )
            except (json.JSONDecodeError, ValueError):
                pass

        # Fallback to default evaluation
        return SourceEvaluation(
            relevance_score=50,
            suggested_topic="",
            key_points=[],
            reason="Failed to parse evaluation response",
            is_recommended=False,
        )

    def _parse_batch_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse the batch evaluation JSON response from LLM."""
        # Try to find JSON array in code blocks
        json_match = re.search(r"```json\s*(\[.*?\])\s*```", response_text, re.DOTALL)

        json_str = ""
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON array
            array_match = re.search(r"\[.*\]", response_text, re.DOTALL)
            if array_match:
                json_str = array_match.group(0)

        if json_str:
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass

        return []

    def _extract_json_object(self, text: str) -> Optional[str]:
        """Extract JSON object with balanced braces from text."""
        match = re.search(r'\{\s*"relevance_score"', text)
        if match:
            start = match.start()
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
