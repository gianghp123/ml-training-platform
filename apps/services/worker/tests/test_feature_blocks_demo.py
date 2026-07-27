"""End-to-end test for the branched feature blocks demo pipeline."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

from src.runner import PipelineRunner
from src.storage import MinioObjectStorage

from tests.test_runner import FakeDatabase, FakeEvents  # type: ignore[import-untyped]

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from feature_blocks_demo import build_job  # noqa: E402


RENAME_MAP = {
    "sepal_length": "SepalLengthCm",
    "sepal_width": "SepalWidthCm",
    "petal_length": "PetalLengthCm",
    "petal_width": "PetalWidthCm",
    "species": "Species",
}


class _FakeStorage(MinioObjectStorage):
    def __init__(self) -> None:
        self.bucket = "ml-platform"
        self.objects: dict[str, bytes] = {}

    def get_bytes(self, object_key: str) -> bytes:
        return self.objects[object_key]

    def put_bytes(self, object_key: str, data: bytes, content_type: str) -> str:
        self.objects[object_key] = data
        return object_key


def _load_iris_csv_bytes() -> bytes:
    frame = pd.read_csv(
        "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv"
    )
    frame = frame.rename(columns=RENAME_MAP)
    return frame.to_csv(index=False).encode("utf-8")


def test_feature_blocks_demo_completes():
    storage = _FakeStorage()
    storage.objects["datasets/iris.csv"] = _load_iris_csv_bytes()
    db = FakeDatabase()
    events = FakeEvents()
    runner = PipelineRunner(database=db, events=events, storage=storage)
    job = build_job(run_id="run-1", dataset_id="iris")
    outcome = runner.run(job, worker_id="worker-1")
    assert outcome.status == "completed"
    eval_summary = db.summaries.get("eval", {})
    assert "accuracy" in str(eval_summary)
