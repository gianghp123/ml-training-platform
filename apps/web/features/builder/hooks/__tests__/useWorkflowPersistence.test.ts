/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from "@testing-library/react"
import { useWorkflowPersistence } from "../useWorkflowPersistence"
import type { Node, Edge } from "@xyflow/react"

const mockNode: Node = {
  id: "node-1",
  type: "block",
  position: { x: 10, y: 20 },
  data: {
    blockId: "test-block",
    blockName: "Test Block",
    categoryId: "data",
    config: { threshold: 0.5 },
    status: "idle",
  },
}

const mockEdge: Edge = {
  id: "e1",
  source: "node-1",
  target: "node-2",
  sourceHandle: "out-1",
  targetHandle: "in-1",
  type: "pipeline",
}

describe("useWorkflowPersistence", () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflowId: "wf-1", version: 1 }),
    }) as unknown as typeof fetch
  })

  it("saveLocal stores the workflow draft in localStorage", () => {
    const { result } = renderHook(() => useWorkflowPersistence())
    act(() => {
      result.current.saveLocal("My Workflow", [mockNode], [mockEdge])
    })
    const raw = localStorage.getItem("pipeline-builder-workflow")
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!)
    expect(data.name).toBe("My Workflow")
    expect(data.graph.nodes).toHaveLength(1)
    expect(data.graph.edges).toHaveLength(1)
  })

  it("loadWorkflow restores the draft from localStorage", () => {
    const { result } = renderHook(() => useWorkflowPersistence())
    act(() => {
      result.current.saveLocal("My Workflow", [mockNode], [mockEdge])
    })
    act(() => {
      const loaded = result.current.loadWorkflow()
      expect(loaded?.name).toBe("My Workflow")
      expect(loaded?.nodes).toHaveLength(1)
      expect(loaded?.edges).toHaveLength(1)
      expect(loaded?.nodes[0].id).toBe("node-1")
    })
  })

  it("hasDraft reflects a non-empty draft in localStorage", () => {
    const { result } = renderHook(() => useWorkflowPersistence())
    expect(result.current.hasDraft()).toBe(false)
    act(() => {
      result.current.saveLocal("X", [], [])
    })
    expect(result.current.hasDraft()).toBe(false)
    act(() => {
      result.current.saveLocal("X", [mockNode], [])
    })
    expect(result.current.hasDraft()).toBe(true)
  })

  it("clearDraft removes the draft from localStorage", () => {
    const { result } = renderHook(() => useWorkflowPersistence())
    act(() => {
      result.current.saveLocal("X", [mockNode], [])
    })
    act(() => {
      result.current.clearDraft()
    })
    expect(result.current.hasDraft()).toBe(false)
    expect(localStorage.getItem("pipeline-builder-workflow")).toBeNull()
  })

  it("saveWorkflow posts to the server and updates savedVersion", async () => {
    const { result } = renderHook(() => useWorkflowPersistence())
    act(() => {
      result.current.saveWorkflow("My Workflow", [mockNode], [mockEdge])
    })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workflows/save",
      expect.objectContaining({ method: "POST" })
    )
    await waitFor(() => expect(result.current.savedVersion).toBe(1))
  })
})
