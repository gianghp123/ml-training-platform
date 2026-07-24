from __future__ import annotations

import json

import pytest

from src.events import EventPublisher
from src.storage import object_key_from_uri


class FakeRedis:
    def __init__(self):
        self.added = []
        self.expired = []

    def xadd(self, stream, fields, **kwargs):
        self.added.append((stream, fields, kwargs))
        return b"123-0"

    def expire(self, stream, ttl):
        self.expired.append((stream, ttl))


def test_event_publisher_uses_canonical_payload_field():
    redis = FakeRedis()
    publisher = EventPublisher(
        redis,
        stream_prefix="custom:workflow:runs",
        maxlen=100,
        ttl_seconds=60,
    )
    event_id = publisher.publish(
        "node.completed",
        "run-1",
        node_id="node-1",
        payload={"durationMs": 5},
    )
    stream, fields, options = redis.added[0]
    assert event_id == "123-0"
    assert stream == "custom:workflow:runs:run-1:events"
    assert set(fields) == {"payload"}
    assert json.loads(fields["payload"])["payload"] == {"durationMs": 5}
    assert options == {"maxlen": 100, "approximate": True}
    assert redis.expired == [(stream, 60)]


@pytest.mark.parametrize(
    ("uri", "expected"),
    [
        ("users/u/data.csv", "users/u/data.csv"),
        ("s3://bucket/users/u/data.csv", "users/u/data.csv"),
        ("minio://bucket/users/u/data.csv", "users/u/data.csv"),
        ("http://minio:9000/bucket/users/u/data.csv", "users/u/data.csv"),
    ],
)
def test_object_key_from_uri(uri, expected):
    assert object_key_from_uri(uri, "bucket") == expected


def test_object_key_rejects_other_bucket():
    with pytest.raises(ValueError, match="does not match"):
        object_key_from_uri("s3://other/key", "bucket")
