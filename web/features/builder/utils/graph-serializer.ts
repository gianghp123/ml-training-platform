import type { Edge, Node } from '@xyflow/react';
import { createPipelineNode, findBlockByCode, findBlockById, type PipelineNode } from './node-factory';

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  parentId?: string;
  width?: number;
  height?: number;
}

export interface SerializedGraph {
  version: '2.0';
  nodes: SerializedNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
    type: string;
    data?: Record<string, unknown>;
  }>;
}

export function serializeGraph(
  nodes: (Node)[],
  edges: Edge[]
): SerializedGraph {
  return {
    version: '2.0',
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'block',
      position: n.position,
      data: n.type === 'block'
        ? {
            blockId: (n as PipelineNode).data.blockId,
            blockCode: (n as PipelineNode).data.blockCode,
            config: (n as PipelineNode).data.config,
          }
        : n.data as Record<string, unknown>,
      parentId: (n as Node).parentId ?? undefined,
      width: (n as Node).width ?? undefined,
      height: (n as Node).height ?? undefined,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? '',
      targetHandle: e.targetHandle ?? '',
      type: e.type ?? 'pipeline',
      data: e.data as Record<string, unknown> | undefined,
    })),
  };
}

export function deserializeGraph(
  graph: SerializedGraph | Omit<SerializedGraph, 'version'>,
  edgeFactory: (
    source: string,
    target: string,
    sourceHandle: string,
    targetHandle: string,
    edgeData?: Record<string, unknown>
  ) => Edge
): { nodes: (PipelineNode | Node)[]; edges: Edge[] } {
  const nodes = graph.nodes.flatMap((n): (PipelineNode | Node)[] => {
    if (n.type !== 'block') {
      return [{
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        parentId: n.parentId,
        width: n.width,
        height: n.height,
      }];
    }

    const blockId = typeof n.data.blockId === 'string' ? n.data.blockId : undefined;
    const blockCode = typeof n.data.blockCode === 'string' ? n.data.blockCode : undefined;
    const block = blockId
      ? findBlockById(blockId)
      : blockCode
        ? findBlockByCode(blockCode)
        : undefined;
    if (!block) return [];

    const hydrated = createPipelineNode(block, n.position);
    hydrated.id = n.id;
    hydrated.parentId = n.parentId;
    hydrated.width = n.width;
    hydrated.height = n.height;
    hydrated.data.config = {
      ...hydrated.data.config,
      ...((n.data.config as PipelineNode['data']['config'] | undefined) ?? {}),
    };
    return [hydrated];
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((e) => edgeFactory(e.source, e.target, e.sourceHandle, e.targetHandle, e.data));

  return { nodes, edges };
}
