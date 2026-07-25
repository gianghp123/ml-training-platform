"""Deterministic train/test split executor."""

from __future__ import annotations

from typing import Any, Mapping

from sklearn.model_selection import train_test_split

from ...runtime import BlockContext, BlockExecutionError, BlockResult
from ..base import Block
from ..utils import boolean_value, require_dataset


class TrainTestSplitBlock(Block):
    executor_key = "train_test_split"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        if dataset.task not in {"classification", "regression", "clustering"}:
            raise BlockExecutionError(
                "Dataset task must be selected before Train/Test Split"
            )
        try:
            test_size = float(config.get("testSize", 0.2))
        except (TypeError, ValueError) as exc:
            raise BlockExecutionError("testSize must be a number") from exc
        if not 0.05 <= test_size <= 0.5:
            raise BlockExecutionError("testSize must be between 0.05 and 0.5")
        wants_stratify = boolean_value(
            config.get("stratify"), field_name="stratify", default=True
        )
        stratify = None
        logs: list[tuple[str, str]] = []
        if wants_stratify and dataset.task == "classification":
            if not dataset.target or dataset.target not in dataset.frame.columns:
                raise BlockExecutionError(
                    "Classification stratification requires a selected target column"
                )
            stratify = dataset.frame[dataset.target]
        elif wants_stratify:
            logs.append(
                (
                    "warning",
                    f"stratify is ignored for task {dataset.task!r}",
                )
            )
        try:
            train_frame, test_frame = train_test_split(
                dataset.frame,
                test_size=test_size,
                random_state=42,
                shuffle=True,
                stratify=stratify,
            )
        except ValueError as exc:
            raise BlockExecutionError(f"Train/test split failed: {exc}") from exc
        train_value = dataset.derive(
            frame=train_frame.reset_index(drop=True),
            role="train",
            lineage_node=context.node_id,
        )
        test_value = dataset.derive(
            frame=test_frame.reset_index(drop=True),
            role="test",
            lineage_node=context.node_id,
        )
        summary = {
            "type": "split",
            "trainRows": len(train_frame),
            "testRows": len(test_frame),
            "task": dataset.task,
            "target": dataset.target,
        }
        info_logs: list[tuple[str, str]] = [
            ("info", f"test_size={test_size:.2f}"),
            ("info", f"stratify={'yes' if stratify is not None else 'no'}"),
            ("info", f"Train rows: {len(train_frame)}"),
            ("info", f"Test rows: {len(test_frame)}"),
            ("info", f"Train columns: {len(train_frame.columns)}"),
            ("info", f"Test columns: {len(test_frame.columns)}"),
        ]
        return BlockResult(
            outputs={"train": train_value, "test": test_value},
            summary=summary,
            logs=tuple(info_logs + logs),
        )
