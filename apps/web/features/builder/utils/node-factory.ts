import type { BlockDefinition } from '@training-ml/contracts';
import type { Node, XYPosition } from '@xyflow/react';
import { ALL_BLOCKS } from '../blocks';
import type { SocketDefinition } from '../blocks/socket-types';

export interface PipelineNodeData extends Record<string, unknown> {
  blockId: string;
  blockCode: string;
  blockName: string;
  categoryId: string;
  config: Record<string, string | number | boolean>;
  inputs: SocketDefinition[];
  outputs: SocketDefinition[];
  status: 'idle' | 'queued' | 'running' | 'success' | 'error';
}

export type PipelineNodeType = 'block';
export type PipelineNode = Node<PipelineNodeData, PipelineNodeType>;


export function createNodeId(): string {
  return `node_${Date.now()}`;
}

export function parseSocketEntries(
  schema: Record<string, unknown> | undefined
): SocketDefinition[] {
  if (!schema || !Array.isArray((schema as Record<string, unknown>).entries)) {
    return [];
  }
  return (schema as { entries: SocketDefinition[] }).entries;
}

export function createDefaultConfig(
  configSchema: Record<string, unknown> | undefined
): Record<string, string | number | boolean> {
  if (!configSchema) return {};
  const config: Record<string, string | number | boolean> = {};
  for (const [key, field] of Object.entries(configSchema)) {
    const f = field as { default?: string | number | boolean };
    if (f.default !== undefined) {
      config[key] = f.default;
    }
  }
  return config;
}

export function createPipelineNode(
  block: BlockDefinition,
  position: XYPosition
): PipelineNode {
  const inputs = parseSocketEntries(block.inputSchema);
  const outputs = parseSocketEntries(block.outputSchema);

  return {
    id: createNodeId(),
    type: 'block',
    position,
    data: {
      blockId: block.id,
      blockCode: block.code,
      blockName: block.name,
      categoryId: block.categoryId,
      config: createDefaultConfig(block.configSchema),
      inputs,
      outputs,
      status: 'idle',
    },
  };
}

export function findBlockById(blockId: string): BlockDefinition | undefined {
  return ALL_BLOCKS.find((b) => b.id === blockId);
}
