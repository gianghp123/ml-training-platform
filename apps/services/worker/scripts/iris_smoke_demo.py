#!/usr/bin/env python3
"""Run a live six-node Iris pipeline through the real worker infrastructure.

The script intentionally bypasses the HTTP API so it can verify the exact
PostgreSQL/Redis/MinIO integration contract consumed by the Python worker.
Every database row and object uses per-invocation UUIDs. Cleanup only targets
those exact identifiers and the run-specific artifact prefix.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

import pandas as pd
import psycopg2
from minio import Minio
from pandas.api.types import is_bool_dtype, is_float_dtype, is_integer_dtype
from psycopg2.extras import Json, RealDictCursor
from redis import Redis
from redis.exceptions import ResponseError

WORKER_ROOT = Path(__file__).resolve().parents[1]
if str(WORKER_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKER_ROOT))

from src.config import ConfigurationError, Settings  # noqa: E402
from src.storage import object_key_from_uri  # noqa: E402


EXECUTOR_VERSIONS = {
    "load_csv": 1,
    "feature_select": 1,
    "select_target": 1,
    "train_test_split": 1,
    "random_forest": 1,
    "evaluate": 1,
}
FEATURE_COLUMNS = [
    "SepalWidthCm",
    "SepalLengthCm",
    "PetalLengthCm",
    "PetalWidthCm",
    "Species",
]
TERMINAL_STATUSES = {"completed", "failed", "cancelled"}
MINIMUM_ACCURACY = 0.90


class DemoError(RuntimeError):
    """A clear, user-actionable smoke demo failure."""


@dataclass(frozen=True)
class IrisFixture:
    path: Path
    content: bytes
    row_count: int
    profile: Mapping[str, Any]
    validation_options: Mapping[str, Any]


@dataclass
class CreatedResources:
    session_id: str
    run_id: str
    dataset_id: str
    dataset_object_key: str
    event_stream: str
    job_stream: str
    consumer_group: str
    job_id: str | None = None


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_iris_fixture(path: Path) -> IrisFixture:
    resolved = path.expanduser().resolve()
    if not resolved.is_file():
        raise DemoError(f"Iris CSV does not exist: {resolved}")
    content = resolved.read_bytes()
    if not content:
        raise DemoError("Iris CSV is empty")
    try:
        frame = pd.read_csv(resolved, encoding="utf-8-sig")
    except Exception as exc:
        raise DemoError(f"Could not parse Iris CSV: {exc}") from exc
    if frame.empty:
        raise DemoError("Iris CSV contains no data rows")
    missing = [column for column in FEATURE_COLUMNS if column not in frame.columns]
    if missing:
        raise DemoError(
            "Iris CSV is missing required columns: " + ", ".join(missing)
        )
    for column in FEATURE_COLUMNS[:-1]:
        if not (
            is_integer_dtype(frame[column].dtype)
            or is_float_dtype(frame[column].dtype)
        ):
            raise DemoError(f"Iris feature column {column!r} must be numeric")
    if frame["Species"].nunique(dropna=True) != 3:
        raise DemoError("Iris Species must contain exactly three classes")

    columns = []
    for name in frame.columns:
        series = frame[name]
        if is_bool_dtype(series.dtype):
            primitive, semantic = "boolean", "categorical"
        elif is_integer_dtype(series.dtype):
            primitive, semantic = "int", "numeric"
        elif is_float_dtype(series.dtype):
            primitive, semantic = "float", "numeric"
        else:
            primitive = "string"
            semantic = "categorical" if name == "Species" else "text"
        columns.append(
            {
                "name": str(name),
                "primitive": primitive,
                "semantic": semantic,
                "nullable": bool(series.isnull().any()),
            }
        )

    profile = {
        "format": "csv",
        "delimiter": ",",
        "hasHeader": True,
        "encoding": "utf-8",
        "rowCount": int(len(frame)),
        "columns": columns,
        "sampled": False,
        "sampledRows": int(len(frame)),
    }
    validation_options = {
        "csv": {
            "delimiter": ",",
            "hasHeader": True,
            "encoding": "utf-8",
        }
    }
    return IrisFixture(
        path=resolved,
        content=content,
        row_count=int(len(frame)),
        profile=profile,
        validation_options=validation_options,
    )


def load_block_definitions(connection: Any) -> dict[str, dict[str, Any]]:
    keys = list(EXECUTOR_VERSIONS)
    with connection.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            """
            SELECT id, version, executor_key, name, ports, config_schema,
                   constraints, output_transform
            FROM block_definitions
            WHERE status = 'active' AND executor_key = ANY(%s)
            """,
            (keys,),
        )
        rows = [dict(row) for row in cursor.fetchall()]
    by_key: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = str(row["executor_key"])
        expected_version = EXECUTOR_VERSIONS.get(key)
        if expected_version == row["version"]:
            if key in by_key:
                raise DemoError(
                    f"More than one active definition found for "
                    f"{key}@{expected_version}"
                )
            by_key[key] = row
    missing = [
        f"{key}@{version}"
        for key, version in EXECUTOR_VERSIONS.items()
        if key not in by_key
    ]
    if missing:
        raise DemoError(
            "Required active block definitions are missing. "
            "Run API migrations first: " + ", ".join(missing)
        )
    return by_key


def build_graph(
    *,
    session_id: str,
    dataset_id: str,
    definitions: Mapping[str, Mapping[str, Any]],
) -> tuple[dict[str, Any], dict[str, str]]:
    node_ids = {
        key: f"smoke-{session_id}-{key.replace('_', '-')}"
        for key in EXECUTOR_VERSIONS
    }
    nodes = [
        {
            "id": node_ids["load_csv"],
            "blockId": str(definitions["load_csv"]["id"]),
            "blockVersion": 1,
            "config": {"dataset": dataset_id},
        },
        {
            "id": node_ids["feature_select"],
            "blockId": str(definitions["feature_select"]["id"]),
            "blockVersion": 1,
            "config": {"columns": ",".join(FEATURE_COLUMNS)},
        },
        {
            "id": node_ids["select_target"],
            "blockId": str(definitions["select_target"]["id"]),
            "blockVersion": 1,
            "config": {
                "targetColumn": "Species",
                "task": "classification",
            },
        },
        {
            "id": node_ids["train_test_split"],
            "blockId": str(definitions["train_test_split"]["id"]),
            "blockVersion": 1,
            "config": {"testSize": 0.2, "stratify": True},
        },
        {
            "id": node_ids["random_forest"],
            "blockId": str(definitions["random_forest"]["id"]),
            "blockVersion": 1,
            "config": {"n_estimators": 100, "max_depth": 10},
        },
        {
            "id": node_ids["evaluate"],
            "blockId": str(definitions["evaluate"]["id"]),
            "blockVersion": 1,
            "config": {"metrics": ""},
        },
    ]
    links = [
        ("load_csv", "dataset", "feature_select", "dataset"),
        ("feature_select", "dataset", "select_target", "dataset"),
        ("select_target", "dataset", "train_test_split", "dataset"),
        ("train_test_split", "train", "random_forest", "dataset"),
        ("random_forest", "model", "evaluate", "model"),
        ("train_test_split", "test", "evaluate", "dataset"),
    ]
    edges = [
        {
            "id": f"smoke-{session_id}-edge-{index}",
            "sourceNodeId": node_ids[source],
            "sourcePortId": source_port,
            "targetNodeId": node_ids[target],
            "targetPortId": target_port,
        }
        for index, (source, source_port, target, target_port) in enumerate(
            links, start=1
        )
    ]
    return {"nodes": nodes, "edges": edges}, node_ids


def build_job(
    *,
    run_id: str,
    dataset_id: str,
    dataset_object_key: str,
    fixture: IrisFixture,
    graph: Mapping[str, Any],
    definitions: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    blocks: dict[str, Any] = {}
    for definition in definitions.values():
        block_id = str(definition["id"])
        version = int(definition["version"])
        blocks[f"{block_id}@{version}"] = {
            "id": block_id,
            "version": version,
            "executorKey": definition["executor_key"],
            "name": definition["name"],
            "ports": definition["ports"],
            "configSchema": definition["config_schema"],
            "constraints": definition["constraints"],
            "outputTransform": definition["output_transform"],
        }
    return {
        "schemaVersion": 1,
        "runId": run_id,
        "graph": graph,
        "blocks": blocks,
        "datasets": {
            dataset_id: {
                "id": dataset_id,
                "objectKey": dataset_object_key,
                "name": fixture.path.name,
                "format": "csv",
                "profile": fixture.profile,
                "validationOptions": fixture.validation_options,
            }
        },
    }


def seed_database(
    connection: Any,
    *,
    resources: CreatedResources,
    fixture: IrisFixture,
    graph: Mapping[str, Any],
    node_ids: Mapping[str, str],
) -> None:
    checksum = hashlib.sha256(fixture.content).hexdigest()
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO datasets (
                    id, name, description, storage_uri, format, size,
                    checksum, version, status, profile,
                    validation_error, validation_options
                )
                VALUES (
                    %s, %s, %s, %s, 'csv', %s, %s, 1, 'ready',
                    %s, NULL, %s
                )
                """,
                (
                    resources.dataset_id,
                    f"iris-smoke-{resources.session_id}.csv",
                    "Ephemeral Iris worker smoke demo fixture",
                    resources.dataset_object_key,
                    len(fixture.content),
                    checksum,
                    Json(fixture.profile),
                    Json(fixture.validation_options),
                ),
            )
            cursor.execute(
                """
                INSERT INTO workflow_runs (
                    id, workflow_version_id, dataset_id, graph_snapshot,
                    status, started_at, finished_at
                )
                VALUES (%s, NULL, %s, %s, 'pending', NULL, NULL)
                """,
                (
                    resources.run_id,
                    resources.dataset_id,
                    Json(graph),
                ),
            )
            cursor.execute(
                """
                INSERT INTO workflow_run_datasets (run_id, dataset_id)
                VALUES (%s, %s)
                """,
                (resources.run_id, resources.dataset_id),
            )
            for executor_key, node_id in node_ids.items():
                cursor.execute(
                    """
                    INSERT INTO node_executions (
                        workflow_run_id, node_id, node_type, status,
                        worker_id, retry_count, started_at, finished_at,
                        error_message, output_summary
                    )
                    VALUES (
                        %s, %s, %s, 'pending', NULL, 0, NULL, NULL,
                        NULL, NULL
                    )
                    """,
                    (resources.run_id, node_id, executor_key),
                )


