"""Random Forest catalog executor."""

from __future__ import annotations

from typing import Any, Mapping

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

from ...runtime import BlockContext, BlockExecutionError, BlockResult, ModelValue
from ..base import Block
from ..utils import positive_int, require_dataset, supervised_training_data


class RandomForestBlock(Block):
    executor_key = "random_forest"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        features, target, feature_columns = supervised_training_data(
            dataset, allowed_tasks=("classification", "regression")
        )
        n_estimators = positive_int(
            config.get("n_estimators"),
            field_name="n_estimators",
            default=100,
        )
        max_depth = positive_int(
            config.get("max_depth"),
            field_name="max_depth",
            default=10,
        )
        if dataset.task == "classification":
            estimator = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=42,
                n_jobs=-1,
            )
        elif dataset.task == "regression":
            estimator = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=42,
                n_jobs=-1,
            )
        else:
            raise BlockExecutionError("Random Forest does not support clustering")
        try:
            estimator.fit(features, target)
        except ValueError as exc:
            raise BlockExecutionError(f"Random Forest training failed: {exc}") from exc
        value = ModelValue(
            estimator=estimator,
            algorithm="RandomForest",
            task=dataset.task,
            feature_columns=feature_columns,
            target_column=dataset.target,
        )
        return BlockResult(outputs={"model": value}, summary=value.summary())
