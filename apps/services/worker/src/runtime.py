"""Runtime value objects shared by block executors and the DAG runner."""

from __future__ import annotations

import math
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Mapping, Protocol

import numpy as np
import pandas as pd


JSON = dict[str, Any]


class PipelineError(RuntimeError):
    """Base class for predictable pipeline failures."""


class JobValidationError(PipelineError):
    """The queued job does not conform to the versioned worker contract."""


class GraphValidationError(PipelineError):
    """The graph cannot be executed safely."""


class BlockExecutionError(PipelineError):
    """A block received invalid configuration or runtime inputs."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat().replace("+00:00", "Z")


def json_safe(value: Any) -> Any:
    """Convert numpy/pandas values into strict JSON-compatible values."""

    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, np.generic):
        return json_safe(value.item())
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.isoformat()
    if isinstance(value, Mapping):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, np.ndarray, pd.Index)):
        return [json_safe(item) for item in value]
    return str(value)


@dataclass(frozen=True)
class DatasetValue:
    frame: pd.DataFrame
    target: str | None = None
    task: str | None = None
    role: str = "full"
    lineage: tuple[str, ...] = ()

    def derive(
        self,
        *,
        frame: pd.DataFrame | None = None,
        target: str | None | object = ...,
        task: str | None | object = ...,
        role: str | None = None,
        lineage_node: str | None = None,
    ) -> "DatasetValue":
        next_lineage = self.lineage
        if lineage_node and (not next_lineage or next_lineage[-1] != lineage_node):
            next_lineage = (*next_lineage, lineage_node)
        return replace(
            self,
            frame=self.frame.copy(deep=True) if frame is None else frame,
            target=self.target if target is ... else target,
            task=self.task if task is ... else task,
            role=self.role if role is None else role,
            lineage=next_lineage,
        )

    def summary(self) -> JSON:
        return {
            "type": "dataset",
            "rows": int(len(self.frame)),
            "columns": [str(column) for column in self.frame.columns],
            "target": self.target,
            "task": self.task,
            "role": self.role,
        }


@dataclass(frozen=True)
class ModelValue:
    estimator: Any
    algorithm: str
    task: str
    feature_columns: tuple[str, ...]
    target_column: str | None = None

    def summary(self) -> JSON:
        return {
            "type": "model",
            "algorithm": self.algorithm,
            "task": self.task,
            "featureColumns": list(self.feature_columns),
            "targetColumn": self.target_column,
        }


@dataclass(frozen=True)
class MetricsValue:
    metrics: Mapping[str, float]
    confusion_matrix: Mapping[str, Any] | None = None

    def summary(self) -> JSON:
        result: JSON = {
            "type": "metrics",
            "metrics": json_safe(dict(self.metrics)),
        }
        if self.confusion_matrix is not None:
            result["confusionMatrix"] = json_safe(dict(self.confusion_matrix))
        return result


@dataclass(frozen=True)
class SavedModelValue:
    storage_uri: str
    serialization_format: str
    metadata: Mapping[str, Any]

    def summary(self) -> JSON:
        return {
            "type": "savedModel",
            "storageUri": self.storage_uri,
            "format": self.serialization_format,
            "metadata": json_safe(dict(self.metadata)),
        }


@dataclass(frozen=True)
class PendingArtifact:
    name: str
    artifact_type: str
    mime_type: str
    storage_uri: str
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class BlockResult:
    outputs: Mapping[str, Any]
    summary: Mapping[str, Any] = field(default_factory=dict)
    artifacts: tuple[PendingArtifact, ...] = ()
    logs: tuple[tuple[str, str], ...] = ()


class ObjectStorage(Protocol):
    bucket: str

    def get_bytes(self, object_key: str) -> bytes:
        ...

    def put_bytes(
        self, object_key: str, data: bytes, content_type: str
    ) -> str:
        ...


@dataclass(frozen=True)
class BlockContext:
    run_id: str
    node_id: str
    datasets: Mapping[str, Mapping[str, Any]]
    storage: ObjectStorage

    def dataset(self, dataset_id: str) -> Mapping[str, Any]:
        try:
            return self.datasets[dataset_id]
        except KeyError as exc:
            raise BlockExecutionError(
                f"Dataset {dataset_id!r} is not present in the execution job"
            ) from exc


def value_summary(value: Any) -> JSON:
    if hasattr(value, "summary") and callable(value.summary):
        return json_safe(value.summary())
    return {"type": type(value).__name__}


def summarize_outputs(outputs: Mapping[str, Any]) -> JSON:
    return {port: value_summary(value) for port, value in outputs.items()}