def enqueue_job(
    redis_client: Redis,
    *,
    resources: CreatedResources,
    job: Mapping[str, Any],
    event_maxlen: int,
    event_ttl_seconds: int,
) -> str:
    queued_event = {
        "type": "run.queued",
        "runId": resources.run_id,
        "timestamp": utc_timestamp(),
        "level": "info",
        "message": "Iris smoke demo queued.",
        "payload": {"nodeCount": 6, "datasetCount": 1, "smokeDemo": True},
    }
    transaction = redis_client.pipeline(transaction=True)
    transaction.xadd(
        resources.event_stream,
        {
            "payload": json.dumps(
                queued_event, ensure_ascii=False, separators=(",", ":")
            )
        },
        maxlen=event_maxlen,
        approximate=True,
    )
    transaction.expire(resources.event_stream, event_ttl_seconds)
    transaction.xadd(
        resources.job_stream,
        {
            "payload": json.dumps(
                job, ensure_ascii=False, separators=(",", ":")
            )
        },
    )
    results = transaction.execute()
    job_id = results[2]
    return job_id.decode() if isinstance(job_id, bytes) else str(job_id)


def run_status(connection: Any, run_id: str) -> str | None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT status FROM workflow_runs WHERE id = %s", (run_id,))
        row = cursor.fetchone()
    return str(row[0]) if row else None


