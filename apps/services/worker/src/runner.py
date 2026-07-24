"""Job validation and deterministic in-memory DAG execution."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from .registry import BlockRegistry, DEFAULT_REGISTRY
from .runtime import (
    BlockContext,
    GraphValidationError,
    JobValidationError,
    PipelineError,
    json_safe,
    summarize_outputs,
)


class DatabasePort(Protocol):
    def start_run(self, run_id: str) -> bool:
        ...

    def complete_run(self, run_id: str) -> None:
        ...

    def fail_run(self, run_id: str) -> None:
        ...

    def start_node(self, run_id: str, node_id: str, worker_id: str) -> str:
        ...

    def complete_node(
        self, run_id: str, node_id: str, summary: Mapping[str, Any]
    ) -> None:
        ...

    def fail_node(self, run_id: str, node_id: str, error: str) -> None:
        ...

    def skip_pending_nodes(self, run_id: str) -> None:
        ...

    def create_artifact(self, **kwargs: Any) -> dict[str, Any]:
        ...


class EventPort(Protocol):
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
        ...


@dataclass(frozen=True)
class GraphNode:
    id: str
    block_id: str
    block_version: int
    config: Mapping[str, Any]


@dataclass(frozen=True)
class GraphEdge:
    id: str
    source_node_id: str
    source_port_id: str
    target_node_id: str
    target_port_id: str


@dataclass(frozen=True)
class BlockDescriptor:
    id: str
    version: int
    executor_key: str
    name: str
    ports: Mapping[str, Any]

    def input_ports(self) -> tuple[str, ...]:
        return _port_ids(self.ports.get("inputs"))

    def output_ports(self) -> tuple[str, ...]:
        return _port_ids(self.ports.get("outputs"))


def _port_ids(raw: Any) -> tuple[str, ...]:
    if raw is None:
        return ()
    if not isinstance(raw, Sequence) or isinstance(raw, (str, bytes, bytearray)):
        raise JobValidationError("Block ports must be arrays")
    result: list[str] = []
    for port in raw:
        if not isinstance(port, Mapping) or not str(port.get("id") or "").strip():
            raise JobValidationError("Every block port must contain an id")
        result.append(str(port["id"]))
    if len(result) != len(set(result)):
        raise JobValidationError("Block descriptor contains duplicate port ids")
    return tuple(result)


@dataclass(frozen=True)
class PipelineJob:
    run_id: str
    user_id: str | None
    nodes: tuple[GraphNode, ...]
    edges: tuple[GraphEdge, ...]
    blocks: Mapping[tuple[str, int], BlockDescriptor]
    datasets: Mapping[str, Mapping[str, Any]]

    @classmethod
    def from_mapping(cls, payload: Mapping[str, Any]) -> "PipelineJob":
        if not isinstance(payload, Mapping):
            raise JobValidationError("Job payload must be a JSON object")
        if payload.get("schemaVersion") != 1:
            raise JobValidationError("Unsupported job schemaVersion; expected 1")
        run_id = str(payload.get("runId") or "").strip()
        if not run_id:
            raise JobValidationError("Job runId is required")
        graph = payload.get("graph")
        if not isinstance(graph, Mapping):
            raise JobValidationError("Job graph must be an object")
        raw_nodes = graph.get("nodes")
        raw_edges = graph.get("edges")
        if not isinstance(raw_nodes, list) or not raw_nodes:
            raise JobValidationError("Job graph.nodes must be a non-empty array")
        if not isinstance(raw_edges, list):
            raise JobValidationError("Job graph.edges must be an array")

        nodes: list[GraphNode] = []
        for raw in raw_nodes:
            if not isinstance(raw, Mapping):
                raise JobValidationError("Every graph node must be an object")
            node_id = str(raw.get("id") or "").strip()
            block_id = str(raw.get("blockId") or "").strip()
            block_version = raw.get("blockVersion")
            config = raw.get("config", {})
            if (
                not node_id
                or not block_id
                or not isinstance(block_version, int)
                or block_version <= 0
                or not isinstance(config, Mapping)
            ):
                raise JobValidationError(
                    "Each node requires id, blockId, positive blockVersion, and config"
                )
            nodes.append(
                GraphNode(node_id, block_id, block_version, dict(config))
            )

        edges: list[GraphEdge] = []
        for raw in raw_edges:
            if not isinstance(raw, Mapping):
                raise JobValidationError("Every graph edge must be an object")
            values = [
                str(raw.get(field) or "").strip()
                for field in (
                    "id",
                    "sourceNodeId",
                    "sourcePortId",
                    "targetNodeId",
                    "targetPortId",
                )
            ]
            if not all(values):
                raise JobValidationError(
                    "Each edge requires id, source/target node IDs, and port IDs"
                )
            edges.append(GraphEdge(*values))

        blocks: dict[tuple[str, int], BlockDescriptor] = {}
        for fallback_id, raw in _records(payload.get("blocks"), "blocks"):
            block_id = str(raw.get("id") or fallback_id or "").strip()
            version = raw.get("version")
            executor_key = str(raw.get("executorKey") or "").strip()
            name = str(raw.get("name") or executor_key).strip()
            ports = raw.get("ports")
            if (
                not block_id
                or not isinstance(version, int)
                or version <= 0
                or not executor_key
                or not isinstance(ports, Mapping)
            ):
                raise JobValidationError(
                    "Every block requires id, version, executorKey, and ports"
                )
            descriptor = BlockDescriptor(
                block_id, version, executor_key, name, dict(ports)
            )
            key = (block_id, version)
            if key in blocks:
                raise JobValidationError(
                    f"Duplicate block descriptor {block_id}@{version}"
                )
            blocks[key] = descriptor

        datasets: dict[str, Mapping[str, Any]] = {}
        for fallback_id, raw in _records(payload.get("datasets"), "datasets"):
            dataset_id = str(raw.get("id") or fallback_id or "").strip()
            if not dataset_id:
                raise JobValidationError("Every dataset descriptor requires id")
            if dataset_id in datasets:
                raise JobValidationError(
                    f"Duplicate dataset descriptor {dataset_id}"
                )
            descriptor = dict(raw)
            descriptor["id"] = dataset_id
            datasets[dataset_id] = descriptor

        job = cls(
            run_id=run_id,
            user_id=str(payload.get("userId") or "").strip() or None,
            nodes=tuple(nodes),
            edges=tuple(edges),
            blocks=blocks,
            datasets=datasets,
        )
        job.validate_graph()
        return job

    def block_for(self, node: GraphNode) -> BlockDescriptor:
        try:
            return self.blocks[(node.block_id, node.block_version)]
        except KeyError as exc:
            raise GraphValidationError(
                f"Node {node.id!r} references missing block "
                f"{node.block_id}@{node.block_version}"
            ) from exc

    def validate_graph(self) -> None:
        node_ids = [node.id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise GraphValidationError("Graph contains duplicate node IDs")
        edge_ids = [edge.id for edge in self.edges]
        if len(edge_ids) != len(set(edge_ids)):
            raise GraphValidationError("Graph contains duplicate edge IDs")
        node_by_id = {node.id: node for node in self.nodes}
        occupied_inputs: set[tuple[str, str]] = set()
        for node in self.nodes:
            descriptor = self.block_for(node)
            descriptor.input_ports()
            descriptor.output_ports()
        for edge in self.edges:
            if edge.source_node_id not in node_by_id:
                raise GraphValidationError(
                    f"Edge {edge.id!r} references missing source node"
                )
            if edge.target_node_id not in node_by_id:
                raise GraphValidationError(
                    f"Edge {edge.id!r} references missing target node"
                )
            if edge.source_node_id == edge.target_node_id:
                raise GraphValidationError(f"Edge {edge.id!r} is a self-edge")
            source = self.block_for(node_by_id[edge.source_node_id])
            target = self.block_for(node_by_id[edge.target_node_id])
            if edge.source_port_id not in source.output_ports():
                raise GraphValidationError(
                    f"Edge {edge.id!r} references unknown source port "
                    f"{edge.source_port_id!r}"
                )
            if edge.target_port_id not in target.input_ports():
                raise GraphValidationError(
                    f"Edge {edge.id!r} references unknown target port "
                    f"{edge.target_port_id!r}"
                )
            input_key = (edge.target_node_id, edge.target_port_id)
            if input_key in occupied_inputs:
                raise GraphValidationError(
                    f"Input {edge.target_node_id}.{edge.target_port_id} "
                    "has more than one incoming edge"
                )
            occupied_inputs.add(input_key)
        self.topological_order()

    def topological_order(self) -> tuple[GraphNode, ...]:
        node_by_id = {node.id: node for node in self.nodes}
        position = {node.id: index for index, node in enumerate(self.nodes)}
        indegree = {node.id: 0 for node in self.nodes}
        outgoing: dict[str, list[str]] = {node.id: [] for node in self.nodes}
        for edge in self.edges:
            indegree[edge.target_node_id] += 1
            outgoing[edge.source_node_id].append(edge.target_node_id)
        ready = [node.id for node in self.nodes if indegree[node.id] == 0]
        ready.sort(key=position.__getitem__)
        ordered: list[GraphNode] = []
        while ready:
            current = ready.pop(0)
            ordered.append(node_by_id[current])
            for target in sorted(
                outgoing[current], key=position.__getitem__
            ):
                indegree[target] -= 1
                if indegree[target] == 0:
                    ready.append(target)
                    ready.sort(key=position.__getitem__)
        if len(ordered) != len(self.nodes):
            raise GraphValidationError("Pipeline graph contains a cycle")
        return tuple(ordered)


def _records(raw: Any, field: str) -> list[tuple[str | None, Mapping[str, Any]]]:
    if isinstance(raw, list):
        if not all(isinstance(item, Mapping) for item in raw):
            raise JobValidationError(f"Job {field} must contain objects")
        return [(None, item) for item in raw]
    if isinstance(raw, Mapping):
        records: list[tuple[str | None, Mapping[str, Any]]] = []
        for key, item in raw.items():
            if not isinstance(item, Mapping):
                raise JobValidationError(f"Job {field} must contain objects")
            records.append((str(key), item))
        return records
    raise JobValidationError(f"Job {field} must be an array or object map")


@dataclass(frozen=True)
class RunOutcome:
    run_id: str
    status: str
    acknowledged: bool = True


class PipelineRunner:
    def __init__(
        self,
        *,
        database: DatabasePort,
        events: EventPort,
        storage: Any,
        registry: BlockRegistry = DEFAULT_REGISTRY,
    ) -> None:
        self.database = database
        self.events = events
        self.storage = storage
        self.registry = registry

    def run(self, raw_payload: Mapping[str, Any], worker_id: str) -> RunOutcome:
        raw_run_id = str(raw_payload.get("runId") or "").strip()
        try:
            job = PipelineJob.from_mapping(raw_payload)
        except PipelineError as exc:
            if raw_run_id:
                self._fail_before_execution(raw_run_id, str(exc))
                return RunOutcome(raw_run_id, "failed")
            raise

        if not self.database.start_run(job.run_id):
            return RunOutcome(job.run_id, "duplicate")

        run_started = time.perf_counter()
        self.events.publish(
            "run.started",
            job.run_id,
            payload={"workerId": worker_id},
        )
        outputs: dict[str, Mapping[str, Any]] = {}
        incoming: dict[str, list[GraphEdge]] = {node.id: [] for node in job.nodes}
        for edge in job.edges:
            incoming[edge.target_node_id].append(edge)

        current_node: GraphNode | None = None
        current_descriptor: BlockDescriptor | None = None
        current_started = run_started
        try:
            order = job.topological_order()
            for current_node in order:
                current_descriptor = job.block_for(current_node)
                current_started = time.perf_counter()
                resolved_inputs: dict[str, Any] = {}
                for edge in incoming[current_node.id]:
                    try:
                        resolved_inputs[edge.target_port_id] = outputs[
                            edge.source_node_id
                        ][edge.source_port_id]
                    except KeyError as exc:
                        raise GraphValidationError(
                            f"Runtime output {edge.source_node_id}."
                            f"{edge.source_port_id} is missing"
                        ) from exc
                missing_inputs = sorted(
                    set(current_descriptor.input_ports()) - set(resolved_inputs)
                )
                if missing_inputs:
                    raise GraphValidationError(
                        f"Node {current_node.id!r} is missing inputs: "
                        + ", ".join(missing_inputs)
                    )

                node_execution_id = self.database.start_node(
                    job.run_id, current_node.id, worker_id
                )
                self.events.publish(
                    "node.started",
                    job.run_id,
                    node_id=current_node.id,
                    payload={"executorKey": current_descriptor.executor_key},
                )
                self.events.publish(
                    "node.log",
                    job.run_id,
                    node_id=current_node.id,
                    level="info",
                    message=f"Executing {current_descriptor.name}",
                    payload={"executorKey": current_descriptor.executor_key},
                )

                block = self.registry.resolve(
                    current_descriptor.executor_key,
                    current_descriptor.version,
                )
                result = block.execute(
                    BlockContext(
                        run_id=job.run_id,
                        node_id=current_node.id,
                        datasets=job.datasets,
                        storage=self.storage,
                    ),
                    resolved_inputs,
                    current_node.config,
                )
                expected_outputs = set(current_descriptor.output_ports())
                actual_outputs = set(result.outputs)
                if actual_outputs != expected_outputs:
                    raise GraphValidationError(
                        f"Executor {current_descriptor.executor_key!r} returned "
                        f"ports {sorted(actual_outputs)}; expected "
                        f"{sorted(expected_outputs)}"
                    )
                for level, message in result.logs:
                    self.events.publish(
                        "node.log",
                        job.run_id,
                        node_id=current_node.id,
                        level=level,
                        message=message,
                        payload={"executorKey": current_descriptor.executor_key},
                    )
                for pending in result.artifacts:
                    artifact = self.database.create_artifact(
                        run_id=job.run_id,
                        node_execution_id=node_execution_id,
                        name=pending.name,
                        artifact_type=pending.artifact_type,
                        mime_type=pending.mime_type,
                        storage_uri=pending.storage_uri,
                        metadata=pending.metadata,
                    )
                    self.events.publish(
                        "artifact.created",
                        job.run_id,
                        node_id=current_node.id,
                        payload={"artifact": artifact},
                    )
                outputs[current_node.id] = dict(result.outputs)
                summary = json_safe(
                    dict(result.summary)
                    if result.summary
                    else summarize_outputs(result.outputs)
                )
                self.database.complete_node(
                    job.run_id, current_node.id, summary
                )
                duration_ms = int((time.perf_counter() - current_started) * 1000)
                self.events.publish(
                    "node.completed",
                    job.run_id,
                    node_id=current_node.id,
                    payload={
                        "executorKey": current_descriptor.executor_key,
                        "durationMs": duration_ms,
                        "summary": summary,
                    },
                )

            self.database.complete_run(job.run_id)
            duration_ms = int((time.perf_counter() - run_started) * 1000)
            self.events.publish(
                "run.completed",
                job.run_id,
                payload={"durationMs": duration_ms, "nodeCount": len(order)},
            )
            return RunOutcome(job.run_id, "completed")
        except Exception as exc:
            descriptor_key = (
                current_descriptor.executor_key
                if current_descriptor is not None
                else "graph"
            )
            node_id = current_node.id if current_node is not None else None
            error = (
                f"Node {node_id!r} ({descriptor_key}) failed: {exc}"
                if node_id
                else f"Pipeline graph failed: {exc}"
            )
            duration_ms = int((time.perf_counter() - current_started) * 1000)
            if node_id is not None:
                self.database.fail_node(job.run_id, node_id, error)
                self.events.publish(
                    "node.failed",
                    job.run_id,
                    node_id=node_id,
                    level="error",
                    message=error,
                    payload={
                        "executorKey": descriptor_key,
                        "durationMs": duration_ms,
                        "error": error,
                    },
                )
            self.database.skip_pending_nodes(job.run_id)
            self.database.fail_run(job.run_id)
            run_duration_ms = int((time.perf_counter() - run_started) * 1000)
            self.events.publish(
                "run.failed",
                job.run_id,
                level="error",
                message=error,
                payload={
                    "durationMs": run_duration_ms,
                    "failedNodeId": node_id,
                    "error": error,
                },
            )
            return RunOutcome(job.run_id, "failed")

    def _fail_before_execution(self, run_id: str, error: str) -> None:
        started = self.database.start_run(run_id)
        if not started:
            return
        self.database.skip_pending_nodes(run_id)
        self.database.fail_run(run_id)
        self.events.publish(
            "run.failed",
            run_id,
            level="error",
            message=error,
            payload={
                "durationMs": 0,
                "failedNodeId": None,
                "error": error,
            },
        )
