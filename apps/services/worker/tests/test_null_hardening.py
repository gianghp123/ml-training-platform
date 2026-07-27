from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src.blocks.models import KMeansBlock, RandomForestBlock
from src.blocks.preprocessing import EncodeBlock, NormalizeBlock
from src.runtime import BlockExecutionError, DatasetValue


def _dataset(frame: pd.DataFrame, target: str | None = "y", task: str = "regression", role: str = "train") -> DatasetValue:
    return DatasetValue(frame=frame, target=target, task=task, role=role)


def test_normalize_fails_friendly_on_null(context_factory):
    block = NormalizeBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, np.nan, 4.0]})
    dataset = _dataset(frame, target=None)
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(context_factory(), {"dataset": dataset}, {"columns": "a", "method": "Standard"})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_encode_fails_friendly_on_null(context_factory):
    block = EncodeBlock()
    frame = pd.DataFrame({"c": ["a", "b", None]})
    dataset = _dataset(frame, target=None)
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(context_factory(), {"dataset": dataset}, {"columns": "c", "strategy": "Label"})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_random_forest_fails_friendly_on_feature_null(context_factory):
    block = RandomForestBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, np.nan, 4.0, 5.0], "y": [1, 0, 1, 0, 1]})
    dataset = _dataset(frame, target="y", task="classification")
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(context_factory(), {"dataset": dataset}, {"n_estimators": 5, "max_depth": 2})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_kmeans_fails_friendly_on_null(context_factory):
    block = KMeansBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, np.nan, 4.0, 5.0]})
    dataset = _dataset(frame, target=None, task="clustering")
    with pytest.raises(BlockExecutionError) as exc:
        block.execute(context_factory(), {"dataset": dataset}, {"n_clusters": 2})
    assert "missing values" in str(exc.value)
    assert "Impute" in str(exc.value)


def test_normalize_passes_when_clean(context_factory):
    block = NormalizeBlock()
    frame = pd.DataFrame({"a": [1.0, 2.0, 3.0, 4.0]})
    dataset = _dataset(frame, target=None)
    result = block.execute(context_factory(), {"dataset": dataset}, {"columns": "a", "method": "MinMax"})
    assert result.outputs["dataset"].frame["a"].min() == pytest.approx(0.0)
