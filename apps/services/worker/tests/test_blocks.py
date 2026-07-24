from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

from src.blocks.data_source import LoadCsvBlock, LoadJsonBlock, LoadXmlBlock
from src.blocks.data_split import TrainTestSplitBlock
from src.blocks.evaluation import EvaluateBlock
from src.blocks.model_persistence import SaveModelBlock
from src.blocks.models import (
    KMeansBlock,
    LogisticRegressionBlock,
    RandomForestBlock,
    SvmBlock,
)
from src.blocks.preprocessing import (
    ConcatFeaturesBlock,
    EncodeBlock,
    FeatureSelectBlock,
    ImputeMissingBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)
from src.runtime import BlockExecutionError, DatasetValue, ModelValue


@pytest.mark.parametrize(
    ("block", "format_name", "payload", "options", "expected"),
    [
        (
            LoadCsvBlock(),
            "csv",
            b"a;b\n1;2\n3;4\n",
            {"csv": {"delimiter": ";", "hasHeader": True}},
            ["a", "b"],
        ),
        (
            LoadJsonBlock(),
            "json",
            b'{"data":{"items":[{"a":1,"nested":{"b":2}}]}}',
            {"json": {"recordsPath": "data.items"}},
            ["a", "nested.b"],
        ),
        (
            LoadXmlBlock(),
            "xml",
            b"<root><row><a>1</a><nested><b>2</b></nested></row></root>",
            {"xml": {"recordElement": "row"}},
            ["a", "nested.b"],
        ),
    ],
)
def test_loaders_success(
    block, format_name, payload, options, expected, storage, context_factory
):
    object_key = f"datasets/example.{format_name}"
    storage.objects[object_key] = payload
    context = context_factory(
        datasets={
            "dataset-1": {
                "id": "dataset-1",
                "format": format_name,
                "storageUri": object_key,
                "validationOptions": options,
            }
        }
    )

    result = block.execute(context, {}, {"dataset": "dataset-1"})

    assert list(result.outputs["dataset"].frame.columns) == expected
    assert result.outputs["dataset"].role == "full"


@pytest.mark.parametrize(
    "block",
    [LoadCsvBlock(), LoadJsonBlock(), LoadXmlBlock()],
)
def test_loaders_reject_wrong_format(block, context_factory):
    context = context_factory(
        datasets={
            "dataset-1": {
                "id": "dataset-1",
                "format": "parquet",
                "storageUri": "bad",
            }
        }
    )
    with pytest.raises(BlockExecutionError, match="requires"):
        block.execute(context, {}, {"dataset": "dataset-1"})


def test_normalize_success_and_invalid(context_factory):
    block = NormalizeBlock()
    dataset = DatasetValue(pd.DataFrame({"a": [1, 2], "b": ["x", "y"]}))
    result = block.execute(
        context_factory(), {"dataset": dataset}, {"columns": "a", "method": "Standard"}
    )
    assert result.outputs["dataset"].frame["a"].round(5).tolist() == [-1.0, 1.0]
    with pytest.raises(BlockExecutionError, match="numeric"):
        block.execute(
            context_factory(), {"dataset": dataset}, {"columns": "b", "method": "Standard"}
        )


def test_encode_success_and_invalid(context_factory):
    block = EncodeBlock()
    dataset = DatasetValue(pd.DataFrame({"kind": ["b", "a", "b"], "n": [1, 2, 3]}))
    first = block.execute(
        context_factory(), {"dataset": dataset}, {"columns": "kind", "strategy": "OneHot"}
    ).outputs["dataset"]
    second = block.execute(
        context_factory(), {"dataset": dataset}, {"columns": ["kind"], "strategy": "OneHot"}
    ).outputs["dataset"]
    assert list(first.frame.columns) == ["n", "kind_a", "kind_b"]
    pd.testing.assert_frame_equal(first.frame, second.frame)
    with pytest.raises(BlockExecutionError, match="do not exist"):
        block.execute(
            context_factory(), {"dataset": dataset}, {"columns": "missing", "strategy": "Label"}
        )


