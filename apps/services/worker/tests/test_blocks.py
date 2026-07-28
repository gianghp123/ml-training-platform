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
    CustomFeatureFormulaBlock,
    EncodeBlock,
    FeatureSelectBlock,
    FilterRowsBlock,
    ImputeMissingBlock,
    JoinDatasetsBlock,
    NormalizeBlock,
    RenameColumnsBlock,
    SelectTargetBlock,
)
from src.dsl.expression import ExpressionError
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


def test_filter_rows_basic_and_invert(context_factory):
    block = FilterRowsBlock()
    frame = pd.DataFrame({"age": [10, 20, 30, 40], "country": ["US", "US", "CA", "US"]})
    dataset = DatasetValue(frame=frame)
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {
            "conditions": [{"column": "age", "op": "gte", "value": 18}],
            "combinator": "AND",
            "invert": False,
        },
    )
    assert result.outputs["dataset"].frame["age"].tolist() == [20, 30, 40]

    result_inverted = block.execute(
        context_factory(),
        {"dataset": dataset},
        {
            "conditions": [{"column": "age", "op": "gte", "value": 18}],
            "combinator": "AND",
            "invert": True,
        },
    )
    assert result_inverted.outputs["dataset"].frame["age"].tolist() == [10]


def test_filter_rows_or_combinator(context_factory):
    block = FilterRowsBlock()
    frame = pd.DataFrame({"a": [1, 2, 3, 4]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {
            "conditions": [
                {"column": "a", "op": "eq", "value": 1},
                {"column": "a", "op": "eq", "value": 4},
            ],
            "combinator": "OR",
        },
    )
    assert result.outputs["dataset"].frame["a"].tolist() == [1, 4]


def test_filter_rows_is_null_and_in_ops(context_factory):
    block = FilterRowsBlock()
    frame = pd.DataFrame({"a": [1.0, None, 3.0, None], "b": ["x", "y", "z", "w"]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {
            "conditions": [{"column": "a", "op": "isNull"}],
            "combinator": "AND",
        },
    )
    assert len(result.outputs["dataset"].frame) == 2

    result_in = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {
            "conditions": [{"column": "b", "op": "in", "value": ["x", "z"]}],
            "combinator": "AND",
        },
    )
    assert sorted(result_in.outputs["dataset"].frame["b"].tolist()) == ["x", "z"]


def test_filter_rows_preserves_target_and_role(context_factory):
    block = FilterRowsBlock()
    frame = pd.DataFrame({"a": [1, 2, 3], "y": [0, 1, 0]})
    dataset = DatasetValue(frame=frame, target="y", task="classification", role="train")
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {
            "conditions": [{"column": "a", "op": "gte", "value": 2}],
        },
    )
    out = result.outputs["dataset"]
    assert out.target == "y"
    assert out.task == "classification"
    assert out.role == "train"
    assert out.frame["y"].tolist() == [1, 0]


def test_filter_rows_rejects_empty_conditions(context_factory):
    block = FilterRowsBlock()
    with pytest.raises(BlockExecutionError, match="[Aa]t least one"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"conditions": []},
        )


def test_filter_rows_rejects_unknown_column_at_runtime(context_factory):
    block = FilterRowsBlock()
    with pytest.raises(BlockExecutionError, match="[Cc]olumn"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"conditions": [{"column": "Nope", "op": "eq", "value": 1}]},
        )


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


def test_custom_feature_formula_basic_float(context_factory):
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"a": [10.0, 20.0, 30.0]})
    dataset = DatasetValue(frame=frame)
    result = block.execute(
        context_factory(),
        {"dataset": dataset},
        {"outputColumn": "ratio", "outputType": "float", "expression": "a / 2"},
    )
    assert "ratio" in result.outputs["dataset"].frame.columns
    assert result.outputs["dataset"].frame["ratio"].tolist() == pytest.approx([5.0, 10.0, 15.0])


def test_custom_feature_formula_boolean_column(context_factory):
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"age": [10, 20, 30]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {"outputColumn": "is_adult", "outputType": "boolean", "expression": "age >= 18"},
    )
    assert result.outputs["dataset"].frame["is_adult"].tolist() == [False, True, True]


def test_custom_feature_formula_int_with_nulls_uses_nullable_int(context_factory):
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"a": [1, 2, 3, 4]})
    result = block.execute(
        context_factory(),
        {"dataset": DatasetValue(frame=frame)},
        {"outputColumn": "a2", "outputType": "int", "expression": "a ** 2"},
    )
    series = result.outputs["dataset"].frame["a2"]
    assert series.tolist() == [1, 4, 9, 16]