def wait_for_terminal(
    redis_client: Redis,
    connection: Any,
    *,
    resources: CreatedResources,
    timeout_seconds: float,
) -> list[dict[str, Any]]:
    deadline = time.monotonic() + timeout_seconds
    cursor_id = "0-0"
    events: list[dict[str, Any]] = []
    terminal_event: dict[str, Any] | None = None
    last_db_status: str | None = None

    while time.monotonic() < deadline:
        remaining_ms = max(1, int((deadline - time.monotonic()) * 1000))
        response = redis_client.xread(
            {resources.event_stream: cursor_id},
            count=100,
            block=min(1000, remaining_ms),
        )
        for _, entries in response:
            for event_id, fields in entries:
                cursor_id = (
                    event_id.decode() if isinstance(event_id, bytes) else str(event_id)
                )
                raw = fields.get("payload")
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                if not isinstance(raw, str):
                    continue
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if event.get("runId") != resources.run_id:
                    continue
                event["eventId"] = cursor_id
                events.append(event)
                message = event.get("message")
                suffix = f" - {message}" if message else ""
                print(
                    f"[{event.get('timestamp', '?')}] "
                    f"{event.get('type', 'unknown')}"
                    f"{' ' + event['nodeId'] if event.get('nodeId') else ''}"
                    f"{suffix}",
                    flush=True,
                )
                if event.get("type") in {"run.completed", "run.failed"}:
                    terminal_event = event

        last_db_status = run_status(connection, resources.run_id)
        if terminal_event is not None and last_db_status in TERMINAL_STATUSES:
            return events

    raise DemoError(
        f"Timed out after {timeout_seconds:g}s waiting for terminal event; "
        f"database status is {last_db_status!r}"
    )


