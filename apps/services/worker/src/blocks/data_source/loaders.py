"""CSV, JSON, and XML dataset source executors."""

from __future__ import annotations

import io
import json
from typing import Any, Mapping

import pandas as pd
from lxml import etree

from ...runtime import (
    BlockContext,
    BlockExecutionError,
    BlockResult,
    DatasetValue,
)
from ...storage import object_key_from_uri
from ..base import Block
from ..utils import nested_options


class _DatasetLoader(Block):
    expected_format: str

    def _descriptor(
        self, context: BlockContext, config: Mapping[str, Any]
    ) -> tuple[str, Mapping[str, Any]]:
        dataset_id = str(config.get("dataset") or "").strip()
        if not dataset_id:
            raise BlockExecutionError("config.dataset is required")
        descriptor = context.dataset(dataset_id)
        actual_format = str(descriptor.get("format") or "").lower()
        if actual_format != self.expected_format:
            raise BlockExecutionError(
                f"Dataset {dataset_id} has format {actual_format!r}; "
                f"{self.executor_key} requires {self.expected_format!r}"
            )
        storage_uri = (
            descriptor.get("storageUri")
            or descriptor.get("objectKey")
            or descriptor.get("storage_uri")
        )
        if not storage_uri:
            raise BlockExecutionError(
                f"Dataset {dataset_id} does not contain a storage URI"
            )
        return dataset_id, descriptor

    @staticmethod
    def _result(
        context: BlockContext, dataset_id: str, frame: pd.DataFrame
    ) -> BlockResult:
        if frame.empty:
            raise BlockExecutionError("Loaded dataset contains no records")
        frame.columns = [str(column) for column in frame.columns]
        value = DatasetValue(
            frame=frame,
            lineage=(dataset_id, context.node_id),
        )
        mem_mb = frame.memory_usage(deep=True).sum() / (1024 * 1024)
        null_count = int(frame.isnull().sum().sum())
        cols_str = ", ".join(list(frame.columns)[:6])
        if len(frame.columns) > 6:
            cols_str += f", ... (+{len(frame.columns)-6} more)"

        logs: list[tuple[str, str]] = [
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" [DATA SOURCE] Loaded Dataset ID: '{dataset_id}'"),
            ("info", "════════════════════════════════════════════════════════════════"),
            ("info", f" ► Record count      : {len(frame)} rows"),
            ("info", f" ► Feature count     : {len(frame.columns)} columns"),
            ("info", f" ► Memory footprint   : {mem_mb:.3f} MB"),
            ("info", f" ► Missing values    : {null_count} nulls total"),
            ("info", f" ► Schema / Columns  : [{cols_str}]"),
            ("info", "════════════════════════════════════════════════════════════════"),
        ]
        return BlockResult(
            outputs={"dataset": value},
            summary=value.summary(),
            logs=tuple(logs),
        )


class LoadCsvBlock(_DatasetLoader):
    executor_key = "load_csv"
    version = 1
    expected_format = "csv"

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset_id, descriptor = self._descriptor(context, config)
        if inputs:
            raise BlockExecutionError("Load CSV does not accept input ports")
        uri = str(
            descriptor.get("storageUri")
            or descriptor.get("objectKey")
            or descriptor.get("storage_uri")
        )
        raw = context.storage.get_bytes(
            object_key_from_uri(uri, context.storage.bucket)
        )
        options = nested_options(descriptor, "csv")
        profile = descriptor.get("profile")
        profile = profile if isinstance(profile, Mapping) else {}
        delimiter = str(options.get("delimiter") or profile.get("delimiter") or ",")
        if len(delimiter) != 1:
            raise BlockExecutionError("CSV delimiter must be one character")
        encoding = str(options.get("encoding") or profile.get("encoding") or "utf-8")
        has_header = options.get("hasHeader")
        if has_header is None:
            has_header = profile.get("hasHeader", True)
        try:
            frame = pd.read_csv(
                io.BytesIO(raw),
                sep=delimiter,
                encoding=encoding,
                header=0 if bool(has_header) else None,
            )
        except Exception as exc:
            raise BlockExecutionError(f"Could not parse CSV dataset: {exc}") from exc
        if not bool(has_header):
            frame.columns = [f"column_{index}" for index in range(len(frame.columns))]
        return self._result(context, dataset_id, frame)


