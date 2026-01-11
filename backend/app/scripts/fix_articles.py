"""Script to fix articles with nested JSON content."""

import asyncio
import json
import re
from typing import Any, Dict, Optional

from backend.app.db.database import get_supabase_client
from backend.app.db.repositories.article_repo import ArticleRepository


def extract_json_from_content(content: str) -> Optional[Dict[str, Any]]:
    """Extract JSON data from content that contains nested JSON."""
    if not content:
        return None

    content_stripped = content.strip()

    # If content starts with ```json
    if content_stripped.startswith("```json"):
        match = re.search(r"```json\s*(.*?)\s*```", content_stripped, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

    # If content is just a JSON object
    elif content_stripped.startswith("{") and '"title"' in content_stripped:
        try:
            return json.loads(content_stripped)
        except json.JSONDecodeError:
            pass

    return None


async def fix_articles():
    """Fix all articles with nested JSON content."""
    client = get_supabase_client()
    repo = ArticleRepository(client)

    # Get all articles
    response = client.table("articles").select("*").execute()
    articles = response.data

    print(f"Found {len(articles)} articles to check")

    fixed_count = 0
    for article in articles:
        content = article.get("content", "")
        article_id = article.get("id")
        current_title = article.get("title")

        # Check if content contains nested JSON
        parsed = extract_json_from_content(content)

        if parsed and "title" in parsed and "content" in parsed:
            # Extract the actual values
            new_title = parsed.get("title", current_title)
            new_subtitle = parsed.get("subtitle", "")
            new_content = parsed.get("content", content)
            new_tags = parsed.get("tags", [])
            new_meta = parsed.get("meta_description", "")

            # Calculate new word/char counts
            word_count = len(re.findall(r"\w+", new_content))
            char_count = len(new_content)

            # Update the article
            update_data = {
                "title": new_title,
                "subtitle": new_subtitle,
                "content": new_content,
                "tags": new_tags,
                "meta_description": new_meta,
                "word_count": word_count,
                "char_count": char_count,
            }

            await repo.update(article_id, update_data)
            print(f"Fixed article: {article_id}")
            print(f"  Old title: {current_title}")
            print(f"  New title: {new_title}")
            fixed_count += 1

    print(f"\nFixed {fixed_count} articles")


if __name__ == "__main__":
    asyncio.run(fix_articles())
