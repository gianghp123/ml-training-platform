export type PipelineStatus = 'success' | 'error' | 'never_run' | 'running';

export type NodeType = 'ingestion' | 'preprocessing' | 'training' | 'evaluation' | 'deploy';

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  status: 'success' | 'error' | 'idle' | 'running';
  duration?: string;
  description?: string;
  logs?: string[];
  code?: string;
  inputs?: { name: string; type: string }[];
  outputs?: { name: string; type: string }[];
  position?: { x: number; y: number };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Pipeline {
  id: string;
  name: string;
  status: PipelineStatus;
  nodeCount: number;
  updatedTime: string;
  createdTime: string;
  nodes: PipelineNode[];
  edges?: PipelineEdge[];
  description: string;
  accuracy?: number;
  loss?: number;
}

export interface Dataset {
  id: string;
  name: string;
  size: string;
  format: 'csv' | 'parquet' | 'json';
  rows: string;
  status: 'ready' | 'processing';
  updatedTime: string;
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  f1Score: number;
  status: 'active' | 'draft' | 'archived';
  framework: string;
  type: string;
  updatedTime: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: string;
  pipelineId?: string;
}
