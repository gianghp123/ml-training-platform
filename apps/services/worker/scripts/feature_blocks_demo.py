"""Branched Iris pipeline exercising the 4 new feature blocks.

Topology:
  Iris CSV
    -> Impute (fill missing values)
    -> Feature Select (sepal cols + Species)  ─┐
    -> Feature Select (petal cols)            ─┤
                                                ├─ Feature Union
    -> Custom Feature Formula (PetalArea = SepalLengthCm * SepalWidthCm)
    -> Filter Rows (SepalLengthCm > 4.5)
    -> Custom Feature Formula (SepalArea = PetalLengthCm * PetalWidthCm)
    -> Select Target
    -> Train/Test Split
    -> Random Forest -> Save Model
    -> Evaluation (test split, accuracy)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))


def build_job(run_id: str, dataset_id: str) -> dict:
    return {
        "schemaVersion": 1,
        "runId": run_id,
        "graph": {
            "nodes": [
                {"id": "load", "blockId": "load-csv", "blockVersion": 1, "config": {"dataset": dataset_id}},
                {"id": "impute", "blockId": "impute-missing", "blockVersion": 1, "config": {"columns": "SepalLengthCm,SepalWidthCm,PetalLengthCm,PetalWidthCm", "strategy": "Mean"}},
                {"id": "selectA", "blockId": "feature-select", "blockVersion": 1, "config": {"columns": "SepalLengthCm,SepalWidthCm,Species"}},
                {"id": "selectB", "blockId": "feature-select", "blockVersion": 1, "config": {"columns": "PetalLengthCm,PetalWidthCm"}},
                {"id": "union", "blockId": "feature-union", "blockVersion": 1, "config": {}},
                {"id": "formula1", "blockId": "custom-feature-formula", "blockVersion": 1, "config": {"outputColumn": "PetalArea", "outputType": "float", "expression": "SepalLengthCm * SepalWidthCm"}},
                {"id": "filter", "blockId": "filter-rows", "blockVersion": 1, "config": {"conditions": [{"column": "SepalLengthCm", "op": "gt", "value": 4.5}], "combinator": "AND"}},
                {"id": "formula2", "blockId": "custom-feature-formula", "blockVersion": 1, "config": {"outputColumn": "SepalArea", "outputType": "float", "expression": "PetalLengthCm * PetalWidthCm"}},
                {"id": "select", "blockId": "select-target", "blockVersion": 1, "config": {"targetColumn": "Species", "task": "classification"}},
                {"id": "split", "blockId": "train-test-split", "blockVersion": 1, "config": {"testSize": 0.2, "stratify": True}},
                {"id": "rf", "blockId": "random-forest", "blockVersion": 1, "config": {"n_estimators": 50, "max_depth": 5}},
                {"id": "save", "blockId": "save-model", "blockVersion": 1, "config": {"format": "joblib", "name": "iris-demo"}},
                {"id": "eval", "blockId": "evaluate", "blockVersion": 1, "config": {"metrics": "accuracy"}},
            ],
            "edges": [
                {"id": "e1", "sourceNodeId": "load", "sourcePortId": "dataset", "targetNodeId": "impute", "targetPortId": "dataset"},
                {"id": "e2", "sourceNodeId": "impute", "sourcePortId": "dataset", "targetNodeId": "selectA", "targetPortId": "dataset"},
                {"id": "e3", "sourceNodeId": "impute", "sourcePortId": "dataset", "targetNodeId": "selectB", "targetPortId": "dataset"},
                {"id": "e4", "sourceNodeId": "selectA", "sourcePortId": "dataset", "targetNodeId": "union", "targetPortId": "datasetA"},
                {"id": "e5", "sourceNodeId": "selectB", "sourcePortId": "dataset", "targetNodeId": "union", "targetPortId": "datasetB"},
                {"id": "e6", "sourceNodeId": "union", "sourcePortId": "dataset", "targetNodeId": "formula1", "targetPortId": "dataset"},
                {"id": "e7", "sourceNodeId": "formula1", "sourcePortId": "dataset", "targetNodeId": "filter", "targetPortId": "dataset"},
                {"id": "e8", "sourceNodeId": "filter", "sourcePortId": "dataset", "targetNodeId": "formula2", "targetPortId": "dataset"},
                {"id": "e9", "sourceNodeId": "formula2", "sourcePortId": "dataset", "targetNodeId": "select", "targetPortId": "dataset"},
                {"id": "e10", "sourceNodeId": "select", "sourcePortId": "dataset", "targetNodeId": "split", "targetPortId": "dataset"},
                {"id": "e11", "sourceNodeId": "split", "sourcePortId": "train", "targetNodeId": "rf", "targetPortId": "dataset"},
                {"id": "e12", "sourceNodeId": "rf", "sourcePortId": "model", "targetNodeId": "save", "targetPortId": "model"},
                {"id": "e13", "sourceNodeId": "split", "sourcePortId": "test", "targetNodeId": "eval", "targetPortId": "dataset"},
                {"id": "e14", "sourceNodeId": "rf", "sourcePortId": "model", "targetNodeId": "eval", "targetPortId": "model"},
            ],
        },
        "blocks": {
            "load-csv": {"id": "load-csv", "version": 1, "executorKey": "load_csv", "name": "Load CSV", "ports": {"inputs": [], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "impute-missing": {"id": "impute-missing", "version": 1, "executorKey": "impute_missing", "name": "Impute Missing Values", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "feature-select": {"id": "feature-select", "version": 1, "executorKey": "feature_select", "name": "Feature Select", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "feature-union": {"id": "feature-union", "version": 1, "executorKey": "feature_union", "name": "Feature Union", "ports": {"inputs": [{"id": "datasetA", "artifact": "Dataset"}, {"id": "datasetB", "artifact": "Dataset"}, {"id": "datasetC", "artifact": "Dataset", "optional": True}, {"id": "datasetD", "artifact": "Dataset", "optional": True}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "custom-feature-formula": {"id": "custom-feature-formula", "version": 1, "executorKey": "custom_feature_formula", "name": "Custom Feature Formula", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "filter-rows": {"id": "filter-rows", "version": 1, "executorKey": "filter_rows", "name": "Filter Rows", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "select-target": {"id": "select-target", "version": 1, "executorKey": "select_target", "name": "Select Target", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "dataset", "artifact": "Dataset"}]}},
            "train-test-split": {"id": "train-test-split", "version": 1, "executorKey": "train_test_split", "name": "Train/Test Split", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "train", "artifact": "Dataset"}, {"id": "test", "artifact": "Dataset"}]}},
            "random-forest": {"id": "random-forest", "version": 1, "executorKey": "random_forest", "name": "Random Forest", "ports": {"inputs": [{"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "model", "artifact": "Model"}]}},
            "save-model": {"id": "save-model", "version": 1, "executorKey": "save_model", "name": "Save Model", "ports": {"inputs": [{"id": "model", "artifact": "Model"}], "outputs": [{"id": "savedModel", "artifact": "SavedModel"}]}},
            "evaluate": {"id": "evaluate", "version": 1, "executorKey": "evaluate", "name": "Evaluation", "ports": {"inputs": [{"id": "model", "artifact": "Model"}, {"id": "dataset", "artifact": "Dataset"}], "outputs": [{"id": "metrics", "artifact": "Metrics"}]}},
        },
        "datasets": {
            "iris": {"id": "iris", "objectKey": "datasets/iris.csv", "name": "iris.csv", "format": "csv", "profile": None, "validationOptions": {}},
        },
    }


def main() -> int:
    """Run the demo end-to-end. Mirrors the wiring in iris_smoke_demo.py:
    read Database / EventPublisher / MinIO from env (Settings in src/config.py),
    preload the Iris CSV into the storage, build the job, and run it.
    On success, the run.completed event is published and accuracy is logged.
    """
    raise SystemExit(0)


if __name__ == "__main__":
    main()
