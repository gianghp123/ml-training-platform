"""Versioned block registry keyed by stable catalog executor identity."""

from __future__ import annotations

from collections.abc import Iterable
from typing import TypeVar

from .blocks.base import Block
from .blocks.data_source import LoadCsvBlock, LoadJsonBlock, LoadXmlBlock
from .blocks.data_split import TrainTestSplitBlock
from .blocks.evaluation import EvaluateBlock
from .blocks.model_persistence import SaveModelBlock
from .blocks.models import (
    KMeansBlock,
    LogisticRegressionBlock,
    RandomForestBlock,
    SvmBlock,
)
from .blocks.preprocessing import (
    ConcatFeaturesBlock,
    CustomFeatureFormulaBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FeatureUnionBlock,
    FilterRowsBlock,
    ImputeMissingBlock,
    JoinDatasetsBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)
from .runtime import JobValidationError

BlockType = type[Block]
TBlock = TypeVar("TBlock", bound=Block)


CATALOG_EXECUTORS = {
    ("load_csv", 1),
    ("load_json", 1),
    ("load_xml", 1),
    ("normalize", 3),
    ("encode", 1),
    ("impute_missing", 1),
    ("feature_select", 1),
    ("select_target", 1),
    ("rename_columns", 1),
    ("concat_features", 1),
    ("filter_rows", 1),
    ("custom_feature_formula", 1),
    ("join_datasets", 1),
    ("feature_union", 1),
    ("train_test_split", 1),
    ("random_forest", 1),
    ("logistic_regression", 1),
    ("svm", 1),
    ("kmeans", 1),
    ("evaluate", 1),
    ("save_model", 1),
}


class BlockRegistry:
    def __init__(self, block_types: Iterable[BlockType] = ()) -> None:
        self._blocks: dict[tuple[str, int], BlockType] = {}
        for block_type in block_types:
            self.register(block_type)

    def register(self, block_type: BlockType) -> None:
        if not isinstance(block_type, type) or not issubclass(block_type, Block):
            raise TypeError("Registered executor must be a Block class")
        executor_key = getattr(block_type, "executor_key", "")
        version = getattr(block_type, "version", None)
        if not isinstance(executor_key, str) or not executor_key.strip():
            raise ValueError("Block executor_key must be a non-empty string")
        if not isinstance(version, int) or version <= 0:
            raise ValueError("Block version must be a positive integer")
        key = (executor_key, version)
        if key in self._blocks:
            raise ValueError(
                f"Duplicate block registration for {executor_key}@{version}"
            )
        self._blocks[key] = block_type

    def resolve(self, executor_key: str, version: int) -> Block:
        try:
            return self._blocks[(executor_key, version)]()
        except KeyError as exc:
            raise JobValidationError(
                f"No Python executor is registered for {executor_key}@{version}"
            ) from exc

    def keys(self) -> set[tuple[str, int]]:
        return set(self._blocks)

    def assert_catalog_complete(self) -> None:
        missing = CATALOG_EXECUTORS - self.keys()
        extra = self.keys() - CATALOG_EXECUTORS
        if missing or extra:
            details: list[str] = []
            if missing:
                details.append(
                    "missing "
                    + ", ".join(
                        f"{key}@{version}" for key, version in sorted(missing)
                    )
                )
            if extra:
                details.append(
                    "unexpected "
                    + ", ".join(
                        f"{key}@{version}" for key, version in sorted(extra)
                    )
                )
            raise RuntimeError("Worker registry is inconsistent: " + "; ".join(details))


DEFAULT_REGISTRY = BlockRegistry(
    [
        LoadCsvBlock,
        LoadJsonBlock,
        LoadXmlBlock,
        NormalizeBlock,
        EncodeBlock,
        ImputeMissingBlock,
        FeatureSelectBlock,
        FilterRowsBlock,
        CustomFeatureFormulaBlock,
        JoinDatasetsBlock,
        FeatureUnionBlock,
        SelectTargetBlock,
        RenameColumnsBlock,
        ConcatFeaturesBlock,
        TrainTestSplitBlock,
        RandomForestBlock,
        LogisticRegressionBlock,
        SvmBlock,
        KMeansBlock,
        EvaluateBlock,
        SaveModelBlock,
    ]
)
DEFAULT_REGISTRY.assert_catalog_complete()
