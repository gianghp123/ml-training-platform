/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react"
import { useValidation } from "../useValidation"
import type { Node, Edge } from "@xyflow/react"
import type { PipelineNode } from "../../utils/node-factory"
import type { BlockDefinition } from "@training-ml/contracts"
import { validateGraph } from "@training-ml/pipeline-engine"

jest.mock("@training-ml/pipeline-engine", () => {
  const actual = jest.requireActual("@training-ml/pipeline-engine")
  return {
    ...actual,
    validateGraph: jest.fn(actual.validateGraph),
  }
})

const mockBlock: BlockDefinition = {
  id: "test-block",
  version: 1,
  status: "active",
  executorKey: "test_block",
  name: "Test Block",
  categoryId: "data",
  ports: {
    inputs: [{ id: "input-1", artifact: "DATASET" }],
    outputs: [{ id: "output-1", artifact: "DATASET" }],
  },
  configSchema: { fields: [] },
  constraints: { rules: [] },
  outputTransform: {},
}

const mockNode: PipelineNode = {
  id: "node-1",
  type: "block",
  position: { x: 0, y: 0 },
  data: {
    blockId: "test-block",
    blockName: "Test Block",
    block: mockBlock,
    categoryId: "data",
    config: {},
    inputs: [{ id: "input-1", artifact: "DATASET" }],
    outputs: [{ id: "output-1", artifact: "DATASET" }],
    status: "idle",
  },
}

const blocks: BlockDefinition[] = [mockBlock]

const mockedValidateGraph = validateGraph as jest.MockedFunction<
  typeof validateGraph
>

describe("useValidation", () => {
  beforeEach(() => {
    mockedValidateGraph.mockClear()
  })

  it("returns valid for empty graph", () => {
    const { result } = renderHook(() => useValidation([], [], [mockBlock]))
    expect(result.current.isValid).toBe(true)
    expect(result.current.result.errors).toHaveLength(0)
  })

  it("returns errors for disconnected input ports", () => {
    const { result } = renderHook(() =>
      useValidation([mockNode], [], [mockBlock])
    )
    expect(result.current.isValid).toBe(false)
    expect(result.current.getNodeErrors("node-1")).toHaveLength(1)
    expect(result.current.getNodeErrors("node-1")[0].code).toBe(
      "PORT_NOT_CONNECTED"
    )
  })

  it("returns empty errors for node with no issues", () => {
    const connectedEdge: Edge = {
      id: "edge-1",
      source: "source-node",
      sourceHandle: "output-1",
      target: "node-1",
      targetHandle: "input-1",
      type: "pipeline",
    }
    const sourceNode: PipelineNode = {
      ...mockNode,
      id: "source-node",
    }
    const { result } = renderHook(() =>
      useValidation([sourceNode, mockNode], [connectedEdge], [mockBlock])
    )
    expect(result.current.getNodeErrors("node-1")).toHaveLength(0)
  })

  it("does not call validateGraph when only node position changes", () => {
    const { rerender } = renderHook(
      ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) =>
        useValidation(nodes, edges, blocks),
      { initialProps: { nodes: [mockNode], edges: [] as Edge[] } }
    )

    mockedValidateGraph.mockClear()

    const movedNode: PipelineNode = {
      ...mockNode,
      position: { x: 100, y: 200 },
    }
    rerender({ nodes: [movedNode], edges: [] })

    expect(mockedValidateGraph).not.toHaveBeenCalled()
  })

  it("does not call validateGraph when only node selection changes", () => {
    const { rerender } = renderHook(
      ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) =>
        useValidation(nodes, edges, blocks),
      { initialProps: { nodes: [mockNode], edges: [] as Edge[] } }
    )

    mockedValidateGraph.mockClear()

    const selectedNode: PipelineNode = { ...mockNode, selected: true }
    rerender({ nodes: [selectedNode], edges: [] })

    expect(mockedValidateGraph).not.toHaveBeenCalled()
  })

  it("calls validateGraph when node config changes", () => {
    const { rerender } = renderHook(
      ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) =>
        useValidation(nodes, edges, blocks),
      { initialProps: { nodes: [mockNode], edges: [] as Edge[] } }
    )

    mockedValidateGraph.mockClear()

    const reconfigured: PipelineNode = {
      ...mockNode,
      data: { ...mockNode.data, config: { threshold: 0.5 } },
    }
    rerender({ nodes: [reconfigured], edges: [] })

    expect(mockedValidateGraph).toHaveBeenCalledTimes(1)
  })

  it("calls validateGraph when an edge is added", () => {
    const { rerender } = renderHook(
      ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) =>
        useValidation(nodes, edges, blocks),
      { initialProps: { nodes: [mockNode], edges: [] as Edge[] } }
    )

    mockedValidateGraph.mockClear()

    const newEdge: Edge = {
      id: "edge-1",
      source: "node-1",
      sourceHandle: "output-1",
      target: "node-2",
      targetHandle: "input-1",
      type: "pipeline",
    }
    rerender({ nodes: [mockNode], edges: [newEdge] })

    expect(mockedValidateGraph).toHaveBeenCalledTimes(1)
  })
})
