import type { BlockDefinition, BlockPort } from '@/lib/models';
import type { Node, XYPosition } from '@xyflow/react';
import { ALL_BLOCKS } from '../blocks';
import type { SocketDefinition } from '../blocks/socket-types';

export interface PipelineNodeData extends Record<string, unknown> {
  blockId: string;
  blockCode: string;
  blockName: string;
  categoryId: string;
  config: Record<string, string | number | boolean | string[]>;
  inputs: SocketDefinition[];
  outputs: SocketDefinition[];
  status: 'idle' | 'queued' | 'running' | 'success' | 'error';
}

export type PipelineNodeType = 'block';
export type PipelineNode = Node<PipelineNodeData, PipelineNodeType>;


export function createNodeId(): string {
  return `node_${crypto.randomUUID()}`;
}

export function parseSocketEntries(
  ports: BlockPort[] | undefined,
  direction: 'input' | 'output'
): SocketDefinition[] {
  if (!ports || !Array.isArray(ports)) {
    return [];
  }
  return ports
    .filter((port) => port.direction === direction)
    .map((port) => ({
      id: port.id,
      label: port.label,
      direction: port.direction,
      artifact: port.artifact,
      required: port.required,
      multiple: port.multiple,
    }));
}

export function createDefaultConfig(
  configSchema: BlockDefinition['configSchema']
): Record<string, string | number | boolean | string[]> {
  if (!configSchema) return {};
  const config: Record<string, string | number | boolean | string[]> = {};
  for (const [key, field] of Object.entries(configSchema)) {
    const f = field as { default?: string | number | boolean | string[] };
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
  const ports = block.portSchema?.ports ?? [];
  const inputs = parseSocketEntries(ports, 'input');
  const outputs = parseSocketEntries(ports, 'output');

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

export function findBlockByCode(blockCode: string): BlockDefinition | undefined {
  return ALL_BLOCKS.find((b) => b.code === blockCode);
}