def test_custom_feature_formula_rejects_missing_output_column(context_factory):
    block = CustomFeatureFormulaBlock()
    with pytest.raises(BlockExecutionError, match="outputColumn"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"outputColumn": "", "expression": "a + 1"},
        )


def test_custom_feature_formula_rejects_collision(context_factory):
    block = CustomFeatureFormulaBlock()
    frame = pd.DataFrame({"a": [1, 2]})
    with pytest.raises(BlockExecutionError, match="[Cc]ollision|[Ee]xists"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=frame)},
            {"outputColumn": "a", "expression": "a + 1"},
        )


def test_custom_feature_formula_rejects_unknown_column(context_factory):
    block = CustomFeatureFormulaBlock()
    with pytest.raises(ExpressionError, match="[Cc]olumn"):
        block.execute(
            context_factory(),
            {"dataset": DatasetValue(frame=pd.DataFrame({"a": [1]}))},
            {"outputColumn": "x", "expression": "Salary * 2"},
        )


def _build_dataset(name: str, other_col: str = "Age") -> DatasetValue:
    frame = pd.DataFrame(
        {
            "CustomerID": [1, 2, 3, 4],
            other_col: [25, 30, 35, 40],
            name: list(range(4)),
        }
    )
    return DatasetValue(frame=frame, target=None, role="full")


def test_join_datasets_inner_basic(context_factory):
    block = JoinDatasetsBlock()
    left = _build_dataset("LSpent")
    right = _build_dataset("RSpent", other_col="Income")
    result = block.execute(
        context_factory(),
        {"left": left, "right": right},
        {"keys": ["CustomerID"], "strategy": "inner"},
    )
    out = result.outputs["dataset"]
    assert "CustomerID" in out.frame.columns
    assert "LSpent" in out.frame.columns
    assert "RSpent" in out.frame.columns
    assert len(out.frame) == 4


def test_join_datasets_left_keeps_unmatched_left_rows(context_factory):
    block = JoinDatasetsBlock()
    left_frame = pd.DataFrame({"CustomerID": [1, 2, 3], "Age": [25, 30, 35]})
    right_frame = pd.DataFrame({"CustomerID": [1, 2], "Total": [100, 200]})
    result = block.execute(
        context_factory(),
        {"left": DatasetValue(frame=left_frame), "right": DatasetValue(frame=right_frame)},
        {"keys": ["CustomerID"], "strategy": "left"},
    )
    assert len(result.outputs["dataset"].frame) == 3
    row3 = result.outputs["dataset"].frame.iloc[2]
    assert pd.isna(row3["Total"])


def test_join_datasets_multiple_keys(context_factory):
    block = JoinDatasetsBlock()
    left = pd.DataFrame(
        {"A": [1, 1, 2, 2], "B": ["x", "y", "x", "y"], "v1": [10, 20, 30, 40]}
    )
    right = pd.DataFrame(
        {"A": [1, 1, 2], "B": ["x", "y", "x"], "v2": [100, 200, 300]}
    )
    result = block.execute(
        context_factory(),
        {"left": DatasetValue(frame=left), "right": DatasetValue(frame=right)},
        {"keys": ["A", "B"], "strategy": "inner"},
    )
    assert len(result.outputs["dataset"].frame) == 3


def test_join_datasets_inherits_left_metadata(context_factory):
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"k": [1, 2], "a": [10, 20]}), target="a", task="regression", role="train")
    right = DatasetValue(frame=pd.DataFrame({"k": [1, 2], "b": [100, 200]}), target="b", task="classification", role="test")
    result = block.execute(
        context_factory(),
        {"left": left, "right": right},
        {"keys": ["k"], "strategy": "inner"},
    )
    out = result.outputs["dataset"]
    assert out.target == "a"
    assert out.task == "regression"
    assert out.role == "train"


def test_join_datasets_rejects_missing_keys(context_factory):
    block = JoinDatasetsBlock()
    with pytest.raises(BlockExecutionError, match="[Kk]ey|[Rr]equired"):
        block.execute(
            context_factory(),
            {
                "left": DatasetValue(frame=pd.DataFrame({"a": [1]})),
                "right": DatasetValue(frame=pd.DataFrame({"a": [1]})),
            },
            {"keys": [], "strategy": "inner"},
        )


def test_join_datasets_rejects_key_missing_from_right(context_factory):
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"a": [1, 2], "b": [10, 20]}))
    right = DatasetValue(frame=pd.DataFrame({"c": [1, 2], "d": [100, 200]}))
    with pytest.raises(BlockExecutionError, match="[Cc]olumn|[Kk]ey"):
        block.execute(
            context_factory(),
            {"left": left, "right": right},
            {"keys": ["a"], "strategy": "inner"},
        )


