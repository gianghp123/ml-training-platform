from __future__ import annotations

import uuid

import pytest

from scripts.iris_smoke_demo import (
    EXECUTOR_VERSIONS,
    FEATURE_COLUMNS,
    DemoError,
    build_graph,
    build_job,
    load_iris_fixture,
)


def definitions():
    return {
        key: {
            "id": uuid.uuid5(uuid.NAMESPACE_DNS, key),
            "version": version,
            "executor_key": key,
            "name": key,
            "ports": {"inputs": [], "outputs": []},
            "config_schema": {"fields": []},
            "constraints": {"rules": []},
            "output_transform": {"declared": {"artifact": "Dataset"}},
        }
        for key, version in EXECUTOR_VERSIONS.items()
    }


def test_builds_canonical_six_node_job(tmp_path):
    csv_path = tmp_path / "Iris.csv"
    csv_path.write_text(
        ",".join(["Id", *FEATURE_COLUMNS])
        + "\n"
        + "1,3.5,5.1,1.4,0.2,Iris-setosa\n"
        + "2,3.0,6.0,4.8,1.8,Iris-versicolor\n"
        + "3,3.0,6.5,5.2,2.0,Iris-virginica\n",
        encoding="utf-8",
    )
    fixture = load_iris_fixture(csv_path)
    block_definitions = definitions()
    dataset_id = str(uuid.uuid4())
    graph, node_ids = build_graph(
        session_id="abc123",
        dataset_id=dataset_id,
        definitions=block_definitions,
    )
    job = build_job(
        run_id=str(uuid.uuid4()),
        user_id="smoke-user",
        dataset_id=dataset_id,
        dataset_object_key="smoke-tests/abc/Iris.csv",
        fixture=fixture,
        graph=graph,
        definitions=block_definitions,
    )

    assert len(graph["nodes"]) == 6
    assert len(graph["edges"]) == 6
    assert len(node_ids) == 6
    assert job["schemaVersion"] == 1
    assert set(job["blocks"]) == {
        f"{definition['id']}@{definition['version']}"
        for definition in block_definitions.values()
    }
    assert job["datasets"][dataset_id]["objectKey"].endswith("Iris.csv")


def test_rejects_non_iris_csv(tmp_path):
    csv_path = tmp_path / "wrong.csv"
    csv_path.write_text("a,b\n1,2\n", encoding="utf-8")
    with pytest.raises(DemoError, match="missing required columns"):
        load_iris_fixture(csv_path)
