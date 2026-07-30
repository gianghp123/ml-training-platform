from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import pytest

from src.runner import PipelineJob, PipelineRunner
from src.runtime import GraphValidationError


PORTS = {
    "load_csv": {"inputs": [], "outputs": [{"id": "dataset"}]},
    "feature_select": {
        "inputs": [{"id": "dataset"}],
        "outputs": [{"id": "dataset"}],
    },
    "select_target": {
        "inputs": [{"id": "dataset"}],
        "outputs": [{"id": "dataset"}],
    },
    "train_test_split": {
        "inputs": [{"id": "dataset"}],
        "outputs": [{"id": "train"}, {"id": "test"}],
    },
    "random_forest": {
        "inputs": [{"id": "dataset"}],
        "outputs": [{"id": "model"}],
    },
    "evaluate": {
        "inputs": [{"id": "model"}, {"id": "dataset"}],
        "outputs": [{"id": "metrics"}],
    },
}


@dataclass
class FakeDatabase:
    run_status: str = "pending"
    nodes: dict[str, str] = field(default_factory=dict)
    summaries: dict[str, dict[str, Any]] = field(default_factory=dict)
    artifacts: list[dict[str, Any]] = field(default_factory=list)

    def start_run(self, run_id: str) -> bool:
        if self.run_status != "pending":
            return False
        self.run_status = "running"
        return True

    def complete_run(self, run_id: str) -> None:
        self.run_status = "completed"

    def fail_run(self, run_id: str) -> None:
        self.run_status = "failed"

    def start_node(self, run_id: str, node_id: str, worker_id: str) -> str:
        self.nodes[node_id] = "running"
        return f"execution-{node_id}"

    def complete_node(self, run_id: str, node_id: str, summary) -> None:
        self.nodes[node_id] = "completed"
        self.summaries[node_id] = dict(summary)

    def fail_node(self, run_id: str, node_id: str, error: str) -> None:
        self.nodes[node_id] = "failed"

    def skip_pending_nodes(self, run_id: str) -> None:
        for node_id, status in list(self.nodes.items()):
            if status == "pending":
                self.nodes[node_id] = "skipped"

    def create_artifact(self, **kwargs):
        artifact = {
            "id": f"artifact-{len(self.artifacts) + 1}",
            "nodeExecutionId": kwargs["node_execution_id"],
            "name": kwargs["name"],
            "artifactType": kwargs["artifact_type"],
            "mimeType": kwargs["mime_type"],
            "storageUri": kwargs["storage_uri"],
            "metadata": dict(kwargs["metadata"]),
        }
        self.artifacts.append(artifact)
        return artifact


@dataclass
class FakeEvents:
    items: list[dict[str, Any]] = field(default_factory=list)

    def publish(self, event_type: str, run_id: str, **kwargs) -> str:
        self.items.append({"type": event_type, "runId": run_id, **kwargs})
        return f"{len(self.items)}-0"


def iris_job() -> dict[str, Any]:
    executors = [
        ("block-load", 1, "load_csv"),
        ("block-feature", 1, "feature_select"),
        ("block-target", 1, "select_target"),
        ("block-split", 1, "train_test_split"),
        ("block-rf", 1, "random_forest"),
        ("block-eval", 1, "evaluate"),
    ]
    nodes = [
        {
            "id": "load",
            "blockId": "block-load",
            "blockVersion": 1,
            "config": {"dataset": "iris"},
        },
        {
            "id": "feature",
            "blockId": "block-feature",
            "blockVersion": 1,
            "config": {"columns": "f1,f2,Species"},
        },
        {
            "id": "target",
            "blockId": "block-target",
            "blockVersion": 1,
            "config": {"targetColumn": "Species", "task": "classification"},
        },
        {
            "id": "split",
            "blockId": "block-split",
            "blockVersion": 1,
            "config": {"testSize": 0.25, "stratify": True},
        },
        {
            "id": "rf",
            "blockId": "block-rf",
            "blockVersion": 1,
            "config": {"n_estimators": 10, "max_depth": 4},
        },
        {
            "id": "eval",
            "blockId": "block-eval",
            "blockVersion": 1,
            "config": {"metrics": ""},
        },
    ]
    edge_specs = [
        ("load", "dataset", "feature", "dataset"),
        ("feature", "dataset", "target", "dataset"),
        ("target", "dataset", "split", "dataset"),
        ("split", "train", "rf", "dataset"),
        ("rf", "model", "eval", "model"),
        ("split", "test", "eval", "dataset"),
    ]
    edges = [
        {
            "id": f"edge-{index}",
            "sourceNodeId": source,
            "sourcePortId": source_port,
            "targetNodeId": target,
            "targetPortId": target_port,
        }
        for index, (source, source_port, target, target_port) in enumerate(edge_specs)
    ]
    return {
        "schemaVersion": 1,
        "runId": "run-iris",
        "graph": {"nodes": nodes, "edges": edges},
        "blocks": {
            f"{block_id}@{version}": {
                "id": block_id,
                "version": version,
                "executorKey": key,
                "name": key,
                "ports": PORTS[key],
            }
            for block_id, version, key in executors
        },
        "datasets": {
            "iris": {
                "id": "iris",
                "format": "csv",
                "objectKey": "datasets/iris.csv",
                "validationOptions": {
                    "csv": {"delimiter": ",", "hasHeader": True}
                },
            }
        },
    }