class LoadJsonBlock(_DatasetLoader):
    executor_key = "load_json"
    version = 1
    expected_format = "json"

    @staticmethod
    def _by_path(value: Any, path: str) -> Any:
        current = value
        for segment in path.split("."):
            if not isinstance(current, Mapping) or segment not in current:
                raise BlockExecutionError(
                    f"JSON recordsPath {path!r} does not exist"
                )
            current = current[segment]
        return current

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset_id, descriptor = self._descriptor(context, config)
        if inputs:
            raise BlockExecutionError("Load JSON does not accept input ports")
        uri = str(
            descriptor.get("storageUri")
            or descriptor.get("objectKey")
            or descriptor.get("storage_uri")
        )
        try:
            parsed = json.loads(
                context.storage.get_bytes(
                    object_key_from_uri(uri, context.storage.bucket)
                ).decode("utf-8-sig")
            )
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise BlockExecutionError(f"Could not parse JSON dataset: {exc}") from exc
        options = nested_options(descriptor, "json")
        records_path = str(options.get("recordsPath") or "").strip()
        records = self._by_path(parsed, records_path) if records_path else parsed
        if not isinstance(records, list) or not records:
            raise BlockExecutionError(
                "JSON dataset must be a non-empty root array or recordsPath array"
            )
        if not all(isinstance(record, Mapping) for record in records):
            raise BlockExecutionError("Every JSON record must be an object")
        frame = pd.json_normalize(records, sep=".")
        return self._result(context, dataset_id, frame)


class LoadXmlBlock(_DatasetLoader):
    executor_key = "load_xml"
    version = 1
    expected_format = "xml"

    @staticmethod
    def _local_name(element: etree._Element) -> str:
        return etree.QName(element).localname

    @classmethod
    def _flatten(
        cls, element: etree._Element, prefix: str = ""
    ) -> dict[str, Any]:
        record: dict[str, Any] = {}
        for key, value in element.attrib.items():
            name = f"{prefix}@_{etree.QName(key).localname}"
            record[name] = value
        children = [child for child in element if isinstance(child.tag, str)]
        if not children:
            if prefix:
                record[prefix.rstrip(".")] = (element.text or "").strip()
            return record
        for child in children:
            name = cls._local_name(child)
            child_prefix = f"{prefix}{name}"
            nested = cls._flatten(child, f"{child_prefix}.")
            if nested:
                for key, value in nested.items():
                    unique_key = key
                    suffix = 2
                    while unique_key in record:
                        unique_key = f"{key}_{suffix}"
                        suffix += 1
                    record[unique_key] = value
            else:
                record[child_prefix] = (child.text or "").strip()
        return record

    def execute(
        self,
        context: BlockContext,
        inputs: Mapping[str, Any],
        config: Mapping[str, Any],
    ) -> BlockResult:
        dataset_id, descriptor = self._descriptor(context, config)
        if inputs:
            raise BlockExecutionError("Load XML does not accept input ports")
        uri = str(
            descriptor.get("storageUri")
            or descriptor.get("objectKey")
            or descriptor.get("storage_uri")
        )
        raw = context.storage.get_bytes(
            object_key_from_uri(uri, context.storage.bucket)
        )
        try:
            root = etree.fromstring(
                raw,
                parser=etree.XMLParser(resolve_entities=False, no_network=True),
            )
        except etree.XMLSyntaxError as exc:
            raise BlockExecutionError(f"Could not parse XML dataset: {exc}") from exc
        options = nested_options(descriptor, "xml")
        profile = descriptor.get("profile")
        profile = profile if isinstance(profile, Mapping) else {}
        record_element = str(
            options.get("recordElement") or profile.get("recordElement") or ""
        ).strip()
        if record_element:
            records = [
                element
                for element in root.iter()
                if self._local_name(element) == record_element
            ]
        else:
            records = [
                child for child in root if isinstance(child.tag, str)
            ]
        if not records:
            raise BlockExecutionError("XML dataset contains no record elements")
        frame = pd.DataFrame([self._flatten(record) for record in records])
        return self._result(context, dataset_id, frame)
