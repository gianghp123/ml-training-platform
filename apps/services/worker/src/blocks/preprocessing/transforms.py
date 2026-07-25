"""Preprocessing executors for the active block catalog."""

from __future__ import annotations

from typing import Any, Mapping

import numpy as np
import pandas as pd
from pandas.api.types import is_bool_dtype, is_float_dtype, is_integer_dtype
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import (
    MinMaxScaler,
    OneHotEncoder,
    RobustScaler,
    StandardScaler,
)

from ...runtime import BlockContext, BlockExecutionError, BlockResult, DatasetValue
from ..base import Block
from ..utils import (
    enum_value,
    parse_mapping,
    parse_string_list,
    require_columns,
    require_dataset,
    require_numeric,
)


def _dataset_result(
    value: DatasetValue,
    logs: tuple[tuple[str, str], ...] = (),
) -> BlockResult:
    return BlockResult(outputs={"dataset": value}, summary=value.summary(), logs=logs)


class NormalizeBlock(Block):
    executor_key = "normalize"
    version = 3

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        columns = parse_string_list(config.get("columns"), field_name="columns")
        require_numeric(dataset.frame, columns)
        method = enum_value(
            config.get("method"),
            field_name="method",
            choices=("MinMax", "Standard", "Robust"),
            default="Standard",
        )
        scaler = {
            "MinMax": MinMaxScaler(),
            "Standard": StandardScaler(),
            "Robust": RobustScaler(),
        }[method]
        frame = dataset.frame.copy(deep=True)
        try:
            transformed = scaler.fit_transform(frame.loc[:, columns])
            for index, column in enumerate(columns):
                # Scaling always produces floating-point values. Explicitly
                # replace each Series so integer inputs are not assigned
                # through pandas' lossy in-place dtype path.
                frame[column] = transformed[:, index].astype(float)
        except ValueError as exc:
            raise BlockExecutionError(f"Normalization failed: {exc}") from exc
        value = dataset.derive(frame=frame, lineage_node=context.node_id)
        return BlockResult(
            outputs={"dataset": value},
            summary=value.summary(),
            logs=(("info", f"Applied {method} normalization to {len(columns)} columns"),),
        )


class EncodeBlock(Block):
    executor_key = "encode"
    version = 1

    @staticmethod
    def _deterministic_categories(series: pd.Series, column: str) -> list[Any]:
        if series.isnull().any():
            raise BlockExecutionError(
                f"Column {column!r} contains missing values; impute it before encoding"
            )
        try:
            return sorted(series.unique().tolist())
        except TypeError:
            return sorted(series.unique().tolist(), key=lambda item: str(item))

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        columns = parse_string_list(config.get("columns"), field_name="columns")
        require_columns(dataset.frame, columns)
        strategy = enum_value(
            config.get("strategy"),
            field_name="strategy",
            choices=("OneHot", "Label", "Ordinal"),
            default="OneHot",
        )
        frame = dataset.frame.copy(deep=True)
        if strategy == "OneHot":
            categories = [
                self._deterministic_categories(frame[column], column)
                for column in columns
            ]
            encoder = OneHotEncoder(
                categories=categories,
                sparse_output=False,
                handle_unknown="error",
                dtype=np.int64,
            )
            encoded = encoder.fit_transform(frame.loc[:, columns])
            encoded_columns = [
                str(column) for column in encoder.get_feature_names_out(columns)
            ]
            retained = frame.drop(columns=columns)
            collisions = sorted(set(retained.columns).intersection(encoded_columns))
            if collisions:
                raise BlockExecutionError(
                    "One-hot output columns collide with existing columns: "
                    + ", ".join(collisions)
                )
            frame = pd.concat(
                [
                    retained.reset_index(drop=True),
                    pd.DataFrame(encoded, columns=encoded_columns),
                ],
                axis=1,
            )
            if dataset.target in columns:
                raise BlockExecutionError(
                    "OneHot encoding the selected target is not supported; "
                    "use Label or Ordinal encoding"
                )
        else:
            for column in columns:
                categories = self._deterministic_categories(frame[column], column)
                mapping = {value: index for index, value in enumerate(categories)}
                frame[column] = frame[column].map(mapping).astype("int64")
        value = dataset.derive(frame=frame, lineage_node=context.node_id)
        return BlockResult(
            outputs={"dataset": value},
            summary=value.summary(),
            logs=(("info", f"Applied {strategy} encoding to {len(columns)} columns"),),
        )


