import {
  RUN_EVENT_TYPES,
  type PipelineRunEvent,
  type RunEventType,
  type RunLogLevel,
} from "./run-types"

export interface SseMessage {
  id?: string
  event?: string
  data: string
}

export interface SseParser {
  push: (chunk: string) => void
  finish: () => void
}

const eventTypes = new Set<string>(RUN_EVENT_TYPES)
const logLevels = new Set<string>(["debug", "info", "warning", "error"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseEventBlock(block: string): SseMessage | null {
  let id: string | undefined
  let event: string | undefined
  const data: string[] = []

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue

    const separator = line.indexOf(":")
    const field = separator === -1 ? line : line.slice(0, separator)
    let value = separator === -1 ? "" : line.slice(separator + 1)
    if (value.startsWith(" ")) value = value.slice(1)

    if (field === "id" && !value.includes("\0")) id = value
    if (field === "event") event = value
    if (field === "data") data.push(value)
  }

  if (data.length === 0) return null
  return { id, event, data: data.join("\n") }
}

export function createSseParser(
  onMessage: (message: SseMessage) => void
): SseParser {
  let buffer = ""

  const drain = () => {
    let match = /\r?\n\r?\n/.exec(buffer)
    while (match) {
      const block = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)
      const message = parseEventBlock(block)
      if (message) onMessage(message)
      match = /\r?\n\r?\n/.exec(buffer)
    }
  }

  return {
    push(chunk) {
      buffer += chunk
      drain()
    },
    finish() {
      drain()
      if (!buffer.trim()) {
        buffer = ""
        return
      }
      const message = parseEventBlock(buffer)
      buffer = ""
      if (message) onMessage(message)
    },
  }
}

export function parseRunEventMessage(
  message: SseMessage
): PipelineRunEvent | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(message.data)
  } catch {
    return null
  }

  if (isRecord(parsed) && isRecord(parsed.data) && !("type" in parsed)) {
    parsed = parsed.data
  }
  if (!isRecord(parsed)) return null

  const type = typeof parsed.type === "string" ? parsed.type : message.event
  if (!type || !eventTypes.has(type)) return null
  if (typeof parsed.runId !== "string" || !parsed.runId) return null

  const payload = isRecord(parsed.payload) ? parsed.payload : undefined
  const payloadNodeId =
    payload && typeof payload.nodeId === "string" ? payload.nodeId : undefined
  const level =
    typeof parsed.level === "string" && logLevels.has(parsed.level)
      ? (parsed.level as RunLogLevel)
      : undefined

  return {
    type: type as RunEventType,
    runId: parsed.runId,
    timestamp:
      typeof parsed.timestamp === "string"
        ? parsed.timestamp
        : new Date().toISOString(),
    nodeId: typeof parsed.nodeId === "string" ? parsed.nodeId : payloadNodeId,
    level,
    message: typeof parsed.message === "string" ? parsed.message : undefined,
    payload,
    eventId: message.id,
  }
}
