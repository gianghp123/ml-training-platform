import type { BlockDefinition, ConfigField, Port } from '@training-ml/contracts';
import type { Node, XYPosition } from '@xyflow/react';

export interface PipelineNodeData extends Record<string, unknown> {
  block: BlockDefinition;
  blockId: string;
  blockName: string;
  categoryId: string;
  config: Record<string, string | number | boolean>;
  inputs: Port[];
  outputs: Port[];
  status: 'idle' | 'queued' | 'running' | 'success' | 'error';
}

export type PipelineNodeType = 'block';
export type PipelineNode = Node<PipelineNodeData, PipelineNodeType>;

export function createNodeId(): string {
  return `node_${Date.now()}`;
}

function getConfigDefault(field: ConfigField): string | number | boolean | undefined {
  switch (field.type) {
    case 'ColumnSelector':
      return field.multiple ? '' : '';
    case 'Select':
      return field.default;
    case 'Number':
      return field.default;
    case 'Boolean':
      return field.default ?? false;
    case 'Text':
      return '';
    case 'FileUpload':
      return '';
    case 'MultiSelect':
      return '';
    case 'KeyValueMap':
      return '';
    default:
      return undefined;
  }
}

export function createDefaultConfig(
  fields: ConfigField[] | undefined
): Record<string, string | number | boolean> {
  if (!fields) return {};
  const config: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    const defaultValue = getConfigDefault(field);
    if (defaultValue !== undefined) {
      config[field.id] = defaultValue;
    }
  }
  return config;
}

export function createPipelineNode(
  block: BlockDefinition,
  position: XYPosition
): PipelineNode {
  return {
    id: createNodeId(),
    type: 'block',
    position,
    data: {
      block,
      blockId: block.id,
      blockName: block.name,
      categoryId: block.categoryId,
      config: createDefaultConfig(block.configSchema.fields),
      inputs: block.ports.inputs,
      outputs: block.ports.outputs,
      status: 'idle',
    },
  };
}

export function findBlockById(
  blockId: string,
  blocks: BlockDefinition[]
): BlockDefinition | undefined {
  return blocks.find((b) => b.id === blockId);
}
