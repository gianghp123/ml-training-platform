import type { Contract, BlockDefinition, ValidationError } from '@training-ml/contracts';

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
}

export interface NodeContext {
  node: GraphNode;
  definition: BlockDefinition;
  inputContracts: Record<string, Contract>;
  outputContracts: Record<string, Contract>;
  errors: ValidationError[];
}
