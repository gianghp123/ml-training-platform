import type { Edge, Node } from '@xyflow/react';
import type { PipelineNode } from './node-factory';

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
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'block',
      position: n.position,
      data: n.data as unknown as Record<string, unknown>,
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
  graph: SerializedGraph,
  edgeFactory: (
    source: string,
    target: string,
    sourceHandle: string,
    targetHandle: string,
    edgeData?: Record<string, unknown>
  ) => Edge
): { nodes: (PipelineNode | Node)[]; edges: Edge[] } {
  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as unknown as Record<string, unknown>,
    parentId: n.parentId,
    width: n.width,
    height: n.height,
  })) as (PipelineNode | Node)[];

  const edges = graph.edges.map((e) =>
    edgeFactory(e.source, e.target, e.sourceHandle, e.targetHandle, e.data)
  );

  return { nodes, edges };
}
