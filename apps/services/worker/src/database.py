"""Small PostgreSQL repository used by the Python execution worker."""

from __future__ import annotations

import socket
from contextlib import contextmanager
from typing import Any, Iterator, Mapping

from psycopg2 import pool
from psycopg2.extras import Json, RealDictCursor

from .runtime import json_safe


class Database:
    def __init__(self, dsn: str, *, min_connections: int = 1, max_connections: int = 4):
        self._pool = pool.ThreadedConnectionPool(
            min_connections, max_connections, dsn=dsn
        )

    @contextmanager
    def _connection(self) -> Iterator[Any]:
        connection = self._pool.getconn()
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            self._pool.putconn(connection)

    def close(self) -> None:
        self._pool.closeall()

    def register_worker(
        self, hostname: str | None = None, capability: Mapping[str, Any] | None = None
    ) -> str:
        actual_hostname = hostname or socket.gethostname()
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO workers (hostname, status, last_heartbeat, capability)
                VALUES (%s, 'idle', now(), %s)
                ON CONFLICT (hostname) DO UPDATE
                SET status = 'idle',
                    last_heartbeat = now(),
                    capability = EXCLUDED.capability
                RETURNING id
                """,
                (actual_hostname, Json(json_safe(capability or {}))),
            )
            return str(cursor.fetchone()[0])

    def set_worker_status(self, worker_id: str, status: str) -> None:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE workers
                SET status = %s, last_heartbeat = now()
                WHERE id = %s
                """,
                (status, worker_id),
            )

    def start_run(self, run_id: str) -> bool:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE workflow_runs
                SET status = 'running', started_at = COALESCE(started_at, now())
                WHERE id = %s AND status = 'pending'
                RETURNING id
                """,
                (run_id,),
            )
            return cursor.fetchone() is not None

    def complete_run(self, run_id: str) -> None:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE workflow_runs
                SET status = 'completed', finished_at = now()
                WHERE id = %s
                """,
                (run_id,),
            )

    def fail_run(self, run_id: str) -> None:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE workflow_runs
                SET status = 'failed', finished_at = now()
                WHERE id = %s AND status NOT IN ('completed', 'cancelled')
                """,
                (run_id,),
            )

    def start_node(self, run_id: str, node_id: str, worker_id: str) -> str:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE node_executions
                SET status = 'running',
                    worker_id = %s,
                    started_at = COALESCE(started_at, now()),
                    finished_at = NULL,
                    error_message = NULL
                WHERE workflow_run_id = %s AND node_id = %s
                RETURNING id
                """,
                (worker_id, run_id, node_id),
            )
            row = cursor.fetchone()
            if row is None:
                raise RuntimeError(
                    f"Node execution row is missing for run {run_id}, node {node_id}"
                )
            return str(row[0])

    def complete_node(
        self, run_id: str, node_id: str, summary: Mapping[str, Any]
    ) -> None:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE node_executions
                SET status = 'completed',
                    finished_at = now(),
                    output_summary = %s,
                    error_message = NULL
                WHERE workflow_run_id = %s AND node_id = %s
                """,
                (Json(json_safe(summary)), run_id, node_id),
            )

    def fail_node(self, run_id: str, node_id: str, error: str) -> None:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE node_executions
                SET status = 'failed', finished_at = now(), error_message = %s
                WHERE workflow_run_id = %s AND node_id = %s
                """,
                (error, run_id, node_id),
            )

    def skip_pending_nodes(self, run_id: str) -> None:
        with self._connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE node_executions
                SET status = 'skipped', finished_at = now()
                WHERE workflow_run_id = %s AND status = 'pending'
                """,
                (run_id,),
            )

    def create_artifact(
        self,
        *,
        run_id: str,
        node_execution_id: str,
        name: str,
        artifact_type: str,
        mime_type: str,
        storage_uri: str,
        metadata: Mapping[str, Any],
    ) -> dict[str, Any]:
        with self._connection() as connection, connection.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:
            cursor.execute(
                """
                INSERT INTO artifacts (
                    workflow_run_id, node_execution_id, name, artifact_type,
                    mime_type, storage_uri, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, node_execution_id, name, artifact_type,
                          mime_type, storage_uri, metadata, created_at
                """,
                (
                    run_id,
                    node_execution_id,
                    name,
                    artifact_type,
                    mime_type,
                    storage_uri,
                    Json(json_safe(metadata)),
                ),
            )
            row = dict(cursor.fetchone())
            return {
                "id": str(row["id"]),
                "nodeExecutionId": str(row["node_execution_id"]),
                "name": row["name"],
                "artifactType": row["artifact_type"],
                "mimeType": row["mime_type"],
                "storageUri": row["storage_uri"],
                "metadata": json_safe(row["metadata"] or {}),
                "createdAt": row["created_at"].isoformat(),
            }
