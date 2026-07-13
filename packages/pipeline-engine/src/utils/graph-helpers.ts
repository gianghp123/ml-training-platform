import type { Graph, GraphEdge, GraphNode } from '../types';

export function buildAdjacencyList(edges: GraphEdge[]): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!adj[edge.sourceNodeId]) adj[edge.sourceNodeId] = [];
    adj[edge.sourceNodeId].push(edge.targetNodeId);
  }
  return adj;
}

export function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adj = buildAdjacencyList(edges);

  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const result: GraphNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (!node) continue;
    result.push(node);

    for (const neighborId of adj[id] ?? []) {
      const newDegree = (inDegree.get(neighborId) ?? 0) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) queue.push(neighborId);
    }
  }

  if (result.length !== nodes.length) {
    throw new Error('Graph contains a cycle');
  }

  return result;
}

export function getIncomingEdges(nodeId: string, edges: GraphEdge[]): GraphEdge[] {
  return edges.filter((e) => e.targetNodeId === nodeId);
}
