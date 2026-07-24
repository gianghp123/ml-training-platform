"""MinIO object storage adapter."""

from __future__ import annotations

import io
from urllib.parse import urlparse

from minio import Minio


def object_key_from_uri(uri: str, bucket: str) -> str:
    """Accept raw object keys as well as s3:// and minio:// URIs."""

    value = str(uri or "").strip()
    if not value:
        raise ValueError("Dataset storage URI is empty")
    parsed = urlparse(value)
    if parsed.scheme in {"s3", "minio"}:
        if parsed.netloc and parsed.netloc != bucket:
            raise ValueError(
                f"Storage URI bucket {parsed.netloc!r} does not match {bucket!r}"
            )
        return parsed.path.lstrip("/")
    if parsed.scheme in {"http", "https"}:
        path = parsed.path.lstrip("/")
        prefix = f"{bucket}/"
        return path[len(prefix) :] if path.startswith(prefix) else path
    return value.lstrip("/")


class MinioObjectStorage:
    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool,
    ) -> None:
        self.bucket = bucket
        self._client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )

    def ensure_bucket(self) -> None:
        if not self._client.bucket_exists(self.bucket):
            self._client.make_bucket(self.bucket)

    def get_bytes(self, object_key: str) -> bytes:
        response = self._client.get_object(
            self.bucket, object_key_from_uri(object_key, self.bucket)
        )
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def put_bytes(
        self, object_key: str, data: bytes, content_type: str
    ) -> str:
        normalized = object_key_from_uri(object_key, self.bucket)
        payload = io.BytesIO(data)
        self._client.put_object(
            self.bucket,
            normalized,
            payload,
            len(data),
            content_type=content_type,
        )
        return normalized