def test_pipeline_job_topological_order_and_cycle():
    raw = iris_job()
    job = PipelineJob.from_mapping(raw)
    assert [node.id for node in job.topological_order()] == [
        "load",
        "feature",
        "target",
        "split",
        "rf",
        "eval",
    ]
    raw["graph"]["edges"].append(
        {
            "id": "cycle",
            "sourceNodeId": "eval",
            "sourcePortId": "metrics",
            "targetNodeId": "feature",
            "targetPortId": "dataset",
        }
    )
    # It first detects the occupied input, which is still a graph-level error.
    with pytest.raises(GraphValidationError):
        PipelineJob.from_mapping(raw)


def test_runner_executes_iris_graph_and_emits_ordered_events(storage):
    rows = ["f1,f2,Species"]
    for index in range(10):
        rows.append(f"{index / 10},{index / 10 + 1},setosa")
        rows.append(f"{5 + index / 10},{6 + index / 10},versicolor")
        rows.append(f"{10 + index / 10},{11 + index / 10},virginica")
    storage.objects["datasets/iris.csv"] = ("\n".join(rows) + "\n").encode()
    database = FakeDatabase()
    database.nodes = {
        node["id"]: "pending" for node in iris_job()["graph"]["nodes"]
    }
    events = FakeEvents()
    runner = PipelineRunner(database=database, events=events, storage=storage)

    outcome = runner.run(iris_job(), "worker-1")

    assert outcome.status == "completed"
    assert database.run_status == "completed"
    assert all(status == "completed" for status in database.nodes.values())
    assert database.summaries["eval"]["metrics"]["accuracy"] >= 0.9
    assert len(database.artifacts) == 1
    types = [event["type"] for event in events.items]
    assert types[0] == "run.started"
    assert types[-1] == "run.completed"
    assert types.index("artifact.created") < types.index("node.completed", types.index("artifact.created"))


def test_runner_duplicate_delivery_is_ignored(storage):
    database = FakeDatabase(run_status="completed")
    events = FakeEvents()
    outcome = PipelineRunner(
        database=database, events=events, storage=storage
    ).run(iris_job(), "worker-1")
    assert outcome.status == "duplicate"
    assert events.items == []


def test_runner_marks_failed_node_and_run(storage):
    raw = iris_job()
    raw["graph"]["nodes"][1]["config"]["columns"] = "missing,Species"
    storage.objects["datasets/iris.csv"] = (
        b"f1,f2,Species\n1,2,a\n2,3,a\n4,5,b\n5,6,b\n"
    )
    database = FakeDatabase()
    database.nodes = {
        node["id"]: "pending" for node in raw["graph"]["nodes"]
    }
    events = FakeEvents()

    outcome = PipelineRunner(
        database=database, events=events, storage=storage
    ).run(raw, "worker-1")

    assert outcome.status == "failed"
    assert database.run_status == "failed"
    assert database.nodes["feature"] == "failed"
    assert any(event["type"] == "node.failed" for event in events.items)
    assert events.items[-1]["type"] == "run.failed"


def test_runner_executes_parallel_branches_concurrently(storage):
    """Test that independent branches run concurrently and finish successfully."""
    storage.objects["datasets/data.csv"] = b"a,b,target\n1,2,x\n3,4,y\n"
    job_payload = {
        "schemaVersion": 1,
        "runId": "run-parallel-test",
        "datasets": {"dataset-1": {"id": "dataset-1", "storageUri": "datasets/data.csv", "format": "csv"}},
        "graph": {
            "nodes": [
                {
                    "id": "load",
                    "blockId": "load_csv",
                    "blockVersion": 1,
                    "config": {"dataset": "dataset-1"},
                },
                {
                    "id": "branch_a",
                    "blockId": "feature_select",
                    "blockVersion": 1,
                    "config": {"columns": "a,target"},
                },
                {
                    "id": "branch_b",
                    "blockId": "rename_columns",
                    "blockVersion": 1,
                    "config": {"mapping": {"b": "b_renamed"}},
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "sourceNodeId": "load",
                    "sourcePortId": "dataset",
                    "targetNodeId": "branch_a",
                    "targetPortId": "dataset",
                },
                {
                    "id": "e2",
                    "sourceNodeId": "load",
                    "sourcePortId": "dataset",
                    "targetNodeId": "branch_b",
                    "targetPortId": "dataset",
                },
            ],
        },
        "blocks": [
            {
                "id": "load_csv",
                "version": 1,
                "executorKey": "load_csv",
                "name": "Load CSV",
                "ports": {"inputs": [], "outputs": [{"id": "dataset"}]},
            },
            {
                "id": "feature_select",
                "version": 1,
                "executorKey": "feature_select",
                "name": "Feature Select",
                "ports": {"inputs": [{"id": "dataset"}], "outputs": [{"id": "dataset"}]},
            },
            {
                "id": "rename_columns",
                "version": 1,
                "executorKey": "rename_columns",
                "name": "Rename Column",
                "ports": {"inputs": [{"id": "dataset"}], "outputs": [{"id": "dataset"}]},
            },
        ],
    }

    database = FakeDatabase()
    database.nodes = {"load": "pending", "branch_a": "pending", "branch_b": "pending"}
    events = FakeEvents()
    runner = PipelineRunner(database=database, events=events, storage=storage, max_concurrency=4)

    outcome = runner.run(job_payload, "worker-1")

    assert outcome.status == "completed"
    assert database.run_status == "completed"
    assert database.nodes["load"] == "completed"
    assert database.nodes["branch_a"] == "completed"
    assert database.nodes["branch_b"] == "completed"

    started_events = [e for e in events.items if e["type"] == "node.started"]
    started_node_ids = [e["node_id"] for e in started_events]

    assert started_node_ids[0] == "load"
    assert set(started_node_ids[1:]) == {"branch_a", "branch_b"}