def test_join_datasets_rejects_non_key_collision(context_factory):
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"a": [1], "b": [10]}))
    right = DatasetValue(frame=pd.DataFrame({"a": [1], "b": [100]}))
    with pytest.raises(BlockExecutionError, match="[Cc]ollid|[Cc]olumn"):
        block.execute(
            context_factory(),
            {"left": left, "right": right},
            {"keys": ["a"], "strategy": "inner"},
        )


def test_join_datasets_rejects_full_strategy_collision(context_factory):
    block = JoinDatasetsBlock()
    left = DatasetValue(frame=pd.DataFrame({"a": [1, 2], "b": [10, 20]}))
    right = DatasetValue(frame=pd.DataFrame({"a": [1, 2], "b": [100, 200]}))
    with pytest.raises(BlockExecutionError):
        block.execute(
            context_factory(),
            {"left": left, "right": right},
            {"keys": ["a"], "strategy": "full"},
        )


from src.blocks.preprocessing import FeatureUnionBlock


def _make_dataset(name: str) -> DatasetValue:
    return DatasetValue(frame=pd.DataFrame({name: [1, 2, 3]}))


def test_feature_union_two_inputs_succeeds(context_factory):
    block = FeatureUnionBlock()
    a = _make_dataset("a")
    b = _make_dataset("b")
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    out = result.outputs["dataset"]
    assert set(out.frame.columns) == {"a", "b"}
    assert len(out.frame) == 3


def test_feature_union_optional_unconnected_inputs_succeeds(context_factory):
    block = FeatureUnionBlock()
    a = _make_dataset("a")
    b = _make_dataset("b")
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    assert "dataset" in result.outputs


def test_feature_union_target_inherited_from_first_with_target(context_factory):
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2]}), target=None)
    b = DatasetValue(frame=pd.DataFrame({"y": [3, 4]}), target="y", task="regression", role="train")
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    out = result.outputs["dataset"]
    assert out.target == "y"
    assert out.task == "regression"
    assert out.role == "full"  # first input's role


def test_feature_union_rejects_row_count_mismatch(context_factory):
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2, 3]}))
    b = DatasetValue(frame=pd.DataFrame({"y": [4, 5]}))
    with pytest.raises(BlockExecutionError, match="[Rr]ows|[Cc]ount"):
        block.execute(
            context_factory(),
            {"datasetA": a, "datasetB": b},
            {},
        )


def test_feature_union_dedupes_overlapping_columns_keeping_first_occurrence(context_factory):
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2], "y": [10, 20]}))
    b = DatasetValue(frame=pd.DataFrame({"x": [99, 98], "z": [100, 200]}))
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b},
        {},
    )
    out = result.outputs["dataset"]
    assert list(out.frame.columns) == ["x", "y", "z"]
    assert out.frame["x"].tolist() == [1, 2]
    assert out.frame["y"].tolist() == [10, 20]
    assert out.frame["z"].tolist() == [100, 200]
    assert len(out.frame) == 2


def test_feature_union_three_branches_dedup_with_first_wins(context_factory):
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"age": [25, 30], "income": [50, 60]}))
    b = DatasetValue(frame=pd.DataFrame({"age": [99, 98], "score": [0.1, 0.2]}))
    c = DatasetValue(frame=pd.DataFrame({"income": [9, 8], "score": [9.9, 8.8], "tag": ["x", "y"]}))
    result = block.execute(
        context_factory(),
        {"datasetA": a, "datasetB": b, "datasetC": c},
        {},
    )
    out = result.outputs["dataset"]
    assert list(out.frame.columns) == ["age", "income", "score", "tag"]
    assert out.frame["age"].tolist() == [25, 30]
    assert out.frame["income"].tolist() == [50, 60]
    assert out.frame["score"].tolist() == [0.1, 0.2]
    assert out.frame["tag"].tolist() == ["x", "y"]


def test_feature_union_row_count_mismatch_still_raises(context_factory):
    block = FeatureUnionBlock()
    a = DatasetValue(frame=pd.DataFrame({"x": [1, 2]}))
    b = DatasetValue(frame=pd.DataFrame({"y": [3, 4, 5]}))
    with pytest.raises(BlockExecutionError, match="[Rr]ows|[Cc]ount"):
        block.execute(
            context_factory(),
            {"datasetA": a, "datasetB": b},
            {},
        )
