"""Long-running Redis Streams consumer for workflow execution jobs."""

from __future__ import annotations

import json
import logging
import signal
import sys
import threading
from typing import Any, Mapping

from redis import Redis
from redis.exceptions import ResponseError

from .config import ConfigurationError, Settings
from .database import Database
from .events import EventPublisher
from .registry import DEFAULT_REGISTRY
from .runner import PipelineRunner
from .storage import MinioObjectStorage

LOGGER = logging.getLogger("ml-worker")


class WorkerService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.stop_event = threading.Event()
        self.redis = Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password,
            db=settings.redis_db,
            decode_responses=True,
            health_check_interval=30,
        )
        self.database = Database(settings.postgres_dsn)
        self.storage = MinioObjectStorage(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            bucket=settings.minio_bucket,
            secure=settings.minio_secure,
        )
        self.events = EventPublisher(
            self.redis,
            stream_prefix=settings.event_stream_prefix,
            maxlen=settings.event_stream_maxlen,
            ttl_seconds=settings.event_stream_ttl_seconds,
        )
        self.runner = PipelineRunner(
            database=self.database,
            events=self.events,
            storage=self.storage,
            registry=DEFAULT_REGISTRY,
        )
        self.worker_id: str | None = None

    def request_stop(self, *_: Any) -> None:
        LOGGER.info("Shutdown requested")
        self.stop_event.set()

    def _ensure_consumer_group(self) -> None:
        try:
            self.redis.xgroup_create(
                self.settings.job_stream,
                self.settings.consumer_group,
                id="0-0",
                mkstream=True,
            )
        except ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    def start(self) -> None:
        self.redis.ping()
        self.storage.ensure_bucket()
        self._ensure_consumer_group()
        capability = {
            "schemaVersion": 1,
            "executors": [
                {"executorKey": key, "version": version}
                for key, version in sorted(DEFAULT_REGISTRY.keys())
            ],
        }
        self.worker_id = self.database.register_worker(
            capability=capability
        )
        LOGGER.info(
            "Worker %s is consuming %s as %s",
            self.worker_id,
            self.settings.job_stream,
            self.settings.consumer_name,
        )
        try:
            self._consume()
        finally:
            if self.worker_id is not None:
                try:
                    self.database.set_worker_status(self.worker_id, "offline")
                except Exception:
                    LOGGER.exception("Could not mark worker offline")
            self.database.close()
            self.redis.close()

    def _consume(self) -> None:
        assert self.worker_id is not None
        while not self.stop_event.is_set():
            messages = self.redis.xreadgroup(
                groupname=self.settings.consumer_group,
                consumername=self.settings.consumer_name,
                streams={self.settings.job_stream: ">"},
                count=1,
                block=self.settings.poll_ms,
            )
            if not messages:
                continue
            for _, entries in messages:
                for message_id, fields in entries:
                    self._handle(message_id, fields)

    def _handle(self, message_id: str, fields: Mapping[str, Any]) -> None:
        assert self.worker_id is not None
        encoded = fields.get("payload")
        if not isinstance(encoded, str):
            LOGGER.error("ACK poison job %s: missing payload field", message_id)
            self._ack(message_id)
            return
        try:
            payload = json.loads(encoded)
            if not isinstance(payload, Mapping):
                raise ValueError("payload must decode to an object")
        except (json.JSONDecodeError, ValueError) as exc:
            LOGGER.error("ACK poison job %s: %s", message_id, exc)
            self._ack(message_id)
            return

        self.database.set_worker_status(self.worker_id, "busy")
        try:
            outcome = self.runner.run(payload, self.worker_id)
            if outcome.acknowledged:
                self._ack(message_id)
            LOGGER.info("Run %s finished with %s", outcome.run_id, outcome.status)
        except Exception:
            # No ACK: the job remains pending because no terminal state was
            # durably recorded. V1 deliberately does not auto-reclaim it.
            LOGGER.exception("Infrastructure failure while handling job %s", message_id)
        finally:
            self.database.set_worker_status(self.worker_id, "idle")

    def _ack(self, message_id: str) -> None:
        self.redis.xack(
            self.settings.job_stream,
            self.settings.consumer_group,
            message_id,
        )


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    try:
        settings = Settings.from_env()
    except ConfigurationError as exc:
        LOGGER.error("%s", exc)
        return 2
    service = WorkerService(settings)
    signal.signal(signal.SIGTERM, service.request_stop)
    signal.signal(signal.SIGINT, service.request_stop)
    try:
        service.start()
    except KeyboardInterrupt:
        service.request_stop()
    except Exception:
        LOGGER.exception("Worker terminated unexpectedly")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
