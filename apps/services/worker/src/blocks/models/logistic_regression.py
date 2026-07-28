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

        logs: list[tuple[str, str]] = [
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" [MODEL TRAINING] Logistic Regression ({dataset.task.upper()})"),
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" ► Dataset shape      : {len(features)} rows × {len(feature_columns)} features"),
            ("info", f" ► Target column     : '{dataset.target}'"),
            ("info", f" ► Feature columns    : [{', '.join(feature_columns)}]"),
            ("info", f" ► Hyperparameters    : penalty='{penalty_name}', C={c_value}, solver='{solver}', max_iter=1000"),
            ("info", "────────────────────────────────────────────────────────────────"),
        ]

        estimator = LogisticRegression(
            penalty=penalty,
            C=c_value,
            solver=solver,
            max_iter=1000,
            random_state=42,
        )

        import time
        start_time = time.perf_counter()
        
        # Simulate step-by-step training progress logs for demo visibility
        logs.append(("info", "[1/4] Initializing loss function & gradient optimizer..."))
        logs.append(("info", f"[2/4] Fitting model on {len(features)} instances..."))

        try:
            estimator.fit(features, target)
        except ValueError as exc:
            raise BlockExecutionError(
                f"Logistic Regression training failed: {exc}"
            ) from exc

        elapsed = time.perf_counter() - start_time
        n_iter = getattr(estimator, "n_iter_", [100])[0]

        logs.append(("info", f"[3/4] Optimization converged in {n_iter} iterations ({elapsed:.3f}s)"))
        
        train_acc = float(estimator.score(features, target))
        logs.append(("info", f"[4/4] Evaluating training set metrics..."))
        logs.append(("info", "────────────────────────────────────────────────────────────────"))
        logs.append(("info", f" ✔ Training completed successfully in {elapsed:.3f}s"))
        logs.append(("info", f" ★ Final Training Accuracy: {train_acc * 100:.2f}% ({train_acc:.4f})"))
        logs.append(("info", "════════════════════════════════════════════════════════════════"))

        value = ModelValue(
            estimator=estimator,
            algorithm="LogisticRegression",
            task="classification",
            feature_columns=feature_columns,
            target_column=dataset.target,
        )
        return BlockResult(
            outputs={"model": value},
            summary=value.summary(),
            logs=tuple(logs),
        )

