import type { SocketType } from '../blocks/socket-types';
import type { PipelineNodeData } from './node-factory';
import type { Edge } from '@xyflow/react';

export function canConnect(sourceType: SocketType, targetType: SocketType): boolean {
  return sourceType === targetType;
}

export interface ConnectionValidationParams {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  nodes: Array<{ id: string; data: PipelineNodeData; type: string }>;
  edges: Edge[];
}

export function isValidNodeConnection(
  params: ConnectionValidationParams
): boolean {
  const { sourceNodeId, targetNodeId, sourceHandle, targetHandle, nodes } = params;

  if (sourceNodeId === targetNodeId) return false;
  if (!sourceHandle || !targetHandle) return false;

  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);
  if (!sourceNode || !targetNode) return false;

  const sourceSocket = sourceNode.data.outputs.find((s) => s.id === sourceHandle);
  const targetSocket = targetNode.data.inputs.find((s) => s.id === targetHandle);
  if (!sourceSocket || !targetSocket) return false;

  if (!canConnect(sourceSocket.type, targetSocket.type)) return false;

  return true;
}
