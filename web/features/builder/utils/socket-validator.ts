import type { Edge } from '@xyflow/react';
import type { SocketDefinition } from '../blocks/socket-types';
import type { PipelineNodeData } from './node-factory';
import { BLOCK_CATEGORIES } from '../blocks';
import { wouldCreateCycle } from './pipeline-validator';

export function canConnect(sourceSocket: SocketDefinition, targetSocket: SocketDefinition): boolean {
  if (sourceSocket.direction !== 'output' || targetSocket.direction !== 'input') {
    return false;
  }
  return sourceSocket.artifact === targetSocket.artifact;
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
  const { sourceNodeId, targetNodeId, sourceHandle, targetHandle, nodes, edges } = params;

  if (sourceNodeId === targetNodeId) return false;
  if (!sourceHandle || !targetHandle) return false;

  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);
  if (!sourceNode || !targetNode) return false;

  const sourceSocket = sourceNode.data.outputs.find((s) => s.id === sourceHandle);
  const targetSocket = targetNode.data.inputs.find((s) => s.id === targetHandle);
  if (!sourceSocket || !targetSocket) return false;

  // 1. Artifact and Direction validation
  if (!canConnect(sourceSocket, targetSocket)) return false;

  // 2. Order Index validation (Pipeline Stage constraint)
  const sourceCategory = BLOCK_CATEGORIES.find(c => c.id === sourceNode.data.categoryId);
  const targetCategory = BLOCK_CATEGORIES.find(c => c.id === targetNode.data.categoryId);
  
  if (sourceCategory && targetCategory) {
    if (sourceCategory.orderIndex > targetCategory.orderIndex) {
      return false; // Cannot connect backwards in the pipeline
    }
  }

  // 3. Duplicate edge validation
  const alreadyConnected = edges.some(
    (e) => e.target === targetNodeId && e.targetHandle === targetHandle && e.source === sourceNodeId && e.sourceHandle === sourceHandle
  );
  if (alreadyConnected) return false;

  // 4. The execution graph must remain a DAG, including within one stage.
  if (wouldCreateCycle(edges, sourceNodeId, targetNodeId)) return false;

  // 5. "multiple" validation for target
  if (targetSocket.multiple === false) {
    const isTargetOccupied = edges.some(
      (e) => e.target === targetNodeId && e.targetHandle === targetHandle
    );
    if (isTargetOccupied) return false;
  }

  return true;
}
