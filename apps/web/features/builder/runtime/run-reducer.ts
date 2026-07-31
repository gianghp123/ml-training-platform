import type {
  ConfusionMatrixResult,
  ConnectionStatus,
  NodeRunStatus,
  PipelineLogEntry,
  PipelineMetrics,
  PipelineRunEvent,
  PipelineRunState,
  RunArtifact,
  RunLogLevel,
  RunStatus,
} from "./run-types"

const MAX_LOGS = 1_000
const MAX_PROCESSED_EVENT_IDS = 2_000

export type PipelineRunAction =
  | { type: "submit"; nodeIds: string[] }
  | { type: "accepted"; runId: string; nodeIds: string[] }
  | { type: "restore"; runId: string; nodeIds: string[]; lastEventId?: string }
  | { type: "event"; event: PipelineRunEvent }
  | { type: "connection"; status: ConnectionStatus }
  | { type: "failure"; message: string }
  | { type: "reset" }

export function createInitialRunState(): PipelineRunState {
  return {
    runId: null,
    status: "idle",
    connectionStatus: "disconnected",
    nodeStatuses: {},
    logs: [],
    metrics: null,
    nodeMetrics: {},
    artifacts: [],
    error: null,
    lastEventId: null,
    processedEventIds: [],
  }
}

