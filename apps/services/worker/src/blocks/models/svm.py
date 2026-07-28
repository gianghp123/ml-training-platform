"""Support Vector Machine catalog executor."""

from __future__ import annotations

from typing import Any, Mapping

from sklearn.svm import SVC, SVR

from ...runtime import BlockContext, BlockExecutionError, BlockResult, ModelValue
from ..base import Block
from ..utils import (
    enum_value,
    positive_float,
    require_dataset,
    supervised_training_data,
)


class SvmBlock(Block):
    executor_key = "svm"
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
        kernel = enum_value(
            config.get("kernel"),
            field_name="kernel",
            choices=("linear", "rbf", "poly"),
            default="rbf",
        )
        c_value = positive_float(config.get("C"), field_name="C", default=1.0)
        logs: list[tuple[str, str]] = [
            (
                "info",
                f"Training SVM {dataset.task} model on {len(features)} samples "
                f"with {len(feature_columns)} features ({', '.join(feature_columns)}). "
                f"Hyperparameters: kernel={kernel}, C={c_value}.",
            )
        ]
        if dataset.task == "classification":
            estimator = SVC(kernel=kernel, C=c_value)
        elif dataset.task == "regression":
            estimator = SVR(kernel=kernel, C=c_value)
        else:
            raise BlockExecutionError("SVM does not support clustering")
        try:
            estimator.fit(features, target)
        except ValueError as exc:
            raise BlockExecutionError(f"SVM training failed: {exc}") from exc

        train_score = float(estimator.score(features, target))
        score_name = "Accuracy" if dataset.task == "classification" else "R2 Score"
        logs.append(
            (
                "info",
                f"SVM fit completed successfully. Training {score_name}: {train_score:.4f}",
            )
        )
        value = ModelValue(
            estimator=estimator,
            algorithm="SVM",
            task=dataset.task,
            feature_columns=feature_columns,
            target_column=dataset.target,
        )
        return BlockResult(
            outputs={"model": value},
            summary=value.summary(),
            logs=tuple(logs),
        )
