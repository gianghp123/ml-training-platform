from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pandas as pd
import pytest

from src.runtime import BlockContext, DatasetValue


@dataclass
class MemoryStorage:
    bucket: str = "ml-platform"
    objects: dict[str, bytes] = field(default_factory=dict)
    content_types: dict[str, str] = field(default_factory=dict)

    def get_bytes(self, object_key: str) -> bytes:
        return self.objects[object_key]

    def put_bytes(self, object_key: str, data: bytes, content_type: str) -> str:
        self.objects[object_key] = data
        self.content_types[object_key] = content_type
        return object_key


@pytest.fixture
def storage() -> MemoryStorage:
    return MemoryStorage()


@pytest.fixture
def context_factory(storage: MemoryStorage):
    def factory(
        *,
        node_id: str = "node-1",
        datasets: dict[str, dict[str, Any]] | None = None,
    ) -> BlockContext:
        return BlockContext(
            run_id="run-1",
            node_id=node_id,
            datasets=datasets or {},
            storage=storage,
        )

    return factory


@pytest.fixture
def classification_dataset() -> DatasetValue:
    frame = pd.DataFrame(
        {
            "f1": [0.0, 0.2, 0.1, 1.0, 1.2, 1.1, 2.0, 2.2, 2.1, 3.0, 3.2, 3.1],
            "f2": [1.0, 1.1, 0.9, 2.0, 2.1, 1.9, 3.0, 3.1, 2.9, 4.0, 4.1, 3.9],
            "target": ["a", "a", "a", "b", "b", "b", "c", "c", "c", "c", "c", "c"],
        }
    )
    return DatasetValue(
        frame=frame,
        target="target",
        task="classification",
        role="train",
    )


@pytest.fixture
def regression_dataset() -> DatasetValue:
    frame = pd.DataFrame(
        {
            "f1": list(range(12)),
            "f2": [value * 0.5 for value in range(12)],
            "target": [value * 2.0 + 1 for value in range(12)],
        }
    )
    return DatasetValue(
        frame=frame,
        target="target",
        task="regression",
        role="train",
    )
