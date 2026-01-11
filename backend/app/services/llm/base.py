"""Base LLM client interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class LLMResponse:
    """Response from LLM."""

    content: str
    model: str
    input_tokens: int
    output_tokens: int
    generation_time_seconds: float
    metadata: Optional[Dict[str, Any]] = None

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


class BaseLLM(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Generate text from prompt."""
        pass

    @abstractmethod
    async def generate_with_context(
        self,
        prompt: str,
        context: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Generate text with additional context."""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Get the model name."""
        pass
