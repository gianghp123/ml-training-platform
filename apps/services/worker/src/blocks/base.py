"""Base interface for all catalog block executors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Mapping

from ..runtime import BlockContext, BlockResult


class Block(ABC):
    executor_key: str
    version: int

    @abstractmethod
    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        """Execute one graph node without mutating its input runtime values."""

