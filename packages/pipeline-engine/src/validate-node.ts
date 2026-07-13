import type { BlockDefinition, ValidationError } from '@training-ml/contracts';
import type { GraphEdge, GraphNode, NodeContext } from './types';
import { buildOutputContracts } from './phases/build-contract';
import { validateConfig } from './phases/validate-config';
import { validateConstraints } from './phases/validate-constraints';
import { validatePorts } from './phases/validate-ports';

export function validateNode(
  node: GraphNode,
  definition: BlockDefinition,
  inputContracts: Record<string, unknown>,
  allEdges: GraphEdge[],
): {
  errors: ValidationError[];
  outputContracts: Record<string, unknown>;
} {
  const ctx: NodeContext = {
    node,
    definition,
    inputContracts: inputContracts as NodeContext['inputContracts'],
    outputContracts: {},
    errors: [],
  };

  const errors: ValidationError[] = [];

  errors.push(...validatePorts(ctx, allEdges));

  // Only proceed with deeper validation if ports are valid enough to reason about contracts.
  const hasFatalPortError = errors.some(
    (e) => e.scope === 'port' && e.severity === 'error',
  );

  if (!hasFatalPortError) {
    errors.push(...validateConfig(ctx));
    errors.push(...validateConstraints(ctx));
  }

  const { contracts: outputContracts, errors: contractErrors } = buildOutputContracts(ctx);
  errors.push(...contractErrors);

  return {
    errors,
    outputContracts,
  };
}
