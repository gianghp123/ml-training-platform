"""Shared DSL test vectors, kept in sync with the engine package."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_VECTORS_PATH = Path(__file__).parent / "dsl_vectors.json"


@lru_cache(maxsize=1)
def load_vectors() -> dict:
    with _VECTORS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)