def read_result(
    connection: Any,
    *,
    resources: CreatedResources,
    evaluation_node_id: str,
) -> dict[str, Any]:
    with connection.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            """
            SELECT status, started_at, finished_at
            FROM workflow_runs
            WHERE id = %s
            """,
            (resources.run_id,),
        )
        run = cursor.fetchone()
        cursor.execute(
            """
            SELECT node_id, node_type, status, error_message, output_summary
            FROM node_executions
            WHERE workflow_run_id = %s
            ORDER BY started_at NULLS LAST, node_id
            """,
            (resources.run_id,),
        )
        nodes = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT id, name, artifact_type, mime_type, storage_uri, metadata
            FROM artifacts
            WHERE workflow_run_id = %s
            ORDER BY created_at
            """,
            (resources.run_id,),
        )
        artifacts = [dict(row) for row in cursor.fetchall()]

    if run is None:
        raise DemoError("Workflow run row disappeared before verification")
    if run["status"] != "completed":
        failures = [
            f"{node['node_type']}: {node['error_message']}"
            for node in nodes
            if node["status"] == "failed"
        ]
        raise DemoError(
            f"Workflow run ended with status {run['status']!r}. "
            + ("; ".join(failures) if failures else "")
        )
    incomplete = [
        f"{node['node_type']}={node['status']}"
        for node in nodes
        if node["status"] != "completed"
    ]
    if incomplete:
        raise DemoError("Not every node completed: " + ", ".join(incomplete))
    evaluation = next(
        (node for node in nodes if node["node_id"] == evaluation_node_id),
        None,
    )
    if evaluation is None or not isinstance(evaluation["output_summary"], Mapping):
        raise DemoError("Evaluation output summary is missing")
    summary = dict(evaluation["output_summary"])
    metrics = summary.get("metrics")
    if not isinstance(metrics, Mapping):
        raise DemoError("Evaluation metrics are missing")
    accuracy = metrics.get("accuracy")
    if not isinstance(accuracy, (int, float)):
        raise DemoError("Evaluation accuracy is missing")
    if float(accuracy) < MINIMUM_ACCURACY:
        raise DemoError(
            f"Accuracy {float(accuracy):.4f} is below {MINIMUM_ACCURACY:.2f}"
        )
    confusion = summary.get("confusionMatrix")
    if not isinstance(confusion, Mapping):
        raise DemoError("Confusion matrix is missing")
    labels = confusion.get("labels")
    matrix = confusion.get("matrix")
    if (
        not isinstance(labels, Sequence)
        or isinstance(labels, (str, bytes))
        or len(labels) != 3
        or not isinstance(matrix, Sequence)
        or len(matrix) != 3
        or any(not isinstance(row, Sequence) or len(row) != 3 for row in matrix)
    ):
        raise DemoError("Expected a 3 x 3 confusion matrix")
    if not any(artifact["artifact_type"] == "metric" for artifact in artifacts):
        raise DemoError("Metrics artifact was not persisted")
    return {
        "runId": resources.run_id,
        "status": run["status"],
        "accuracy": float(accuracy),
        "metrics": dict(metrics),
        "confusionMatrix": dict(confusion),
        "nodes": [
            {"nodeType": node["node_type"], "status": node["status"]}
            for node in nodes
        ],
        "artifacts": [
            {
                "id": str(artifact["id"]),
                "name": artifact["name"],
                "artifactType": artifact["artifact_type"],
                "storageUri": artifact["storage_uri"],
            }
            for artifact in artifacts
        ],
    }


def cleanup_created_resources(
    *,
    connection: Any,
    redis_client: Redis,
    minio_client: Minio,
    bucket: str,
    resources: CreatedResources,
) -> bool:
    """Delete only rows, messages, and objects identified by this invocation."""

    with connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT status
                FROM workflow_runs
                WHERE id = %s
                FOR UPDATE
                """,
                (resources.run_id,),
            )
            run = cursor.fetchone()
            if run is not None and run[0] == "pending":
                cursor.execute(
                    """
                    UPDATE workflow_runs
                    SET status = 'cancelled', finished_at = now()
                    WHERE id = %s AND status = 'pending'
                    """,
                    (resources.run_id,),
                )
                run = ("cancelled",)
            if run is not None and run[0] == "running":
                print(
                    "Cleanup deferred: the worker is still running this exact "
                    f"run ({resources.run_id}). No live resources were deleted.",
                    file=sys.stderr,
                )
                return False
            cursor.execute(
                """
                SELECT storage_uri
                FROM artifacts
                WHERE workflow_run_id = %s
                """,
                (resources.run_id,),
            )
            artifact_uris = [str(row[0]) for row in cursor.fetchall()]

    object_names = {
        object_key_from_uri(resources.dataset_object_key, bucket),
        *(
            object_key_from_uri(storage_uri, bucket)
            for storage_uri in artifact_uris
        ),
    }
    artifact_prefix = f"runs/{resources.run_id}/artifacts/"
    for item in minio_client.list_objects(
        bucket, prefix=artifact_prefix, recursive=True
    ):
        object_names.add(item.object_name)
    for object_name in sorted(object_names):
        try:
            minio_client.remove_object(bucket, object_name)
        except Exception as exc:
            raise DemoError(
                f"Could not remove smoke object {object_name!r}: {exc}"
            ) from exc

    with connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM model_registries
                WHERE artifact_id IN (
                    SELECT id FROM artifacts WHERE workflow_run_id = %s
                )
                """,
                (resources.run_id,),
            )
            cursor.execute(
                "DELETE FROM artifacts WHERE workflow_run_id = %s",
                (resources.run_id,),
            )
            cursor.execute(
                "DELETE FROM node_executions WHERE workflow_run_id = %s",
                (resources.run_id,),
            )
            cursor.execute(
                "DELETE FROM workflow_run_datasets WHERE run_id = %s",
                (resources.run_id,),
            )
            cursor.execute(
                """
                DELETE FROM workflow_runs
                WHERE id = %s
                """,
                (resources.run_id,),
            )
            cursor.execute(
                """
                DELETE FROM datasets
                WHERE id = %s
                """,
                (resources.dataset_id,),
            )

    if resources.job_id:
        try:
            redis_client.xack(
                resources.job_stream,
                resources.consumer_group,
                resources.job_id,
            )
        except ResponseError:
            pass
        redis_client.xdel(resources.job_stream, resources.job_id)
    redis_client.delete(resources.event_stream)
    print(f"Cleaned smoke resources for run {resources.run_id}.")
    return True


def parser() -> argparse.ArgumentParser:
    argument_parser = argparse.ArgumentParser(
        description=(
            "Upload an Iris CSV and execute the real six-node worker pipeline."
        )
    )
    argument_parser.add_argument(
        "iris_csv",
        type=Path,
        help="Path to Kaggle uciml/iris Iris.csv",
    )
    argument_parser.add_argument(
        "--timeout",
        type=float,
        default=180.0,
        help="Seconds to wait for terminal worker state (default: 180)",
    )
    cleanup_group = argument_parser.add_mutually_exclusive_group()
    cleanup_group.add_argument(
        "--cleanup",
        dest="cleanup",
        action="store_true",
        default=True,
        help="Cleanup this invocation's resources after printing results (default)",
    )
    cleanup_group.add_argument(
        "--keep",
        dest="cleanup",
        action="store_false",
        help="Keep this invocation's rows, Redis events, and MinIO objects",
    )
    return argument_parser


def execute(args: argparse.Namespace) -> dict[str, Any]:
    if args.timeout <= 0:
        raise DemoError("--timeout must be positive")
    fixture = load_iris_fixture(args.iris_csv)
    settings = Settings.from_env()
    session_id = uuid.uuid4().hex[:12]
    run_id = str(uuid.uuid4())
    dataset_id = str(uuid.uuid4())
    dataset_object_key = (
        f"smoke-tests/{session_id}/datasets/{dataset_id}/Iris.csv"
    )
    resources = CreatedResources(
        session_id=session_id,
        run_id=run_id,
        dataset_id=dataset_id,
        dataset_object_key=dataset_object_key,
        event_stream=f"{settings.event_stream_prefix}:{run_id}:events",
        job_stream=settings.job_stream,
        consumer_group=settings.consumer_group,
    )
    connection = psycopg2.connect(settings.postgres_dsn)
    redis_client = Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password,
        db=settings.redis_db,
        decode_responses=True,
    )
    minio_client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )
    succeeded = False
    try:
        redis_client.ping()
        if not minio_client.bucket_exists(settings.minio_bucket):
            minio_client.make_bucket(settings.minio_bucket)
        definitions = load_block_definitions(connection)
        graph, node_ids = build_graph(
            session_id=session_id,
            dataset_id=dataset_id,
            definitions=definitions,
        )
        job = build_job(
            run_id=run_id,
            dataset_id=dataset_id,
            dataset_object_key=dataset_object_key,
            fixture=fixture,
            graph=graph,
            definitions=definitions,
        )
        minio_client.put_object(
            settings.minio_bucket,
            dataset_object_key,
            data=io.BytesIO(fixture.content),
            length=len(fixture.content),
            content_type="text/csv",
        )
        seed_database(
            connection,
            resources=resources,
            fixture=fixture,
            graph=graph,
            node_ids=node_ids,
        )
        resources.job_id = enqueue_job(
            redis_client,
            resources=resources,
            job=job,
            event_maxlen=settings.event_stream_maxlen,
            event_ttl_seconds=settings.event_stream_ttl_seconds,
        )
        print(
            f"Queued Iris smoke run {run_id} with dataset {dataset_id} "
            f"({fixture.row_count} rows), Redis job {resources.job_id}.",
            flush=True,
        )
        wait_for_terminal(
            redis_client,
            connection,
            resources=resources,
            timeout_seconds=args.timeout,
        )
        result = read_result(
            connection,
            resources=resources,
            evaluation_node_id=node_ids["evaluate"],
        )
        print("\nIris smoke result:")
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
        succeeded = True
        return result
    finally:
        try:
            if args.cleanup:
                cleanup_created_resources(
                    connection=connection,
                    redis_client=redis_client,
                    minio_client=minio_client,
                    bucket=settings.minio_bucket,
                    resources=resources,
                )
            elif not succeeded:
                print(
                    f"Smoke resources retained for failed run {run_id} "
                    "because --keep was specified.",
                    file=sys.stderr,
                )
        finally:
            connection.close()
            redis_client.close()


def main() -> int:
    args = parser().parse_args()
    try:
        execute(args)
    except (ConfigurationError, DemoError) as exc:
        print(f"Iris smoke demo failed: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Iris smoke demo interrupted.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(
            f"Iris smoke demo failed with unexpected error: {exc}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
