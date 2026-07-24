"""Validation and coercion helpers used by block implementations."""

from __future__ import annotations

import json
import re
from typing import Any, Mapping, Sequence, TypeVar

import pandas as pd
from pandas.api.types import is_numeric_dtype

from ..runtime import BlockExecutionError, DatasetValue, ModelValue

T = TypeVar("T")


def parse_string_list(
    value: Any,
    *,
    field_name: str,
    allow_empty: bool = False,
) -> list[str]:
    if value is None:
        result: list[str] = []
    elif isinstance(value, str):
        result = [item.strip() for item in value.split(",") if item.strip()]
    elif isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray)):
        result = [str(item).strip() for item in value if str(item).strip()]
    else:
        raise BlockExecutionError(
            f"{field_name} must be an array or comma-separated string"
        )
    result = list(dict.fromkeys(result))
    if not result and not allow_empty:
        raise BlockExecutionError(f"{field_name} must contain at least one value")
    return result


def parse_mapping(value: Any, *, field_name: str = "mapping") -> dict[str, str]:
    parsed = value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise BlockExecutionError(
                f"{field_name} must be a JSON object when provided as text"
            ) from exc
    if not isinstance(parsed, Mapping):
        raise BlockExecutionError(f"{field_name} must be an object")
    result = {str(key).strip(): str(item).strip() for key, item in parsed.items()}
    if not result or any(not key or not item for key, item in result.items()):
        raise BlockExecutionError(
            f"{field_name} must contain non-empty source and destination names"
        )
    return result


def require_dataset(
    inputs: Mapping[str, Any], port: str = "dataset"
) -> DatasetValue:
    value = inputs.get(port)
    if not isinstance(value, DatasetValue):
        raise BlockExecutionError(f"Input port {port!r} must contain a Dataset")
    return value


def require_model(inputs: Mapping[str, Any], port: str = "model") -> ModelValue:
    value = inputs.get(port)
    if not isinstance(value, ModelValue):
        raise BlockExecutionError(f"Input port {port!r} must contain a Model")
    return value


def require_columns(frame: pd.DataFrame, columns: Sequence[str]) -> None:
    missing = [column for column in columns if column not in frame.columns]
    if missing:
        raise BlockExecutionError(
            f"Columns do not exist in the input dataset: {', '.join(missing)}"
        )


def require_numeric(frame: pd.DataFrame, columns: Sequence[str]) -> None:
    require_columns(frame, columns)
    non_numeric = [
        column for column in columns if not is_numeric_dtype(frame[column])
    ]
    if non_numeric:
        raise BlockExecutionError(
            f"Columns must be numeric: {', '.join(non_numeric)}"
        )


def enum_value(
    value: Any,
    *,
    field_name: str,
    choices: Sequence[str],
    default: str | None = None,
) -> str:
    raw = default if value is None or str(value).strip() == "" else str(value)
    if raw is None:
        raise BlockExecutionError(f"{field_name} is required")
    by_lower = {choice.lower(): choice for choice in choices}
    try:
        return by_lower[raw.strip().lower()]
    except KeyError as exc:
        raise BlockExecutionError(
            f"{field_name} must be one of: {', '.join(choices)}"
        ) from exc


def positive_int(value: Any, *, field_name: str, default: int) -> int:
    raw = default if value is None or value == "" else value
    if isinstance(raw, bool):
        raise BlockExecutionError(f"{field_name} must be a positive integer")
    try:
        number = int(raw)
    except (TypeError, ValueError) as exc:
        raise BlockExecutionError(f"{field_name} must be a positive integer") from exc
    if number <= 0 or (isinstance(raw, float) and not raw.is_integer()):
        raise BlockExecutionError(f"{field_name} must be a positive integer")
    return number


def positive_float(value: Any, *, field_name: str, default: float) -> float:
    raw = default if value is None or value == "" else value
    if isinstance(raw, bool):
        raise BlockExecutionError(f"{field_name} must be a positive number")
    try:
        number = float(raw)
    except (TypeError, ValueError) as exc:
        raise BlockExecutionError(f"{field_name} must be a positive number") from exc
    if number <= 0:
        raise BlockExecutionError(f"{field_name} must be a positive number")
    return number


def boolean_value(value: Any, *, field_name: str, default: bool) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in {0, 1}:
        return bool(value)
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "on"}:
        return True
    if normalized in {"false", "0", "no", "off"}:
        return False
    raise BlockExecutionError(f"{field_name} must be a boolean")


def supervised_training_data(
    dataset: DatasetValue, *, allowed_tasks: Sequence[str]
) -> tuple[pd.DataFrame, pd.Series, tuple[str, ...]]:
    if dataset.role != "train":
        raise BlockExecutionError("Model input dataset must have role 'train'")
    if dataset.task not in allowed_tasks:
        raise BlockExecutionError(
            f"Model supports tasks: {', '.join(allowed_tasks)}"
        )
    if not dataset.target or dataset.target not in dataset.frame.columns:
        raise BlockExecutionError("A valid target column must be selected")
    feature_columns = tuple(
        str(column) for column in dataset.frame.columns if column != dataset.target
    )
    if not feature_columns:
        raise BlockExecutionError("Dataset has no feature columns")
    features = dataset.frame.loc[:, list(feature_columns)]
    require_numeric(features, feature_columns)
    if features.isnull().any().any():
        raise BlockExecutionError(
            "Model features contain missing values; add an imputation block"
        )
    target = dataset.frame[dataset.target]
    if target.isnull().any():
        raise BlockExecutionError("Target column contains missing values")
    return features, target, feature_columns


def safe_artifact_name(value: Any, *, default: str | None = None) -> str:
    raw = str(value or default or "").strip()
    if not raw:
        raise BlockExecutionError("name is required")
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "-", raw).strip(".-_")
    if not sanitized:
        raise BlockExecutionError("name does not contain any safe filename characters")
    return sanitized[:120]


def nested_options(
    descriptor: Mapping[str, Any], format_name: str
) -> Mapping[str, Any]:
    options = descriptor.get("validationOptions") or descriptor.get(
        "validation_options"
    )
    if not isinstance(options, Mapping):
        return {}
    nested = options.get(format_name)
    return nested if isinstance(nested, Mapping) else options
