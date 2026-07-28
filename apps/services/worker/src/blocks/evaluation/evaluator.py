"""Model evaluation executor and metrics artifact producer."""

from __future__ import annotations

import json
from typing import Any, Mapping

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    silhouette_score,
)

from ...runtime import (
    BlockContext,
    BlockExecutionError,
    BlockResult,
    MetricsValue,
    PendingArtifact,
    json_safe,
)
from ..base import Block
from ..utils import (
    parse_string_list,
    require_columns,
    require_dataset,
    require_model,
    require_numeric,
)


DEFAULT_METRICS = {
    "classification": ["accuracy", "precision", "recall", "f1", "confusionMatrix"],
    "regression": ["mae", "mse", "rmse", "r2"],
    "clustering": ["silhouette", "inertia"],
}


class EvaluateBlock(Block):
    executor_key = "evaluate"
    version = 1

    @staticmethod
    def _selected(config: Mapping[str, Any], task: str) -> list[str]:
        selected = parse_string_list(
            config.get("metrics"),
            field_name="metrics",
            allow_empty=True,
        )
        selected = selected or list(DEFAULT_METRICS[task])
        aliases = {
            "confusionmatrix": "confusionMatrix",
            "confusion_matrix": "confusionMatrix",
        }
        normalized = [aliases.get(item.lower(), item.lower()) for item in selected]
        allowed_by_lower = {
            item.lower(): item for item in DEFAULT_METRICS[task]
        }
        result: list[str] = []
        for item in normalized:
            canonical = (
                item if item == "confusionMatrix" else allowed_by_lower.get(item.lower())
            )
            if canonical is None:
                raise BlockExecutionError(
                    f"Metric {item!r} is not supported for task {task!r}"
                )
            if canonical not in result:
                result.append(canonical)
        return result

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        model = require_model(inputs)
        dataset = require_dataset(inputs)
        if dataset.role != "test":
            raise BlockExecutionError("Evaluation dataset must have role 'test'")
        if model.task != dataset.task:
            raise BlockExecutionError(
                f"Model task {model.task!r} does not match dataset task {dataset.task!r}"
            )
        require_columns(dataset.frame, model.feature_columns)
        features = dataset.frame.loc[:, list(model.feature_columns)]
        require_numeric(features, model.feature_columns)
        if features.isnull().any().any():
            raise BlockExecutionError("Evaluation features contain missing values")
        selected = self._selected(config, model.task)

        scalar_metrics: dict[str, float] = {}
        matrix_payload: dict[str, Any] | None = None
        try:
            predictions = model.estimator.predict(features)
            if model.task == "classification":
                if (
                    not model.target_column
                    or model.target_column not in dataset.frame.columns
                ):
                    raise BlockExecutionError(
                        "Classification evaluation requires the model target column"
                    )
                actual = dataset.frame[model.target_column]
                if "accuracy" in selected:
                    scalar_metrics["accuracy"] = float(
                        accuracy_score(actual, predictions)
                    )
                if "precision" in selected:
                    scalar_metrics["precision"] = float(
                        precision_score(
                            actual,
                            predictions,
                            average="macro",
                            zero_division=0,
                        )
                    )
                if "recall" in selected:
                    scalar_metrics["recall"] = float(
                        recall_score(
                            actual,
                            predictions,
                            average="macro",
                            zero_division=0,
                        )
                    )
                if "f1" in selected:
                    scalar_metrics["f1"] = float(
                        f1_score(
                            actual,
                            predictions,
                            average="macro",
                            zero_division=0,
                        )
                    )
                if "confusionMatrix" in selected:
                    labels = list(getattr(model.estimator, "classes_", []))
                    if not labels:
                        labels = sorted(
                            set(actual.tolist()).union(predictions.tolist()),
                            key=lambda value: str(value),
                        )
                    matrix_payload = {
                        "labels": json_safe(labels),
                        "matrix": confusion_matrix(
                            actual, predictions, labels=labels
                        ).astype(int).tolist(),
                    }
            elif model.task == "regression":
                if (
                    not model.target_column
                    or model.target_column not in dataset.frame.columns
                ):
                    raise BlockExecutionError(
                        "Regression evaluation requires the model target column"
                    )
                actual = dataset.frame[model.target_column]
                mse = float(mean_squared_error(actual, predictions))
                if "mae" in selected:
                    scalar_metrics["mae"] = float(
                        mean_absolute_error(actual, predictions)
                    )
                if "mse" in selected:
                    scalar_metrics["mse"] = mse
                if "rmse" in selected:
                    scalar_metrics["rmse"] = float(np.sqrt(mse))
                if "r2" in selected:
                    scalar_metrics["r2"] = float(r2_score(actual, predictions))
            elif model.task == "clustering":
                labels = np.asarray(predictions)
                if "silhouette" in selected:
                    if len(set(labels.tolist())) < 2:
                        raise BlockExecutionError(
                            "Silhouette score requires at least two predicted clusters"
                        )
                    scalar_metrics["silhouette"] = float(
                        silhouette_score(features, labels)
                    )
                if "inertia" in selected:
                    centers = model.estimator.cluster_centers_
                    scalar_metrics["inertia"] = float(
                        np.square(
                            features.to_numpy() - centers[labels.astype(int)]
                        ).sum()
                    )
            else:
                raise BlockExecutionError(
                    f"Unsupported model task {model.task!r}"
                )
        except BlockExecutionError:
            raise
        except (TypeError, ValueError, AttributeError) as exc:
            raise BlockExecutionError(f"Evaluation failed: {exc}") from exc

        value = MetricsValue(
            metrics=scalar_metrics,
            confusion_matrix=matrix_payload,
        )
        summary = value.summary()
        object_key = f"runs/{context.run_id}/artifacts/{context.node_id}/metrics.json"
        body = json.dumps(
            json_safe(summary),
            ensure_ascii=False,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
        storage_uri = context.storage.put_bytes(
            object_key, body, "application/json"
        )
        artifact = PendingArtifact(
            name="metrics.json",
            artifact_type="metric",
            mime_type="application/json",
            storage_uri=storage_uri,
            metadata={"task": model.task, "metrics": selected},
        )
        metrics_str = ", ".join(
            f"{k}={v:.4f}" if isinstance(v, (int, float)) else f"{k}={v}"
            for k, v in scalar_metrics.items()
        )
        
        eval_logs: list[tuple[str, str]] = [
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" [MODEL EVALUATION] Metrics & Performance Summary ({model.task.upper()})"),
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" ► Tested samples     : {len(features)} instances"),
            ("info", "────────────────────────────────────────────────────────────────"),
            ("info", " │ Metric                  │ Value        │ Rating"),
            ("info", " ├─────────────────────────┼──────────────┼───────────────"),
        ]

        for metric_name, val in scalar_metrics.items():
            formatted_val = f"{val * 100:.2f}%" if metric_name in ("accuracy", "precision", "recall", "f1") else f"{val:.4f}"
            rating = "★★★★★ Excellent" if val > 0.85 else ("★★██☆ Good" if val > 0.70 else "★☆☆☆☆ Needs Imp.")
            eval_logs.append(("info", f" │ {metric_name.upper():<23s} │ {formatted_val:<12s} │ {rating}"))

        eval_logs.append(("info", " └─────────────────────────┴──────────────┴───────────────"))

        if matrix_payload and "matrix" in matrix_payload:
            labels = matrix_payload.get("labels", [])
            matrix = matrix_payload.get("matrix", [])
            eval_logs.append(("info", " 📌 Confusion Matrix Breakdown:"))
            eval_logs.append(("info", f"    Classes: {labels}"))
            for idx, row in enumerate(matrix):
                row_label = labels[idx] if idx < len(labels) else f"Class {idx}"
                eval_logs.append(("info", f"    Actual [{row_label:<10s}] ➔ Predicted: {row}"))

        eval_logs.append(("info", "════════════════════════════════════════════════════════════════"))

        return BlockResult(
            outputs={"metrics": value},
            summary=summary,
            artifacts=(artifact,),
            logs=tuple(eval_logs),
        )

