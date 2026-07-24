from __future__ import annotations

import pytest

from src.blocks.base import Block
from src.registry import CATALOG_EXECUTORS, BlockRegistry, DEFAULT_REGISTRY
from src.runtime import BlockResult, JobValidationError


def test_default_registry_covers_catalog():
    assert DEFAULT_REGISTRY.keys() == CATALOG_EXECUTORS


def test_registry_rejects_duplicate_and_missing():
    class Example(Block):
        executor_key = "example"
        version = 1

        def execute(self, context, inputs, config):
            return BlockResult(outputs={})

    registry = BlockRegistry([Example])
    with pytest.raises(ValueError, match="Duplicate"):
        registry.register(Example)
    with pytest.raises(JobValidationError, match="No Python executor"):
        registry.resolve("missing", 1)
