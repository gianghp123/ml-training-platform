import { z } from 'zod';
import { UuidSchema } from '../shared';

export const PipelineGraphNodeSchema = z.object({
  id: z.string().min(1),
  blockId: UuidSchema,
  blockVersion: z.number().int().positive(),
  config: z.record(z.string(), z.unknown()),
});

export const PipelineGraphEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortId: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetPortId: z.string().min(1),
});

export const PipelineGraphSchema = z
  .object({
    nodes: z.array(PipelineGraphNodeSchema).min(1),
    edges: z.array(PipelineGraphEdgeSchema),
  })
  .superRefine((graph, context) => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    graph.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'id'],
          message: `Duplicate node id "${node.id}".`,
        });
      }
      nodeIds.add(node.id);
    });

    graph.edges.forEach((edge, index) => {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index, 'id'],
          message: `Duplicate edge id "${edge.id}".`,
        });
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.sourceNodeId)) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index, 'sourceNodeId'],
          message: `Source node "${edge.sourceNodeId}" does not exist.`,
        });
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index, 'targetNodeId'],
          message: `Target node "${edge.targetNodeId}" does not exist.`,
        });
      }
      if (edge.sourceNodeId === edge.targetNodeId) {
        context.addIssue({
          code: 'custom',
          path: ['edges', index],
          message: 'Self edges are not allowed.',
        });
      }
    });

    const inDegree = new Map(graph.nodes.map((node) => [node.id, 0]));
    const adjacency = new Map<string, string[]>();

    for (const edge of graph.edges) {
      if (
        !nodeIds.has(edge.sourceNodeId) ||
        !nodeIds.has(edge.targetNodeId) ||
        edge.sourceNodeId === edge.targetNodeId
      ) {
        continue;
      }

      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
      adjacency.set(edge.sourceNodeId, [
        ...(adjacency.get(edge.sourceNodeId) ?? []),
        edge.targetNodeId,
      ]);
    }

    const queue = graph.nodes
      .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
      .map((node) => node.id);
    let visited = 0;

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      visited += 1;
      for (const targetId of adjacency.get(nodeId) ?? []) {
        const nextDegree = (inDegree.get(targetId) ?? 0) - 1;
        inDegree.set(targetId, nextDegree);
        if (nextDegree === 0) {
          queue.push(targetId);
        }
      }
    }

    if (visited !== graph.nodes.length) {
      context.addIssue({
        code: 'custom',
        path: ['edges'],
        message: 'Pipeline graph contains a cycle.',
      });
    }
  });

export type PipelineGraphNode = z.infer<typeof PipelineGraphNodeSchema>;
export type PipelineGraphEdge = z.infer<typeof PipelineGraphEdgeSchema>;
export type PipelineGraph = z.infer<typeof PipelineGraphSchema>;
