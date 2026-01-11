"""Prompt templates for blog article generation."""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional


class SourceType(str, Enum):
    """Source types for article generation."""

    NEWS = "news"
    PAPER = "paper"
    ARTICLE = "article"


class PromptTemplates:
    """Prompt templates for generating blog articles."""

    # Target lengths by source type (in characters)
    TARGET_LENGTHS = {
        SourceType.NEWS: (15000, 20000),     # 15,000-20,000 chars
        SourceType.PAPER: (12000, 15000),     # 12,000-15,000 chars
        SourceType.ARTICLE: (8000, 10000),    # ~10,000 chars
    }

    SYSTEM_PROMPT = """You are an expert AI technology blogger who writes in-depth, engaging articles about artificial intelligence, machine learning, and emerging technologies.

Your writing style:
- Professional yet accessible to a broad audience
- Clear explanations of technical concepts
- Engaging narrative with practical examples
- Well-structured with clear sections and headings
- Balanced analysis with pros and cons

Your articles always:
- Start with a compelling introduction that explains why this topic matters
- Include real-world applications and implications
- Provide technical depth without being overwhelming
- End with future outlook and actionable insights
- Use accurate information only - never fabricate facts or links"""

    @classmethod
    def get_article_prompt(
        cls,
        source_type: SourceType,
        title: str,
        content: str,
        summary: Optional[str] = None,
        author: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Generate the main prompt for article creation.

        Args:
            source_type: Type of source (news, paper, article)
            title: Original source title
            content: Source content/abstract
            summary: Optional summary
            author: Original author(s)
            metadata: Additional metadata

        Returns:
            Formatted prompt string
        """
        min_chars, max_chars = cls.TARGET_LENGTHS.get(
            source_type,
            cls.TARGET_LENGTHS[SourceType.ARTICLE]
        )

        type_specific = cls._get_type_specific_instructions(source_type)

        prompt = f"""Write a comprehensive blog article based on the following source material.

## Source Information
- **Type**: {source_type.value}
- **Original Title**: {title}
{f'- **Author(s)**: {author}' if author else ''}
{f'- **Summary**: {summary}' if summary else ''}

## Source Content
{content}

## Article Requirements

### Length and Format
- Target length: {min_chars:,} to {max_chars:,} characters
- Format: Markdown
- Language: English

### Structure Requirements
1. **Title**: Create an engaging, rephrased title (not just copying the original)
2. **Subtitle**: Write a compelling subtitle (max 140 characters)
3. **Introduction**: 
   - Hook the reader with why this topic matters now
   - Provide necessary background context
   - Preview what the article will cover
4. **Main Body**:
   - Use clear section headings (## or ###)
   - Keep paragraphs short (2-4 sentences)
   - Include practical examples where relevant
   - Present balanced analysis (advantages and challenges)
   - Use bullet points or numbered lists for clarity
5. **Conclusion**:
   - Summarize key takeaways
   - Discuss future implications
   - End with a thought-provoking statement

{type_specific}

### Critical Rules
- NEVER fabricate information, statistics, or quotes
- NEVER create fake URLs or references
- Only cite information from the provided source
- Maintain factual accuracy throughout
- Write in a professional blogger tone

### Output Format
Return your article in the following JSON format:
```json
{{
    "title": "Your engaging article title",
    "subtitle": "Compelling subtitle under 140 characters",
    "content": "Full markdown content of the article...",
    "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
    "meta_description": "SEO description under 160 characters"
}}
```

**CRITICAL JSON FORMATTING RULES**:
- The content field must be a valid JSON string
- Escape all double quotes inside content with backslash: use \\" instead of "
- Escape newlines as \\n
- Example: "content": "He said \\"Hello\\" and left.\\n\\nNext paragraph..."

Now write the article:"""

        return prompt

    @classmethod
    def _get_type_specific_instructions(cls, source_type: SourceType) -> str:
        """Get source-type specific instructions."""
        if source_type == SourceType.NEWS:
            return """### News Article Specific Guidelines
- Focus on the news event's significance and broader implications
- Explain why this matters to the reader
- Provide context about the companies/people involved
- Discuss potential impact on the industry
- Include analysis of what this means for the future"""

        elif source_type == SourceType.PAPER:
            return """### Research Paper Specific Guidelines
- Explain the research problem being addressed
- Break down the methodology in accessible terms
- Highlight key findings and their significance
- Discuss practical applications of the research
- Address limitations and future research directions
- Make complex concepts understandable to non-experts"""

        else:  # ARTICLE
            return """### Article Specific Guidelines
- Identify and elaborate on the key arguments
- Provide additional context and background
- Include practical applications and examples
- Present balanced perspectives
- Add your analytical insights"""

    @classmethod
    def get_reference_extraction_prompt(cls, content: str) -> str:
        """
        Generate prompt for extracting references from content.

        Args:
            content: Article content to extract references from

        Returns:
            Prompt for reference extraction
        """
        return f"""Analyze the following article and identify any external references that should be cited.

Article content:
{content}

For each reference mentioned or implied, provide:
1. The topic/subject being referenced
2. Suggested title for the reference
3. Type of source (official documentation, research paper, news article, etc.)

Return in JSON format:
```json
{{
    "references": [
        {{
            "topic": "What the reference is about",
            "suggested_title": "Suggested title for citation",
            "source_type": "documentation/paper/article/etc"
        }}
    ]
}}
```

Only include references that would genuinely add value. Do not fabricate or suggest URLs.
If no references are needed, return an empty array."""

    @classmethod
    def get_improvement_prompt(
        cls,
        content: str,
        feedback: str,
    ) -> str:
        """
        Generate prompt for improving an existing article.

        Args:
            content: Existing article content
            feedback: Improvement feedback/instructions

        Returns:
            Prompt for article improvement
        """
        return f"""Improve the following blog article based on the provided feedback.

## Current Article
{content}

## Improvement Feedback
{feedback}

## Instructions
- Maintain the overall structure and format
- Address all points in the feedback
- Keep the same professional tone
- Preserve accurate information
- Do not add fabricated facts or references

Return the improved article in the same JSON format:
```json
{{
    "title": "Article title",
    "subtitle": "Subtitle",
    "content": "Improved markdown content...",
    "tags": ["Tags"],
    "meta_description": "SEO description"
}}
```"""
