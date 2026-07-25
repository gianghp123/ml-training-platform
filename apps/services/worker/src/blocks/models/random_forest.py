"""Random Forest catalog executor."""

from __future__ import annotations

import time
from typing import Any, Mapping

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

from ...runtime import BlockContext, BlockExecutionError, BlockResult, ModelValue
from ..base import Block
from ..utils import positive_int, require_dataset, supervised_training_data


_FEATURE_PREVIEW = 10
_IMPORTANCE_PREVIEW = 10
_IMBALANCE_RATIO = 0.2


def _format_feature_list(columns: tuple[str, ...]) -> list[tuple[str, str]]:
    if len(columns) <= _FEATURE_PREVIEW:
        return [("info", f"- {column}") for column in columns]
    head = [("info", f"- {column}") for column in columns[:_FEATURE_PREVIEW]]
    head.append(("info", f"- ... (+{len(columns) - _FEATURE_PREVIEW} more)"))
    return head


def _format_importance_list(
    columns: tuple[str, ...], importances: np.ndarray
) -> list[tuple[str, str]]:
    order = np.argsort(importances)[::-1]
    head = order[:_IMPORTANCE_PREVIEW]
    lines: list[tuple[str, str]] = [
        ("info", f"- {columns[i]}: {importances[i]:.2f}") for i in head
    ]
    if len(order) > _IMPORTANCE_PREVIEW:
        lines.append(
            ("info", f"- ... (+{len(order) - _IMPORTANCE_PREVIEW} more)")
        )
    return lines


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
        is_classifier = dataset.task == "classification"
        if is_classifier:
            task = "classification"
            criterion = "gini"
            default_max_features: Any = "sqrt"
            estimator = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=42,
                n_jobs=-1,
            )
        elif dataset.task == "regression":
            task = "regression"
            criterion = "squared_error"
            default_max_features = 1.0
            estimator = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=42,
                n_jobs=-1,
            )
        else:
            raise BlockExecutionError("Random Forest does not support clustering")

        logs: list[tuple[str, str]] = []

        logs.append(("info", "Input dataset"))
        logs.append(("info", f"- Task: {dataset.task}"))
        logs.append(("info", f"- Training rows: {len(features)}"))
        logs.append(("info", f"- Training columns: {len(dataset.frame.columns)}"))
        logs.append(("info", f"- Target column: {dataset.target!r}"))
        logs.append(("info", f"- Feature columns ({len(feature_columns)})"))
        logs.extend(_format_feature_list(feature_columns))

        if not pd.api.types.is_numeric_dtype(target):
            logs.append(("info", "Encoding target labels..."))
            labels = sorted(target.unique().tolist())
            logs.append(
                ("info", f"- Detected {len(labels)} classes: {', '.join(str(v) for v in labels)}")
            )
        else:
            logs.append(("info", f"- Target dtype: {target.dtype} (no encoding needed)"))

        if len(feature_columns) < 2:
            logs.append(("warning", "Fewer than 2 features; model may overfit"))
        if is_classifier:
            counts = target.value_counts(normalize=True)
            if len(counts) > 1:
                ratio = float(counts.min() / counts.max())
                if ratio < _IMBALANCE_RATIO:
                    logs.append(
                        (
                            "warning",
                            f"Class imbalance detected (min/max ratio {ratio:.2f})",
                        )
                    )

        logs.append(("info", "Model configuration"))
        logs.append(("info", f"- n_estimators = {n_estimators}"))
        logs.append(("info", f"- criterion = {criterion}"))
        logs.append(("info", f"- max_depth = {max_depth}"))
        logs.append(("info", "- min_samples_split = 2"))
        logs.append(("info", "- min_samples_leaf = 1"))
        logs.append(("info", f"- max_features = {default_max_features}"))
        logs.append(("info", "- bootstrap = true"))
        logs.append(("info", "- random_state = 42"))
        logs.append(("info", "- n_jobs = -1"))

        logs.append(("info", "Building forest..."))
        fit_started = time.perf_counter()
        try:
            estimator.fit(features, target)
        except ValueError as exc:
            raise BlockExecutionError(
                f"Random Forest training failed: {exc}"
            ) from exc
        fit_ms = int((time.perf_counter() - fit_started) * 1000)

        logs.append(("info", "Training completed"))
        logs.append(("info", f"- Training time: {fit_ms} ms"))

        value = ModelValue(
            estimator=estimator,
            algorithm="RandomForest",
            task=task,
            feature_columns=feature_columns,
            target_column=dataset.target,
        )

        logs.append(("info", "Model summary"))
        logs.append(("info", f"- Trees trained: {n_estimators}"))
        logs.append(("info", f"- Number of features: {len(feature_columns)}"))
        if is_classifier:
            classes = getattr(estimator, "classes_", [])
            logs.append(("info", f"- Number of classes: {len(classes)}"))

        importances = getattr(estimator, "feature_importances_", None)
        if importances is not None and len(importances) == len(feature_columns):
            logs.append(("info", "Feature importance"))
            logs.extend(_format_importance_list(feature_columns, importances))

        logs.append(
            (
                "info",
                "Model output is in memory; use the Save Model block to persist it to MinIO.",
            )
        )

        return BlockResult(
            outputs={"model": value},
            summary=value.summary(),
            logs=tuple(logs),
        )
