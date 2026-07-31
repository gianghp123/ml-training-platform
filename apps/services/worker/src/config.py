"""Environment-backed worker configuration."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k and k not in os.environ:
                    os.environ[k] = v


_load_env_file()


class ConfigurationError(ValueError):
    """Raised when required worker configuration is missing or invalid."""


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigurationError(f"Required environment variable {name} is not set")
    return value


def _integer(name: str, default: int, *, minimum: int = 0) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be an integer") from exc
    if value < minimum:
        raise ConfigurationError(f"{name} must be at least {minimum}")
    return value


def _boolean(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ConfigurationError(f"{name} must be a boolean")


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_username: str
    db_password: str
    db_name: str
    redis_host: str
    redis_port: int
    redis_password: str | None
    redis_db: int
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    minio_secure: bool
    job_stream: str
    consumer_group: str
    consumer_name: str
    poll_ms: int
    event_stream_prefix: str
    event_stream_maxlen: int
    event_stream_ttl_seconds: int

    @classmethod
    def from_env(cls) -> "Settings":
        endpoint = _required("MINIO_ENDPOINT")
        secure = _boolean("MINIO_USE_SSL", False)
        if "://" in endpoint:
            parsed = urlparse(endpoint)
            if not parsed.hostname:
                raise ConfigurationError("MINIO_ENDPOINT is not a valid endpoint")
            secure = parsed.scheme.lower() == "https"
            endpoint = parsed.netloc
        elif ":" not in endpoint:
            endpoint = f"{endpoint}:{_integer('MINIO_PORT', 9000, minimum=1)}"

        password = os.getenv("REDIS_PASSWORD", "").strip() or None
        default_consumer = f"{socket.gethostname()}-{os.getpid()}"
        event_stream_prefix = os.getenv(
            "WORKFLOW_EVENT_STREAM_PREFIX", "ml:workflow:runs"
        ).strip().rstrip(":")
        if not event_stream_prefix:
            raise ConfigurationError(
                "WORKFLOW_EVENT_STREAM_PREFIX must not be empty"
            )
        return cls(
            db_host=_required("DB_HOST"),
            db_port=_integer("DB_PORT", 5432, minimum=1),
            db_username=_required("DB_USERNAME"),
            db_password=_required("DB_PASSWORD"),
            db_name=_required("DB_NAME"),
            redis_host=_required("REDIS_HOST"),
            redis_port=_integer("REDIS_PORT", 6379, minimum=1),
            redis_password=password,
            redis_db=_integer("REDIS_DB", 0),
            minio_endpoint=endpoint,
            minio_access_key=_required("MINIO_ACCESS_KEY"),
            minio_secret_key=_required("MINIO_SECRET_KEY"),
            minio_bucket=_required("MINIO_BUCKET"),
            minio_secure=secure,
            job_stream=os.getenv("WORKFLOW_JOB_STREAM", "ml:workflow:jobs"),
            consumer_group=os.getenv(
                "WORKFLOW_CONSUMER_GROUP", "python-workers"
            ),
            consumer_name=os.getenv("WORKER_CONSUMER_NAME", default_consumer),
            poll_ms=_integer("WORKER_POLL_MS", 5000, minimum=100),
            event_stream_prefix=event_stream_prefix,
            event_stream_maxlen=_integer(
                "EVENT_STREAM_MAXLEN", 10_000, minimum=100
            ),
            event_stream_ttl_seconds=_integer(
                "EVENT_STREAM_TTL_SECONDS", 86_400, minimum=60
            ),
        )

    @property
    def postgres_dsn(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
            f"user={self.db_username} password={self.db_password}"
        )
