import type {
  PipelineGraph as ContractPipelineGraph,
  RunEvent as ContractRunEvent,
  RunEventLevel,
  WorkflowRunAccepted as ContractWorkflowRunAccepted,
} from "@training-ml/contracts"

export type PipelineGraph = ContractPipelineGraph

export const RUN_EVENT_TYPES = [
  "run.snapshot",
  "run.queued",
  "run.started",
  "node.started",
  "node.log",
  "node.completed",
  "node.failed",
  "artifact.created",
  "run.completed",
  "run.failed",
] as const

export type RunEventType = (typeof RUN_EVENT_TYPES)[number]
export type RunLogLevel = RunEventLevel
export type RunStatus =
  "idle" | "submitting" | "pending" | "running" | "completed" | "failed"
export type NodeRunStatus =
  "idle" | "queued" | "running" | "success" | "error" | "skipped"
export type ConnectionStatus =
  "disconnected" | "connecting" | "connected" | "reconnecting"

export type PipelineRunEvent = ContractRunEvent & {
  eventId?: string
}

export type WorkflowRunAccepted = ContractWorkflowRunAccepted

export interface PipelineLogEntry {
  id: string
  timestamp: string
  level: RunLogLevel
  message: string
  nodeId?: string
}

export interface ConfusionMatrixResult {
  labels: Array<string | number>
  matrix: number[][]
}

export interface PipelineMetrics {
  values: Record<string, number>
  confusionMatrix?: ConfusionMatrixResult
}

export interface RunArtifact {
  id?: string
  nodeExecutionId?: string
  name?: string
  artifactType?: string
  mimeType?: string
  storageUri?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface PipelineRunState {
  runId: string | null
  status: RunStatus
  connectionStatus: ConnectionStatus
  nodeStatuses: Record<string, NodeRunStatus>
  logs: PipelineLogEntry[]
  metrics: PipelineMetrics | null
  nodeMetrics: Record<string, PipelineMetrics>
  artifacts: RunArtifact[]
  error: string | null
  lastEventId: string | null
  processedEventIds: string[]
}

export const TERMINAL_RUN_EVENTS = new Set<RunEventType>([
  "run.completed",
  "run.failed",
])

export function isTerminalRunEvent(event: PipelineRunEvent): boolean {
  if (TERMINAL_RUN_EVENTS.has(event.type)) return true
  if (event.type !== "run.snapshot") return false

  const status = event.payload?.status
  return status === "completed" || status === "failed" || status === "cancelled"
}

export function isRunActive(status: RunStatus): boolean {
  return status === "submitting" || status === "pending" || status === "running"
}