class ImputeMissingBlock(Block):
    executor_key = "impute_missing"
    version = 1

    @staticmethod
    def _coerce_constant(series: pd.Series, raw: Any) -> Any:
        if raw is None:
            raise BlockExecutionError(
                "constantValue is required when strategy is Constant"
            )
        try:
            if is_bool_dtype(series.dtype):
                if isinstance(raw, bool):
                    return raw
                normalized = str(raw).strip().lower()
                if normalized in {"true", "1", "yes"}:
                    return True
                if normalized in {"false", "0", "no"}:
                    return False
                raise ValueError
            if is_integer_dtype(series.dtype):
                number = float(raw)
                if not number.is_integer():
                    raise ValueError
                return int(number)
            if is_float_dtype(series.dtype):
                return float(raw)
            return str(raw)
        except (TypeError, ValueError) as exc:
            raise BlockExecutionError(
                f"constantValue {raw!r} is incompatible with column {series.name!r}"
            ) from exc

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        columns = parse_string_list(config.get("columns"), field_name="columns")
        require_columns(dataset.frame, columns)
        strategy = enum_value(
            config.get("strategy"),
            field_name="strategy",
            choices=("Mean", "Median", "Mode", "Constant"),
            default="Mode",
        )
        if strategy in {"Mean", "Median"}:
            require_numeric(dataset.frame, columns)
        frame = dataset.frame.copy(deep=True)
        for column in columns:
            sklearn_strategy = {
                "Mean": "mean",
                "Median": "median",
                "Mode": "most_frequent",
                "Constant": "constant",
            }[strategy]
            fill_value = (
                self._coerce_constant(frame[column], config.get("constantValue"))
                if strategy == "Constant"
                else None
            )
            imputer = SimpleImputer(
                strategy=sklearn_strategy,
                fill_value=fill_value,
                keep_empty_features=True,
            )
            try:
                frame[column] = imputer.fit_transform(frame[[column]]).ravel()
            except ValueError as exc:
                raise BlockExecutionError(
                    f"Could not impute column {column!r}: {exc}"
                ) from exc
        value = dataset.derive(frame=frame, lineage_node=context.node_id)
        return BlockResult(
            outputs={"dataset": value},
            summary=value.summary(),
            logs=(("info", f"Imputed {len(columns)} columns using {strategy}"),),
        )


class FeatureSelectBlock(Block):
    executor_key = "feature_select"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        columns = parse_string_list(config.get("columns"), field_name="columns")
        require_columns(dataset.frame, columns)
        if dataset.target and dataset.target not in columns:
            raise BlockExecutionError(
                f"Selected target column {dataset.target!r} must remain in the dataset"
            )
        value = dataset.derive(
            frame=dataset.frame.loc[:, columns].copy(),
            lineage_node=context.node_id,
        )
        removed = [c for c in dataset.frame.columns if c not in columns]
        logs: tuple[tuple[str, str], ...] = (
            ("info", f"Kept {len(columns)} of {len(dataset.frame.columns)} columns"),
            ("info", f"Selected: {', '.join(columns)}"),
        )
        if removed:
            logs = logs + (("info", f"Dropped: {', '.join(removed)}"),)
        if value.target:
            logs = logs + (("info", f"Target preserved: {value.target!r}"),)
        return _dataset_result(value, logs)


class SelectTargetBlock(Block):
    executor_key = "select_target"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        task = enum_value(
            config.get("task"),
            field_name="task",
            choices=("classification", "regression", "clustering"),
        )
        target = str(config.get("targetColumn") or "").strip() or None
        if task in {"classification", "regression"}:
            if target is None:
                raise BlockExecutionError(
                    f"targetColumn is required for task {task!r}"
                )
            require_columns(dataset.frame, [target])
        else:
            target = None
        value = dataset.derive(
            target=target,
            task=task,
            lineage_node=context.node_id,
        )
        logs: tuple[tuple[str, str], ...] = (
            ("info", f"Task: {task}"),
            ("info", f"Shape preserved: {len(value.frame)} rows x {len(value.frame.columns)} columns"),
        )
        if target is not None:
            logs = logs + (
                ("info", f"Target column: {target!r}"),
                ("info", f"Unique target values: {value.frame[target].nunique()}"),
            )
        else:
            logs = logs + (("info", "Target column: <none> (clustering)"),)
        return _dataset_result(value, logs)


class RenameColumnsBlock(Block):
    executor_key = "rename_columns"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        mapping = parse_mapping(config.get("mapping"))
        require_columns(dataset.frame, list(mapping))
        result_columns = [
            mapping.get(str(column), str(column)) for column in dataset.frame.columns
        ]
        duplicates = sorted(
            {column for column in result_columns if result_columns.count(column) > 1}
        )
        if duplicates:
            raise BlockExecutionError(
                "Rename mapping creates duplicate columns: " + ", ".join(duplicates)
            )
        frame = dataset.frame.rename(columns=mapping).copy()
        target = mapping.get(dataset.target, dataset.target) if dataset.target else None
        value = dataset.derive(
            frame=frame,
            target=target,
            lineage_node=context.node_id,
        )
        return _dataset_result(value)


class ConcatFeaturesBlock(Block):
    executor_key = "concat_features"
    version = 1

    @staticmethod
    def _compatible(left: str | None, right: str | None, name: str) -> str | None:
        if left is not None and right is not None and left != right:
            raise BlockExecutionError(
                f"Concat input {name} values are incompatible: {left!r} vs {right!r}"
            )
        return left if left is not None else right

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        left = require_dataset(inputs, "datasetA")
        right = require_dataset(inputs, "datasetB")
        if len(left.frame) != len(right.frame):
            raise BlockExecutionError(
                "Concat input datasets must contain the same number of rows"
            )
        collisions = sorted(set(left.frame.columns).intersection(right.frame.columns))
        if collisions:
            raise BlockExecutionError(
                "Concat input column names collide: " + ", ".join(collisions)
            )
        task = self._compatible(left.task, right.task, "task")
        target = self._compatible(left.target, right.target, "target")
        role = self._compatible(left.role, right.role, "role") or "full"
        frame = pd.concat(
            [
                left.frame.reset_index(drop=True),
                right.frame.reset_index(drop=True),
            ],
            axis=1,
        )
        lineage = tuple(dict.fromkeys((*left.lineage, *right.lineage, context.node_id)))
        value = DatasetValue(
            frame=frame,
            target=target,
            task=task,
            role=role,
            lineage=lineage,
        )
        return _dataset_result(value)
