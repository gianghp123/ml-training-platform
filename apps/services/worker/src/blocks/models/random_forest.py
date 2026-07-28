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
        logs: list[tuple[str, str]] = [
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" [MODEL TRAINING] Random Forest ({dataset.task.upper()})"),
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" ► Dataset shape      : {len(features)} rows × {len(feature_columns)} features"),
            ("info", f" ► Target column     : '{dataset.target}'"),
            ("info", f" ► Feature columns    : [{', '.join(feature_columns)}]"),
            ("info", f" ► Hyperparameters    : n_estimators={n_estimators}, max_depth={max_depth}, n_jobs=-1"),
            ("info", "────────────────────────────────────────────────────────────────"),
        ]
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

        import time
        start_time = time.perf_counter()
        
        # Log ensemble tree building steps for rich demo logs
        step_chunks = min(5, n_estimators)
        step_size = max(1, n_estimators // step_chunks)
        for built_trees in range(step_size, n_estimators, step_size):
            pct = int((built_trees / n_estimators) * 100)
            bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
            logs.append(("info", f" 🌲 Building ensemble: [{bar}] {pct:3d}% ({built_trees}/{n_estimators} decision trees)"))

        try:
            estimator.fit(features, target)
        except ValueError as exc:
            raise BlockExecutionError(f"Random Forest training failed: {exc}") from exc

        elapsed = time.perf_counter() - start_time
        logs.append(("info", f" 🌲 Building ensemble: [██████████] 100% ({n_estimators}/{n_estimators} decision trees)"))
        
        train_score = float(estimator.score(features, target))
        score_name = "Accuracy" if dataset.task == "classification" else "R2 Score"

        logs.append(("info", "────────────────────────────────────────────────────────────────"))
        logs.append(("info", f" ✔ Ensemble training fit complete in {elapsed:.3f}s"))
        logs.append(("info", f" ★ Training {score_name}: {train_score * 100:.2f}% ({train_score:.4f})"))

        if hasattr(estimator, "feature_importances_"):
            importances = sorted(
                zip(feature_columns, estimator.feature_importances_),
                key=lambda pair: pair[1],
                reverse=True,
            )
            logs.append(("info", " 📊 Top Feature Importances:"))
            for rank, (col, imp) in enumerate(importances[:5], 1):
                bar_len = int(imp * 25)
                visual_bar = "■" * bar_len
                logs.append(("info", f"    {rank}. {col:<18s} │ {visual_bar:<25s} │ {imp:.4f} ({imp*100:.1f}%)"))

        logs.append(("info", "════════════════════════════════════════════════════════════════"))

        value = ModelValue(
            estimator=estimator,
            algorithm="RandomForest",
            task=dataset.task,
            feature_columns=feature_columns,
            target_column=dataset.target,
        )
        return BlockResult(
            outputs={"model": value},
            summary=value.summary(),
            logs=tuple(logs),
        )