def test_impute_success_and_invalid(context_factory):
    block = ImputeMissingBlock()
    dataset = DatasetValue(pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": ["x", None, "y"]}))
    result = block.execute(
        context_factory(), {"dataset": dataset}, {"columns": "a", "strategy": "Mean"}
    )
    assert result.outputs["dataset"].frame["a"].tolist() == [1.0, 2.0, 3.0]
    with pytest.raises(BlockExecutionError, match="numeric"):
        block.execute(
            context_factory(), {"dataset": dataset}, {"columns": "b", "strategy": "Mean"}
        )


def test_feature_selection_success_and_invalid(context_factory):
    block = FeatureSelectBlock()
    dataset = DatasetValue(
        pd.DataFrame({"a": [1], "b": [2], "target": [0]}),
        target="target",
        task="classification",
    )
    result = block.execute(
        context_factory(), {"dataset": dataset}, {"columns": "b,target"}
    )
    assert list(result.outputs["dataset"].frame.columns) == ["b", "target"]
    with pytest.raises(BlockExecutionError, match="must remain"):
        block.execute(context_factory(), {"dataset": dataset}, {"columns": "a,b"})


def test_select_target_success_and_invalid(context_factory):
    block = SelectTargetBlock()
    dataset = DatasetValue(pd.DataFrame({"x": [1], "y": ["a"]}))
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {"targetColumn": "y", "task": "classification"},
    )
    assert result.outputs["dataset"].target == "y"
    with pytest.raises(BlockExecutionError, match="required"):
        block.execute(
            context_factory(), {"dataset": dataset}, {"task": "regression"}
        )


def test_rename_success_and_invalid(context_factory):
    block = RenameColumnsBlock()
    dataset = DatasetValue(
        pd.DataFrame({"a": [1], "target": [0]}),
        target="target",
        task="classification",
    )
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {"mapping": '{"target":"label"}'},
    )
    assert list(result.outputs["dataset"].frame.columns) == ["a", "label"]
    assert result.outputs["dataset"].target == "label"
    with pytest.raises(BlockExecutionError, match="duplicate"):
        block.execute(
            context_factory(),
            {"dataset": dataset},
            {"mapping": {"a": "target"}},
        )


def test_concat_success_and_invalid(context_factory):
    block = ConcatFeaturesBlock()
    left = DatasetValue(pd.DataFrame({"a": [1, 2]}), task="clustering")
    right = DatasetValue(pd.DataFrame({"b": [3, 4]}), task="clustering")
    result = block.execute(
        context_factory(), {"datasetA": left, "datasetB": right}, {}
    )
    assert list(result.outputs["dataset"].frame.columns) == ["a", "b"]
    with pytest.raises(BlockExecutionError, match="same number"):
        block.execute(
            context_factory(),
            {
                "datasetA": left,
                "datasetB": DatasetValue(pd.DataFrame({"c": [1]}), task="clustering"),
            },
            {},
        )


def test_split_is_deterministic_and_rejects_size(
    classification_dataset, context_factory
):
    block = TrainTestSplitBlock()
    config = {"testSize": 0.25, "stratify": True}
    first = block.execute(
        context_factory(), {"dataset": classification_dataset}, config
    )
    second = block.execute(
        context_factory(), {"dataset": classification_dataset}, config
    )
    pd.testing.assert_frame_equal(
        first.outputs["train"].frame, second.outputs["train"].frame
    )
    assert first.outputs["train"].role == "train"
    assert first.outputs["test"].role == "test"
    with pytest.raises(BlockExecutionError, match="between"):
        block.execute(
            context_factory(),
            {"dataset": classification_dataset},
            {"testSize": 0.9},
        )


@pytest.mark.parametrize(
    ("block", "config"),
    [
        (RandomForestBlock(), {"n_estimators": 5, "max_depth": 3}),
        (LogisticRegressionBlock(), {"penalty": "l2", "C": 1.0}),
        (SvmBlock(), {"kernel": "linear", "C": 1.0}),
    ],
)
def test_classification_models_success_and_invalid_role(
    block, config, classification_dataset, context_factory
):
    first = block.execute(
        context_factory(), {"dataset": classification_dataset}, config
    ).outputs["model"]
    second = block.execute(
        context_factory(), {"dataset": classification_dataset}, config
    ).outputs["model"]
    features = classification_dataset.frame[["f1", "f2"]]
    assert first.estimator.predict(features).tolist() == second.estimator.predict(features).tolist()
    invalid = classification_dataset.derive(role="test")
    with pytest.raises(BlockExecutionError, match="role"):
        block.execute(context_factory(), {"dataset": invalid}, config)


