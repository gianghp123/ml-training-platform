"use client"

import type { Edge, Node } from "@xyflow/react"
import { useCallback, useState } from "react"
import {
  deserializeGraph,
  GRAPH_VERSION,
  serializeGraph,
  type SerializedGraph,
} from "../utils/graph-serializer"

export const WORKFLOW_DRAFT_KEY = "pipeline-builder-workflow"
const WORKFLOW_ID_KEY = "pipeline-builder-workflow-id"

function createEdge(
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  edgeData?: Record<string, unknown>
): Edge {
  return {
    id: `${source}-${sourceHandle}-${target}-${targetHandle}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "pipeline",
    data: edgeData,
  }
}

interface UseWorkflowPersistenceReturn {
  savedVersion: number | null
  saveWorkflow: (name: string, nodes: Node[], edges: Edge[]) => void
  saveLocal: (name: string, nodes: Node[], edges: Edge[]) => void
  clearDraft: () => void
  hasDraft: () => boolean
  loadWorkflow: () => { name: string; nodes: Node[]; edges: Edge[] } | null
}

function readStoredWorkflowId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(WORKFLOW_ID_KEY)
}

export function useWorkflowPersistence(): UseWorkflowPersistenceReturn {
  const [savedVersion, setSavedVersion] = useState<number | null>(null)

  const saveLocal = useCallback(
    (name: string, nodes: Node[], edges: Edge[]) => {
      if (typeof window === "undefined") return

      const graph = serializeGraph(nodes, edges)
      const data = { name, graph, savedAt: new Date().toISOString() }

      localStorage.setItem(WORKFLOW_DRAFT_KEY, JSON.stringify(data))
    },
    []
  )

  const saveWorkflow = useCallback(
    (name: string, nodes: Node[], edges: Edge[]) => {
      if (typeof window === "undefined") return

      const graph = serializeGraph(nodes, edges)
      const currentWorkflowId = readStoredWorkflowId()

      void fetch("/api/workflows/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, workflowId: currentWorkflowId, graph }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as {
              error?: string
            } | null
            throw new Error(
              errorBody?.error ?? `Save failed (${response.status})`
            )
          }
          return response.json() as Promise<{
            workflowId: string
            version: number
          }>
        })
        .then((result) => {
          if (typeof result.workflowId === "string") {
            localStorage.setItem(WORKFLOW_ID_KEY, result.workflowId)
          }
          if (typeof result.version === "number") {
            setSavedVersion(result.version)
          }
        })
        .catch((error) => {
          console.warn("Failed to persist workflow to server", error)
        })
    },
    []
  )

  const loadWorkflow = useCallback(() => {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem(WORKFLOW_DRAFT_KEY)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as {
        name: string
        graph: SerializedGraph
        savedAt: string
      }
      const { nodes, edges } = deserializeGraph(data.graph, createEdge)
      if (nodes.length === 0 && data.graph.version !== GRAPH_VERSION) {
        localStorage.removeItem(WORKFLOW_DRAFT_KEY)
        return null
      }
      return { name: data.name, nodes, edges }
    } catch {
      return null
    }
  }, [])

  const hasDraft = useCallback(() => {
    if (typeof window === "undefined") return false
    const raw = localStorage.getItem(WORKFLOW_DRAFT_KEY)
    if (!raw) return false
    try {
      const data = JSON.parse(raw) as { graph?: SerializedGraph }
      return (data.graph?.nodes.length ?? 0) > 0
    } catch {
      return false
    }
  }, [])

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(WORKFLOW_DRAFT_KEY)
  }, [])

  return {
    savedVersion,
    saveWorkflow,
    saveLocal,
    clearDraft,
    hasDraft,
    loadWorkflow,
  }
}
