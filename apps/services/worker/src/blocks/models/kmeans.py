"""K-Means catalog executor."""

from __future__ import annotations

from typing import Any, Mapping

from sklearn.cluster import KMeans

from ...runtime import BlockContext, BlockExecutionError, BlockResult, ModelValue
from ..base import Block
from ..utils import positive_int, require_dataset, require_numeric


class KMeansBlock(Block):
    executor_key = "kmeans"
    version = 1

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset = require_dataset(inputs)
        if dataset.task != "clustering":
            raise BlockExecutionError("K-Means requires task 'clustering'")
        if dataset.target is not None:
            raise BlockExecutionError("K-Means input must not have a target column")
        feature_columns = tuple(str(column) for column in dataset.frame.columns)
        if not feature_columns:
            raise BlockExecutionError("Dataset has no feature columns")
        require_numeric(dataset.frame, feature_columns)
        if dataset.frame.isnull().any().any():
            raise BlockExecutionError(
                "K-Means features contain missing values; add an imputation block"
            )
        n_clusters = positive_int(
            config.get("n_clusters"), field_name="n_clusters", default=3
        )
        if n_clusters > len(dataset.frame):
            raise BlockExecutionError(
                "n_clusters cannot exceed the number of input rows"
            )
        estimator = KMeans(
            n_clusters=n_clusters,
            n_init="auto",
            random_state=42,
        )
        try:
            estimator.fit(dataset.frame.loc[:, list(feature_columns)])
        except ValueError as exc:
            raise BlockExecutionError(f"K-Means training failed: {exc}") from exc
        value = ModelValue(
            estimator=estimator,
            algorithm="KMeans",
            task="clustering",
            feature_columns=feature_columns,
            target_column=None,
        )
        return BlockResult(outputs={"model": value}, summary=value.summary())
