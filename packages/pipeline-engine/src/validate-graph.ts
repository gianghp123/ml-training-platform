import type { BlockDefinition, Contract, ValidationError } from '@training-ml/contracts';
import type { Graph, GraphEdge, GraphNode, ValidationResult } from './types';
import { getIncomingEdges, topologicalSort } from './utils/graph-helpers';
import { validateNode } from './validate-node';

export function validateGraph(
  graph: Graph,
  blockDefinitions: BlockDefinition[],
): ValidationResult {
  const definitionMap = new Map(
    blockDefinitions.map((d) => [`${d.id}@${d.version}`, d]),
  );


  const errors: ValidationError[] = [];
  const contracts: Record<string, Record<string, Contract>> = {};
  const nodeOutputContracts = new Map<string, Record<string, Contract>>();

  const sortedNodes = topologicalSort(graph.nodes, graph.edges);

  for (const node of sortedNodes) {
    const key = `${node.blockId}@${node.blockVersion}`;
    const definition = definitionMap.get(key);

    if (!definition) {
      errors.push({
        nodeId: node.id,
        scope: 'contract',
        code: 'BLOCK_DEFINITION_NOT_FOUND',
        severity: 'error',
        message: `Block definition not found for ${key}.`,
        context: { blockId: node.blockId, blockVersion: node.blockVersion },
      });
      continue;
    }

    const inputContracts = resolveInputContracts(node, graph.edges, nodeOutputContracts);
    const { errors: nodeErrors, outputContracts } = validateNode(
      node,
      definition,
      inputContracts,
      graph.edges,
    );

    errors.push(...nodeErrors);
    nodeOutputContracts.set(node.id, outputContracts as Record<string, Contract>);
    contracts[node.id] = outputContracts as Record<string, Contract>;
  }

  return {
    valid: errors.length === 0,
    errors,
    contracts,
  };
}

function resolveInputContracts(
  node: GraphNode,
  edges: GraphEdge[],
  nodeOutputContracts: Map<string, Record<string, Contract>>,
): Record<string, Contract> {
  const inputContracts: Record<string, Contract> = {};
  const incoming = getIncomingEdges(node.id, edges);

  for (const edge of incoming) {
    const sourceContracts = nodeOutputContracts.get(edge.sourceNodeId);
    if (sourceContracts && sourceContracts[edge.sourcePortId]) {
      inputContracts[edge.targetPortId] = sourceContracts[edge.sourcePortId];
    }
  }

  return inputContracts;
}
