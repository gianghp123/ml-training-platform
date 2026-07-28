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

from ...dsl.expression import cast_to_output_type, evaluate_expression
from ...runtime import BlockContext, BlockExecutionError, BlockResult, DatasetValue
from ..base import Block
from ..utils import (
    enum_value,
    parse_mapping,
    parse_string_list,
    require_columns,
    require_dataset,
    require_no_nulls,
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
        require_no_nulls(dataset.frame, columns, block_name="Normalization")
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
        require_no_nulls(series.to_frame(), [column], block_name="Encoding")
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


class FilterRowsBlock(Block):
    executor_key = "filter_rows"
    version = 1

    _NO_VALUE_OPS = {"isNull", "isNotNull"}

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        conditions = config.get("conditions")
        if not isinstance(conditions, list) or len(conditions) == 0:
            raise BlockExecutionError("At least one filter condition is required.")
        combinator = enum_value(
            config.get("combinator"),
            field_name="combinator",
            choices=("AND", "OR"),
            default="AND",
        )
        invert = bool(config.get("invert", False))
        frame = dataset.frame

        masks: list[pd.Series] = []
        for index, raw in enumerate(conditions):
            label = f"Condition {index + 1}"
            if not isinstance(raw, Mapping):
                raise BlockExecutionError(f"{label}: must be an object.")
            column = str(raw.get("column") or "").strip()
            if not column:
                raise BlockExecutionError(f"{label}: 'column' is required.")
            if column not in frame.columns:
                raise BlockExecutionError(
                    f"{label}: column {column!r} does not exist in the input dataset."
                )
            op = str(raw.get("op") or "").strip()
            mask = self._apply_condition(frame[column], column, op, raw.get("value"), label)
            masks.append(mask)

        joined = masks[0]
        for mask in masks[1:]:
            joined = joined & mask if combinator == "AND" else joined | mask
        if invert:
            joined = ~joined
        result = frame.loc[joined].copy()
        value = dataset.derive(frame=result, lineage_node=context.node_id)
        return _dataset_result(
            value,
            (
                ("info", f"Rows in: {len(frame)}"),
                ("info", f"Rows out: {len(result)}"),
            ),
        )

    def _apply_condition(
        self, series: pd.Series, column: str, op: str, value: Any, label: str
    ) -> pd.Series:
        if op == "isNull":
            return series.isna()
        if op == "isNotNull":
            return series.notna()
        if op == "eq":
            return series == value
        if op == "ne":
            return series != value
        if op == "gt":
            return series > value
        if op == "gte":
            return series >= value
        if op == "lt":
            return series < value
        if op == "lte":
            return series <= value
        if op == "contains":
            if not pd.api.types.is_string_dtype(series):
                raise BlockExecutionError(
                    f"{label}: 'contains' requires a string column; {column!r} is not text."
                )
            return series.astype(str).str.contains(str(value), na=False)
        if op == "in":
            if not isinstance(value, (list, tuple)):
                raise BlockExecutionError(f"{label}: 'in' requires an array value.")
            return series.isin(list(value))
        raise BlockExecutionError(f"{label}: unsupported operator {op!r}.")


class CustomFeatureFormulaBlock(Block):
    executor_key = "custom_feature_formula"
    version = 1

    _OUTPUT_TYPES = ("float", "int", "boolean")

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        output_column = str(config.get("outputColumn") or "").strip()
        if not output_column:
            raise BlockExecutionError("outputColumn is required.")
        if output_column in dataset.frame.columns:
            raise BlockExecutionError(
                f"Output column {output_column!r} already exists in the input dataset (collision)."
            )
        expression = config.get("expression")
        if not isinstance(expression, str) or not expression.strip():
            raise BlockExecutionError("expression is required.")
        output_type = str(config.get("outputType") or "float").strip()
        if output_type not in self._OUTPUT_TYPES:
            raise BlockExecutionError(
                f"outputType must be one of: {', '.join(self._OUTPUT_TYPES)}."
            )

        evaluated = evaluate_expression(expression, dataset.frame)
        appended = cast_to_output_type(evaluated, output_type)
        appended.name = output_column
        new_frame = dataset.frame.copy()
        new_frame[output_column] = appended
        value = dataset.derive(frame=new_frame, lineage_node=context.node_id)
        return _dataset_result(
            value,
            (("info", f"Added column {output_column!r} ({output_type}) via formula"),),
        )


class FeatureUnionBlock(Block):
    executor_key = "feature_union"
    version = 1

    _PORT_ORDER = ("datasetA", "datasetB", "datasetC", "datasetD")

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        connected: list[DatasetValue] = []
        for port in self._PORT_ORDER:
            value = inputs.get(port)
            if isinstance(value, DatasetValue):
                connected.append(value)

        if len(connected) < 2:
            raise BlockExecutionError(
                "Feature Union requires at least 2 connected inputs; got "
                f"{len(connected)}."
            )

        first = connected[0]
        expected_rows = len(first.frame)
        for dataset in connected[1:]:
            if len(dataset.frame) != expected_rows:
                raise BlockExecutionError(
                    "Feature Union input datasets must have matching row counts: "
                    f"{expected_rows} vs {len(dataset.frame)}."
                )

        ordered_columns: list[str] = []
        for dataset in connected:
            for col in dataset.frame.columns:
                if col not in ordered_columns:
                    ordered_columns.append(col)
        if not ordered_columns:
            return _dataset_result(connected[0].derive(frame=connected[0].frame.iloc[:0].copy()), (("info", "Feature Union: no columns to merge"),))

        first_df = connected[0].frame.reset_index(drop=True)
        merged = pd.DataFrame(index=range(len(first_df)))
        for col in ordered_columns:
            for dataset in connected:
                if col in dataset.frame.columns:
                    merged[col] = dataset.frame[col].reset_index(drop=True).values
                    break

        target = next(
            (d.target for d in connected if d.target is not None),
            None,
        )
        task = next(
            (d.task for d in connected if d.task is not None),
            None,
        )
        role = first.role
        all_lineage: list[str] = []
        for d in connected:
            all_lineage.extend(d.lineage)
        all_lineage.append(context.node_id)
        lineage = tuple(dict.fromkeys(all_lineage))
        value = DatasetValue(
            frame=merged,
            target=target,
            task=task,
            role=role,
            lineage=lineage,
        )
        return _dataset_result(
            value,
            (
                ("info", f"Merged {len(connected)} branches"),
                ("info", f"Columns: {', '.join(merged.columns)}"),
                ("info", f"Rows: {len(merged)}"),
            ),
        )


class JoinDatasetsBlock(Block):
    executor_key = "join_datasets"
    version = 1

    _STRATEGIES = ("inner", "left", "right", "full")

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        left = require_dataset(inputs, "left")
        right = require_dataset(inputs, "right")
        keys = parse_string_list(config.get("keys"), field_name="keys")
        if not keys:
            raise BlockExecutionError("At least one join key is required.")
        strategy = enum_value(
            config.get("strategy"),
            field_name="strategy",
            choices=self._STRATEGIES,
            default="inner",
        )

        for key in keys:
            if key not in left.frame.columns:
                raise BlockExecutionError(
                    f"Join key {key!r} is missing from the left input."
                )
            if key not in right.frame.columns:
                raise BlockExecutionError(
                    f"Join key {key!r} is missing from the right input."
                )
        non_key_left = [c for c in left.frame.columns if c not in keys]
        collisions = [c for c in non_key_left if c in right.frame.columns]
        if collisions:
            raise BlockExecutionError(
                "Non-key columns collide between the two inputs: "
                + ", ".join(repr(c) for c in collisions)
                + ". Rename them before joining."
            )

        merged = pd.merge(
            left.frame, right.frame, on=keys, how=strategy
        )
        value = DatasetValue(
            frame=merged,
            target=left.target,
            task=left.task,
            role=left.role,
            lineage=tuple(dict.fromkeys((*left.lineage, *right.lineage, context.node_id))),
        )
        return _dataset_result(
            value,
            (
                ("info", f"Joined on {', '.join(keys)} using {strategy} strategy"),
                ("info", f"Rows in: left={len(left.frame)} right={len(right.frame)}"),
                ("info", f"Rows out: {len(merged)}"),
            ),
        )
