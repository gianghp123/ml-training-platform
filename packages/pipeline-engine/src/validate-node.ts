import type { BlockDefinition, Column, ValidationError } from '@training-ml/contracts';
import type { GraphEdge, GraphNode, NodeContext, ResolveColumnsFn } from './types.js';
import { buildOutputContracts } from './phases/build-contract.js';
import { validateConfig } from './phases/validate-config.js';
import { validateConstraints } from './phases/validate-constraints.js';
import { validatePorts } from './phases/validate-ports.js';

export function validateNode(
  node: GraphNode,
  definition: BlockDefinition,
  inputContracts: Record<string, unknown>,
  allEdges: GraphEdge[],
  resolveColumns?: ResolveColumnsFn,
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
    resolveColumns,
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
