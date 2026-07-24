"""Explicit model serialization executor."""

from __future__ import annotations

import io
import pickle
from typing import Any, Mapping

import joblib
import sklearn

from ...runtime import (
    BlockContext,
    BlockExecutionError,
    BlockResult,
    PendingArtifact,
    SavedModelValue,
)
from ..base import Block
from ..utils import enum_value, require_model, safe_artifact_name


class SaveModelBlock(Block):
    executor_key = "save_model"
    version = 1

    @staticmethod
    def _serialize_onnx(model: Any) -> bytes:
        if model.algorithm == "KMeans":
            raise BlockExecutionError(
                "ONNX export is not supported for K-Means in catalog version 1"
            )
        if model.algorithm not in {"RandomForest", "LogisticRegression", "SVM"}:
            raise BlockExecutionError(
                f"ONNX export is not supported for algorithm {model.algorithm!r}"
            )
        try:
            from skl2onnx import convert_sklearn
            from skl2onnx.common.data_types import FloatTensorType

            initial_types = [
                (
                    "features",
                    FloatTensorType([None, len(model.feature_columns)]),
                )
            ]
            converted = convert_sklearn(
                model.estimator,
                initial_types=initial_types,
                target_opset=15,
            )
            return converted.SerializeToString()
        except BlockExecutionError:
            raise
        except Exception as exc:
            raise BlockExecutionError(f"ONNX export failed: {exc}") from exc

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        model = require_model(inputs)
        serialization_format = enum_value(
            config.get("format"),
            field_name="format",
            choices=("joblib", "pickle", "onnx"),
            default="joblib",
        )
        name = safe_artifact_name(config.get("name"))
        if serialization_format == "joblib":
            buffer = io.BytesIO()
            joblib.dump(model.estimator, buffer)
            data = buffer.getvalue()
            extension = "joblib"
            mime_type = "application/octet-stream"
        elif serialization_format == "pickle":
            data = pickle.dumps(model.estimator, protocol=pickle.HIGHEST_PROTOCOL)
            extension = "pkl"
            mime_type = "application/octet-stream"
        else:
            data = self._serialize_onnx(model)
            extension = "onnx"
            mime_type = "application/onnx"
        filename = f"{name}.{extension}"
        object_key = (
            f"runs/{context.run_id}/artifacts/{context.node_id}/{filename}"
        )
        storage_uri = context.storage.put_bytes(object_key, data, mime_type)
        metadata = {
            "algorithm": model.algorithm,
            "task": model.task,
            "featureColumns": list(model.feature_columns),
            "targetColumn": model.target_column,
            "format": serialization_format,
            "sklearnVersion": sklearn.__version__,
        }
        value = SavedModelValue(
            storage_uri=storage_uri,
            serialization_format=serialization_format,
            metadata=metadata,
        )
        artifact = PendingArtifact(
            name=filename,
            artifact_type="model",
            mime_type=mime_type,
            storage_uri=storage_uri,
            metadata=metadata,
        )
        return BlockResult(
            outputs={"savedModel": value},
            summary=value.summary(),
            artifacts=(artifact,),
            logs=(
                (
                    "info",
                    f"Saved {model.algorithm} model as {serialization_format}",
                ),
            ),
        )
