import type { Edge } from '@xyflow/react';
import type { PipelineNode } from './node-factory';

export interface SerializedGraph {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
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
  nodes: PipelineNode[],
  edges: Edge[]
): SerializedGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'data',
      position: n.position,
      data: n.data as unknown as Record<string, unknown>,
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
  graph: SerializedGraph,
  edgeFactory: (source: string, target: string, sourceHandle: string, targetHandle: string, edgeData?: Record<string, unknown>) => Edge
): { nodes: PipelineNode[]; edges: Edge[] } {
  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type as PipelineNode['type'],
    position: n.position,
    data: n.data as unknown as PipelineNode['data'],
  })) as PipelineNode[];

  const edges = graph.edges.map((e) =>
    edgeFactory(e.source, e.target, e.sourceHandle, e.targetHandle, e.data)
  );

  return { nodes, edges };
}
