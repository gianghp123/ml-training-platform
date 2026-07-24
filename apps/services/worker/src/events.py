"""Structured run-event publisher backed by Redis Streams."""

from __future__ import annotations

import json
from typing import Any

from redis import Redis

from .runtime import iso_now, json_safe


class EventPublisher:
    def __init__(
        self,
        redis_client: Redis,
        *,
        stream_prefix: str = "ml:workflow:runs",
        maxlen: int = 10_000,
        ttl_seconds: int = 86_400,
    ) -> None:
        self._redis = redis_client
        self._stream_prefix = stream_prefix.rstrip(":")
        self._maxlen = maxlen
        self._ttl_seconds = ttl_seconds

    def stream_name(self, run_id: str) -> str:
        return f"{self._stream_prefix}:{run_id}:events"

    def publish(
        self,
        event_type: str,
        run_id: str,
        *,
        node_id: str | None = None,
        level: str | None = None,
        message: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> str:
        event: dict[str, Any] = {
            "type": event_type,
            "runId": run_id,
            "timestamp": iso_now(),
        }
        if node_id is not None:
            event["nodeId"] = node_id
        if level is not None:
            event["level"] = level
        if message is not None:
            event["message"] = message
        if payload is not None:
            event["payload"] = json_safe(payload)

        stream = self.stream_name(run_id)
        event_id = self._redis.xadd(
            stream,
            {"payload": json.dumps(event, separators=(",", ":"), ensure_ascii=False)},
            maxlen=self._maxlen,
            approximate=True,
        )
        self._redis.expire(stream, self._ttl_seconds)
        if isinstance(event_id, bytes):
            return event_id.decode("utf-8")
        return str(event_id)
