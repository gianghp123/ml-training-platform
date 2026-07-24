"""Logistic Regression catalog executor."""

from __future__ import annotations

from typing import Any, Mapping

from sklearn.linear_model import LogisticRegression

from ...runtime import BlockContext, BlockExecutionError, BlockResult, ModelValue
from ..base import Block
from ..utils import (
    enum_value,
    positive_float,
    require_dataset,
    supervised_training_data,
)


class LogisticRegressionBlock(Block):
    executor_key = "logistic_regression"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        features, target, feature_columns = supervised_training_data(
            dataset, allowed_tasks=("classification",)
        )
        penalty_name = enum_value(
            config.get("penalty"),
            field_name="penalty",
            choices=("l1", "l2", "none"),
            default="l2",
        )
        c_value = positive_float(config.get("C"), field_name="C", default=1.0)
        penalty: str | None = None if penalty_name == "none" else penalty_name
        solver = "liblinear" if penalty_name == "l1" else "lbfgs"
        estimator = LogisticRegression(
            penalty=penalty,
            C=c_value,
            solver=solver,
            max_iter=1000,
            random_state=42,
        )
        try:
            estimator.fit(features, target)
        except ValueError as exc:
            raise BlockExecutionError(
                f"Logistic Regression training failed: {exc}"
            ) from exc
        value = ModelValue(
            estimator=estimator,
            algorithm="LogisticRegression",
            task="classification",
            feature_columns=feature_columns,
            target_column=dataset.target,
        )
        return BlockResult(outputs={"model": value}, summary=value.summary())
