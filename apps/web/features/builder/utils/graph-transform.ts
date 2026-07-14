import type { BlockDefinition } from '@training-ml/contracts';
import type { Graph, GraphEdge, GraphNode } from '@training-ml/pipeline-engine';
import type { Edge, Node } from '@xyflow/react';
import type { PipelineNode } from './node-factory';

export function toValidationGraph(
  nodes: Node[],
  edges: Edge[],
  blocks: BlockDefinition[]
): Graph {
  const graphNodes: GraphNode[] = nodes
    .filter((n) => n.type === 'block')
    .map((n) => {
      const pn = n as PipelineNode;
      return {
        id: pn.id,
        blockId: pn.data.blockId,
        blockVersion: pn.data.block.version,
        config: pn.data.config,
      };
    });

  const graphEdges: GraphEdge[] = edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    sourcePortId: e.sourceHandle ?? '',
    targetNodeId: e.target,
    targetPortId: e.targetHandle ?? '',
  }));

  return { nodes: graphNodes, edges: graphEdges };
}
