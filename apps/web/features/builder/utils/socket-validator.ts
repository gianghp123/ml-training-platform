import type { Edge, Node } from "@xyflow/react"
import type { PipelineNode } from "./node-factory"

export function canConnect(
  sourceArtifact: string,
  targetArtifact: string
): boolean {
  return sourceArtifact === targetArtifact
}

export interface ConnectionValidationParams {
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string | null
  targetHandle: string | null
  nodes: Node[]
  edges: Edge[]
}

export function isValidNodeConnection(
  params: ConnectionValidationParams
): boolean {
  const { sourceNodeId, targetNodeId, sourceHandle, targetHandle, nodes, edges } =
    params

  if (sourceNodeId === targetNodeId) return false
  if (!sourceHandle || !targetHandle) return false

  const sourceNode = nodes.find(
    (n) => n.id === sourceNodeId && n.type === "block"
  )
  const targetNode = nodes.find(
    (n) => n.id === targetNodeId && n.type === "block"
  )
  if (!sourceNode || !targetNode) return false

  const sourceNodeData = (sourceNode as PipelineNode).data
  const targetNodeData = (targetNode as PipelineNode).data

  const sourcePort = sourceNodeData.outputs.find((o) => o.id === sourceHandle)
  const targetPort = targetNodeData.inputs.find((i) => i.id === targetHandle)
  if (!sourcePort || !targetPort) return false

  if (!canConnect(sourcePort.artifact, targetPort.artifact)) return false

  const alreadyConnected = edges.some(
    (e) => e.target === targetNodeId && e.targetHandle === targetHandle
  )
  if (alreadyConnected) return false

  return true
}
