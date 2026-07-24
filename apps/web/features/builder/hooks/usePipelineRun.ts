"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import {
  createInitialRunState,
  pipelineRunReducer,
} from "../runtime/run-reducer"
import { createSseParser, parseRunEventMessage } from "../runtime/sse-parser"
import {
  isRunActive,
  isTerminalRunEvent,
  type PipelineGraph,
  type WorkflowRunAccepted,
} from "../runtime/run-types"

const ACTIVE_RUN_STORAGE_KEY = "pipeline-builder-active-run"
const MAX_RECONNECT_DELAY_MS = 5_000

interface StoredActiveRun {
  runId: string
  nodeIds: string[]
  lastEventId?: string
}

interface UsePipelineRunResult {
  state: ReturnType<typeof createInitialRunState>
  isActive: boolean
  execute: (graph: PipelineGraph) => Promise<WorkflowRunAccepted>
  reset: () => void
}

class FatalStreamError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseStoredRun(): StoredActiveRun | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(ACTIVE_RUN_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      !isRecord(parsed) ||
      typeof parsed.runId !== "string" ||
      !Array.isArray(parsed.nodeIds) ||
      !parsed.nodeIds.every((nodeId) => typeof nodeId === "string")
    ) {
      sessionStorage.removeItem(ACTIVE_RUN_STORAGE_KEY)
      return null
    }
    return {
      runId: parsed.runId,
      nodeIds: parsed.nodeIds,
      lastEventId:
        typeof parsed.lastEventId === "string" ? parsed.lastEventId : undefined,
    }
  } catch {
    sessionStorage.removeItem(ACTIVE_RUN_STORAGE_KEY)
    return null
  }
}

function storeActiveRun(run: StoredActiveRun): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(ACTIVE_RUN_STORAGE_KEY, JSON.stringify(run))
}

function clearActiveRun(runId?: string): void {
  if (typeof window === "undefined") return
  if (!runId) {
    sessionStorage.removeItem(ACTIVE_RUN_STORAGE_KEY)
    return
  }
  const stored = parseStoredRun()
  if (!stored || stored.runId === runId) {
    sessionStorage.removeItem(ACTIVE_RUN_STORAGE_KEY)
  }
}

async function responseError(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`
  try {
    const raw: unknown = await response.json()
    if (!isRecord(raw)) return fallback
    if (typeof raw.message === "string") return raw.message
    if (typeof raw.error === "string") return raw.error
    if (isRecord(raw.error) && typeof raw.error.message === "string") {
      return raw.error.message
    }
  } catch {
    return fallback
  }
  return fallback
}

function parseAccepted(raw: unknown): WorkflowRunAccepted | null {
  const candidate = isRecord(raw) && isRecord(raw.data) ? raw.data : raw
  if (
    !isRecord(candidate) ||
    typeof candidate.runId !== "string" ||
    candidate.status !== "pending"
  ) {
    return null
  }
  return {
    runId: candidate.runId,
    status: "pending",
    eventsUrl:
      typeof candidate.eventsUrl === "string"
        ? candidate.eventsUrl
        : `/v1/workflow-runs/${candidate.runId}/events`,
  }
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      resolve()
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

export function usePipelineRun(): UsePipelineRunResult {
  const [state, dispatch] = useReducer(
    pipelineRunReducer,
    undefined,
    createInitialRunState
  )
  const controllerRef = useRef<AbortController | null>(null)

  const followRun = useCallback(
    async (
      activeRun: StoredActiveRun,
      controller: AbortController
    ): Promise<void> => {
      let after = activeRun.lastEventId
      let reconnectAttempt = 0

      while (!controller.signal.aborted) {
        dispatch({
          type: "connection",
          status: reconnectAttempt === 0 ? "connecting" : "reconnecting",
        })

        try {
          const query = after ? `?after=${encodeURIComponent(after)}` : ""
          const response = await fetch(
            `/api/workflow-runs/${encodeURIComponent(activeRun.runId)}/events${query}`,
            {
              headers: { Accept: "text/event-stream" },
              cache: "no-store",
              signal: controller.signal,
            }
          )

          if (!response.ok) {
            const message = await responseError(response)
            if (response.status >= 400 && response.status < 500) {
              throw new FatalStreamError(message)
            }
            throw new Error(message)
          }
          if (!response.body) {
            throw new Error("The event stream did not include a response body.")
          }

          dispatch({ type: "connection", status: "connected" })
          reconnectAttempt = 0
          let terminal = false
          const parser = createSseParser((message) => {
            const event = parseRunEventMessage(message)
            if (!event || event.runId !== activeRun.runId) return

            dispatch({ type: "event", event })
            if (event.eventId) {
              after = event.eventId
              storeActiveRun({
                ...activeRun,
                lastEventId: event.eventId,
              })
            }
            if (isTerminalRunEvent(event)) terminal = true
          })

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read()
            if (done) break
            parser.push(decoder.decode(value, { stream: true }))
          }
          parser.push(decoder.decode())
          parser.finish()

          if (terminal) {
            dispatch({ type: "connection", status: "disconnected" })
            clearActiveRun(activeRun.runId)
            return
          }
          if (controller.signal.aborted) return
          throw new Error("Event stream disconnected before the run finished.")
        } catch (error) {
          if (controller.signal.aborted) return
          if (error instanceof FatalStreamError) {
            clearActiveRun(activeRun.runId)
            dispatch({ type: "failure", message: error.message })
            return
          }

          reconnectAttempt += 1
          dispatch({ type: "connection", status: "reconnecting" })
          const delay = Math.min(
            500 * 2 ** Math.min(reconnectAttempt - 1, 4),
            MAX_RECONNECT_DELAY_MS
          )
          await abortableDelay(delay, controller.signal)
        }
      }
    },
    []
  )

  const startFollowing = useCallback(
    (activeRun: StoredActiveRun) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      void followRun(activeRun, controller)
    },
    [followRun]
  )

  useEffect(() => {
    const stored = parseStoredRun()
    if (stored) {
      dispatch({
        type: "restore",
        runId: stored.runId,
        nodeIds: stored.nodeIds,
        lastEventId: stored.lastEventId,
      })
      startFollowing(stored)
    }

    return () => {
      controllerRef.current?.abort()
    }
  }, [startFollowing])

  const execute = useCallback(
    async (graph: PipelineGraph): Promise<WorkflowRunAccepted> => {
      controllerRef.current?.abort()
      const nodeIds = graph.nodes.map((node) => node.id)
      dispatch({ type: "submit", nodeIds })

      try {
        const response = await fetch("/api/workflow-runs/execute", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ graph }),
        })
        if (!response.ok) throw new Error(await responseError(response))

        const accepted = parseAccepted(await response.json())
        if (!accepted) {
          throw new Error("The execution API returned an invalid response.")
        }

        const activeRun: StoredActiveRun = {
          runId: accepted.runId,
          nodeIds,
        }
        dispatch({
          type: "accepted",
          runId: accepted.runId,
          nodeIds,
        })
        storeActiveRun(activeRun)
        startFollowing(activeRun)
        return accepted
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to start pipeline run."
        clearActiveRun()
        dispatch({ type: "failure", message })
        throw error
      }
    },
    [startFollowing]
  )

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    clearActiveRun()
    dispatch({ type: "reset" })
  }, [])

  return {
    state,
    isActive: isRunActive(state.status),
    execute,
    reset,
  }
}