function statusesFor(
  nodeIds: string[],
  status: NodeRunStatus
): Record<string, NodeRunStatus> {
  return Object.fromEntries(nodeIds.map((nodeId) => [nodeId, status]))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function firstRecord(
  record: Record<string, unknown> | undefined,
  keys: string[]
): Record<string, unknown> | undefined {
  if (!record) return undefined
  for (const key of keys) {
    if (isRecord(record[key])) return record[key]
  }
  return undefined
}

function normalizeNodeStatus(value: unknown): NodeRunStatus | null {
  switch (value) {
    case "pending":
    case "queued":
      return "queued"
    case "running":
      return "running"
    case "completed":
    case "success":
      return "success"
    case "failed":
    case "error":
      return "error"
    case "skipped":
    case "cancelled":
      return "skipped"
    default:
      return null
  }
}

function normalizeRunStatus(value: unknown): RunStatus | null {
  switch (value) {
    case "pending":
    case "queued":
      return "pending"
    case "running":
      return "running"
    case "completed":
      return "completed"
    case "failed":
    case "cancelled":
      return "failed"
    default:
      return null
  }
}

function isTerminalRunStatus(
  status: RunStatus
): status is Extract<RunStatus, "completed" | "failed"> {
  return status === "completed" || status === "failed"
}

function advanceRunStatus(current: RunStatus, candidate: RunStatus): RunStatus {
  if (isTerminalRunStatus(current)) return current
  if (isTerminalRunStatus(candidate)) return candidate

  const rank: Record<Exclude<RunStatus, "completed" | "failed">, number> = {
    idle: 0,
    submitting: 1,
    pending: 2,
    running: 3,
  }
  return rank[candidate] > rank[current] ? candidate : current
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readConfusionMatrix(
  value: unknown,
  fallbackLabels?: unknown
): ConfusionMatrixResult | undefined {
  let matrixValue: unknown = value
  let labelsValue = fallbackLabels

  if (isRecord(value)) {
    matrixValue = value.matrix
    labelsValue = value.labels ?? labelsValue
  }
  if (
    !Array.isArray(matrixValue) ||
    !matrixValue.every(
      (row) =>
        Array.isArray(row) &&
        row.every((cell) => typeof cell === "number" && Number.isFinite(cell))
    )
  ) {
    return undefined
  }

  const matrix = matrixValue as number[][]
  const labels = Array.isArray(labelsValue)
    ? labelsValue.filter(
        (label): label is string | number =>
          typeof label === "string" || typeof label === "number"
      )
    : matrix.map((_, index) => index)

  return { labels, matrix }
}

export function extractMetrics(
  payload: Record<string, unknown> | undefined
): PipelineMetrics | null {
  if (!payload) return null

  const summary = firstRecord(payload, [
    "summary",
    "outputSummary",
    "output_summary",
    "result",
  ])
  const source = summary ?? payload
  const metricsRecord = firstRecord(source, ["metrics", "values"])
  if (!metricsRecord) return null

  const values: Record<string, number> = {}
  for (const [key, value] of Object.entries(metricsRecord)) {
    const number = readNumber(value)
    if (number !== undefined) values[key] = number
  }

  const confusionValue =
    source.confusionMatrix ??
    source.confusion_matrix ??
    metricsRecord.confusionMatrix ??
    metricsRecord.confusion_matrix
  const labels =
    source.labels ??
    source.classLabels ??
    source.class_labels ??
    metricsRecord.labels
  const confusionMatrix = readConfusionMatrix(confusionValue, labels)

  if (Object.keys(values).length === 0 && !confusionMatrix) return null
  return { values, confusionMatrix }
}

function eventMessage(event: PipelineRunEvent): {
  level: RunLogLevel
  message: string
} | null {
  const duration =
    event.payload && typeof event.payload.durationMs === "number"
      ? ` (${event.payload.durationMs} ms)`
      : ""

  switch (event.type) {
    case "run.queued":
      return { level: "info", message: event.message ?? "Run queued" }
    case "run.started":
      return { level: "info", message: event.message ?? "Run started" }
    case "node.started":
      return {
        level: "info",
        message: event.message ?? `Node ${event.nodeId ?? "unknown"} started`,
      }
    case "node.log":
      return event.message
        ? { level: event.level ?? "info", message: event.message }
        : null
    case "node.completed":
      return {
        level: "info",
        message:
          event.message ??
          `Node ${event.nodeId ?? "unknown"} completed${duration}`,
      }
    case "node.failed": {
      const error =
        event.payload && typeof event.payload.error === "string"
          ? event.payload.error
          : undefined
      return {
        level: "error",
        message:
          event.message ??
          `Node ${event.nodeId ?? "unknown"} failed${duration}${error ? `: ${error}` : ""}`,
      }
    }
    case "artifact.created": {
      const artifact = firstRecord(event.payload, ["artifact"])
      const name =
        artifact && typeof artifact.name === "string"
          ? artifact.name
          : "artifact"
      return { level: "info", message: `Created ${name}` }
    }
    case "run.completed":
      return {
        level: "info",
        message: event.message ?? `Run completed${duration}`,
      }
    case "run.failed": {
      const error =
        event.payload && typeof event.payload.error === "string"
          ? event.payload.error
          : undefined
      return {
        level: "error",
        message: event.message ?? `Run failed${error ? `: ${error}` : ""}`,
      }
    }
    case "run.snapshot":
      return null
  }
}

function appendLog(
  logs: PipelineLogEntry[],
  event: PipelineRunEvent
): PipelineLogEntry[] {
  const details = eventMessage(event)
  if (!details) return logs
  const next = [
    ...logs,
    {
      id:
        event.eventId ??
        `${event.timestamp}-${event.type}-${event.nodeId ?? "run"}-${logs.length}`,
      timestamp: event.timestamp,
      level: details.level,
      message: details.message,
      nodeId: event.nodeId,
    },
  ]
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
}

function upsertArtifact(
  artifacts: RunArtifact[],
  artifact: Record<string, unknown>
): RunArtifact[] {
  const artifactId = typeof artifact.id === "string" ? artifact.id : undefined
  if (!artifactId) return [...artifacts, artifact]

  const existingIndex = artifacts.findIndex(
    (candidate) => candidate.id === artifactId
  )
  if (existingIndex === -1) return [...artifacts, artifact]

  return artifacts.map((candidate, index) =>
    index === existingIndex ? { ...candidate, ...artifact } : candidate
  )
}

function applySnapshot(
  state: PipelineRunState,
  event: PipelineRunEvent
): PipelineRunState {
  const payload = event.payload
  if (!payload) return state

  const runRecord = firstRecord(payload, ["run"])
  const snapshotStatus = normalizeRunStatus(payload.status ?? runRecord?.status)
  const status = snapshotStatus
    ? advanceRunStatus(state.status, snapshotStatus)
    : state.status
  const rawExecutions =
    payload.nodeExecutions ??
    payload.node_executions ??
    runRecord?.nodeExecutions
  const nodeStatuses = { ...state.nodeStatuses }
  const nodeMetrics = { ...state.nodeMetrics }
  let executionMetrics: PipelineMetrics | null = null
  let executionError: string | null = null

  if (Array.isArray(rawExecutions)) {
    for (const execution of rawExecutions) {
      if (!isRecord(execution)) continue
      const nodeId =
        typeof execution.nodeId === "string"
          ? execution.nodeId
          : typeof execution.node_id === "string"
            ? execution.node_id
            : undefined
      const nodeStatus = normalizeNodeStatus(execution.status)
      if (nodeId && nodeStatus) nodeStatuses[nodeId] = nodeStatus
      const outputSummary = execution.outputSummary ?? execution.output_summary
      if (isRecord(outputSummary)) {
        const extracted = extractMetrics({ summary: outputSummary })
        if (extracted && nodeId) {
          nodeMetrics[nodeId] = extracted
          if (!executionMetrics) executionMetrics = extracted
        }
      }
      if (
        !executionError &&
        (nodeStatus === "error" || execution.status === "failed")
      ) {
        const errorMessage =
          execution.errorMessage ?? execution.error_message ?? execution.error
        if (typeof errorMessage === "string") executionError = errorMessage
      }
    }
  }

  const rawArtifacts = payload.artifacts ?? runRecord?.artifacts
  const artifacts = Array.isArray(rawArtifacts)
    ? rawArtifacts.filter(isRecord)
    : state.artifacts
  const metrics =
    extractMetrics(payload) ??
    executionMetrics ??
    artifacts
      .map((artifact) => extractMetrics(artifact))
      .find((item): item is PipelineMetrics => item !== null) ??
    state.metrics

  return {
    ...state,
    status,
    nodeStatuses,
    artifacts,
    metrics,
    nodeMetrics,
    error:
      status === "failed" &&
      typeof (payload.error ?? runRecord?.error) === "string"
        ? String(payload.error ?? runRecord?.error)
        : (executionError ?? state.error),
  }
}

function applyEvent(
  state: PipelineRunState,
  event: PipelineRunEvent
): PipelineRunState {
  if (state.runId && event.runId !== state.runId) return state
  if (event.eventId && state.processedEventIds.includes(event.eventId))
    return state

  let next = state
  if (event.type === "run.snapshot") {
    next = applySnapshot(state, event)
  } else {
    const nodeStatuses = { ...state.nodeStatuses }
    const nodeMetrics = { ...state.nodeMetrics }
    let status = state.status
    let error = state.error
    let metrics = state.metrics
    let artifacts = state.artifacts

    if (event.type === "run.queued") {
      status = advanceRunStatus(status, "pending")
    }
    if (event.type === "run.started") {
      status = advanceRunStatus(status, "running")
    }
    if (event.type === "node.started" && event.nodeId) {
      nodeStatuses[event.nodeId] = "running"
    }
    if (event.type === "node.completed" && event.nodeId) {
      nodeStatuses[event.nodeId] = "success"
      const nodeMetric = extractMetrics(event.payload)
      if (nodeMetric) {
        metrics = nodeMetric
        nodeMetrics[event.nodeId] = nodeMetric
      }
    }
    if (event.type === "node.failed" && event.nodeId) {
      nodeStatuses[event.nodeId] = "error"
      const payloadError = event.payload?.error
      if (typeof payloadError === "string") error = payloadError
    }
    if (event.type === "artifact.created") {
      const artifact = firstRecord(event.payload, ["artifact"])
      if (artifact) artifacts = upsertArtifact(artifacts, artifact)
    }
    if (event.type === "run.completed") {
      const previousStatus = status
      status = advanceRunStatus(status, "completed")
      if (previousStatus !== "failed") {
        for (const [nodeId, nodeStatus] of Object.entries(nodeStatuses)) {
          if (nodeStatus === "queued" || nodeStatus === "running") {
            nodeStatuses[nodeId] = "success"
          }
        }
      }
    }
    if (event.type === "run.failed") {
      const previousStatus = status
      status = advanceRunStatus(status, "failed")
      if (previousStatus !== "completed") {
        const payloadError = event.payload?.error
        error =
          typeof payloadError === "string"
            ? payloadError
            : (event.message ?? "Pipeline run failed")
        for (const [nodeId, nodeStatus] of Object.entries(nodeStatuses)) {
          if (nodeStatus === "running") nodeStatuses[nodeId] = "error"
          if (nodeStatus === "queued") nodeStatuses[nodeId] = "skipped"
        }
      }
    }

    next = {
      ...state,
      status,
      nodeStatuses,
      error,
      metrics,
      nodeMetrics,
      artifacts,
      logs: appendLog(state.logs, event),
    }
  }

  const processedEventIds = event.eventId
    ? [...next.processedEventIds, event.eventId].slice(-MAX_PROCESSED_EVENT_IDS)
    : next.processedEventIds

  return {
    ...next,
    runId: event.runId,
    connectionStatus:
      event.type === "run.completed" || event.type === "run.failed"
        ? "disconnected"
        : next.connectionStatus,
    lastEventId: event.eventId ?? next.lastEventId,
    processedEventIds,
  }
}

export function pipelineRunReducer(
  state: PipelineRunState,
  action: PipelineRunAction
): PipelineRunState {
  switch (action.type) {
    case "submit":
      return {
        ...createInitialRunState(),
        status: "submitting",
        connectionStatus: "connecting",
        nodeStatuses: statusesFor(action.nodeIds, "queued"),
      }
    case "accepted":
      return {
        ...state,
        runId: action.runId,
        status: "pending",
        nodeStatuses: statusesFor(action.nodeIds, "queued"),
        error: null,
      }
    case "restore":
      return {
        ...createInitialRunState(),
        runId: action.runId,
        status: "pending",
        connectionStatus: "connecting",
        nodeStatuses: statusesFor(action.nodeIds, "queued"),
        lastEventId: action.lastEventId ?? null,
      }
    case "event":
      return applyEvent(state, action.event)
    case "connection":
      return { ...state, connectionStatus: action.status }
    case "failure":
      return {
        ...state,
        status: "failed",
        connectionStatus: "disconnected",
        error: action.message,
        logs: [
          ...state.logs,
          {
            id: `transport-${Date.now()}-${state.logs.length}`,
            timestamp: new Date().toISOString(),
            level: "error" as const,
            message: action.message,
          },
        ].slice(-MAX_LOGS),
      }
    case "reset":
      return createInitialRunState()
  }
}
