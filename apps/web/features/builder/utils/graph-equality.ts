import type { Graph, GraphEdge, GraphNode } from '@training-ml/pipeline-engine';

function isConfigEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a[aKeys[i]] !== b[aKeys[i]]) return false;
  }
  return true;
}

function isNodeEqual(a: GraphNode, b: GraphNode): boolean {
  return (
    a.id === b.id &&
    a.blockId === b.blockId &&
    a.blockVersion === b.blockVersion &&
    isConfigEqual(a.config, b.config)
  );
}

function isEdgeEqual(a: GraphEdge, b: GraphEdge): boolean {
  return (
    a.id === b.id &&
    a.sourceNodeId === b.sourceNodeId &&
    a.sourcePortId === b.sourcePortId &&
    a.targetNodeId === b.targetNodeId &&
    a.targetPortId === b.targetPortId
  );
}

export function isGraphEqual(a: Graph, b: Graph): boolean {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;

  for (let i = 0; i < a.nodes.length; i++) {
    if (!isNodeEqual(a.nodes[i], b.nodes[i])) return false;
  }

  for (let i = 0; i < a.edges.length; i++) {
    if (!isEdgeEqual(a.edges[i], b.edges[i])) return false;
  }

  return true;
}