@pytest.mark.parametrize(
    ("block", "config"),
    [
        (RandomForestBlock(), {"n_estimators": 5, "max_depth": 3}),
        (SvmBlock(), {"kernel": "linear", "C": 1.0}),
    ],
)
def test_regression_model_variants(
    block, config, regression_dataset, context_factory
):
    result = block.execute(
        context_factory(), {"dataset": regression_dataset}, config
    )
    assert result.outputs["model"].task == "regression"


def test_kmeans_success_and_invalid(context_factory):
    block = KMeansBlock()
    dataset = DatasetValue(
        pd.DataFrame({"x": [0.0, 0.1, 5.0, 5.1], "y": [0.0, 0.1, 5.0, 5.2]}),
        task="clustering",
        role="train",
    )
    result = block.execute(
        context_factory(), {"dataset": dataset}, {"n_clusters": 2}
    )
    assert len(result.outputs["model"].estimator.cluster_centers_) == 2
    with pytest.raises(BlockExecutionError, match="requires task"):
        block.execute(
            context_factory(),
            {"dataset": dataset.derive(task="classification")},
            {"n_clusters": 2},
        )


def test_evaluate_classification_persists_metrics(
    classification_dataset, context_factory, storage
):
    model = RandomForestBlock().execute(
        context_factory(),
        {"dataset": classification_dataset},
        {"n_estimators": 10, "max_depth": 4},
    ).outputs["model"]
    test_dataset = classification_dataset.derive(role="test")
    result = EvaluateBlock().execute(
        context_factory(node_id="evaluate"),
        {"model": model, "dataset": test_dataset},
        {"metrics": ""},
    )
    assert result.summary["metrics"]["accuracy"] >= 0.9
    assert len(result.summary["confusionMatrix"]["matrix"]) == 3
    assert json.loads(storage.objects[result.artifacts[0].storage_uri]) == result.summary
    with pytest.raises(BlockExecutionError, match="role"):
        EvaluateBlock().execute(
            context_factory(), {"model": model, "dataset": classification_dataset}, {}
        )


def test_evaluate_regression_and_clustering(
    regression_dataset, context_factory
):
    regression_model = RandomForestBlock().execute(
        context_factory(),
        {"dataset": regression_dataset},
        {"n_estimators": 5, "max_depth": 3},
    ).outputs["model"]
    regression_test = regression_dataset.derive(role="test")
    regression = EvaluateBlock().execute(
        context_factory(),
        {"model": regression_model, "dataset": regression_test},
        {},
    )
    assert set(regression.summary["metrics"]) == {"mae", "mse", "rmse", "r2"}

    cluster_train = DatasetValue(
        pd.DataFrame({"x": [0.0, 0.1, 5.0, 5.1], "y": [0.0, 0.2, 5.0, 5.2]}),
        task="clustering",
        role="train",
    )
    cluster_model = KMeansBlock().execute(
        context_factory(), {"dataset": cluster_train}, {"n_clusters": 2}
    ).outputs["model"]
    cluster_test = cluster_train.derive(role="test")
    clustering = EvaluateBlock().execute(
        context_factory(),
        {"model": cluster_model, "dataset": cluster_test},
        {},
    )
    assert set(clustering.summary["metrics"]) == {"silhouette", "inertia"}


def test_save_model_success_and_invalid_onnx(
    classification_dataset, context_factory, storage
):
    model = LogisticRegressionBlock().execute(
        context_factory(),
        {"dataset": classification_dataset},
        {"penalty": "l2", "C": 1.0},
    ).outputs["model"]
    result = SaveModelBlock().execute(
        context_factory(node_id="save"),
        {"model": model},
        {"format": "joblib", "name": "iris model"},
    )
    assert result.outputs["savedModel"].storage_uri.endswith("iris-model.joblib")
    assert result.artifacts[0].storage_uri in storage.objects

    kmeans = ModelValue(
        estimator=object(),
        algorithm="KMeans",
        task="clustering",
        feature_columns=("x",),
    )
    with pytest.raises(BlockExecutionError, match="not supported"):
        SaveModelBlock().execute(
            context_factory(),
            {"model": kmeans},
            {"format": "onnx", "name": "cluster"},
        )
