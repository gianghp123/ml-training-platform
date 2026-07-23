import type { Contract, BlockDefinition, ValidationError, Column } from '@training-ml/contracts';

export interface GraphNode {
  id: string;
  blockId: string;
  blockVersion: number;
  config: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  contracts: Record<string, Record<string, Contract>>;
  inputContracts: Record<string, Record<string, Contract>>;
}

export type ResolveColumnsFn = (datasetId: string) => Column[] | null;

export interface NodeContext {
  node: GraphNode;
  definition: BlockDefinition;
  inputContracts: Record<string, Contract>;
  outputContracts: Record<string, Contract>;
  errors: ValidationError[];
  resolveColumns?: ResolveColumnsFn;
}
