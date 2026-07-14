import type { Edge } from '@xyflow/react';
import type { BlockDefinition } from '@/lib/models';
import type { PipelineNode } from './node-factory';

export interface PipelineValidationIssue {
  code:
    | 'EMPTY_PIPELINE'
    | 'UNKNOWN_BLOCK'
    | 'UNKNOWN_CATEGORY'
    | 'MISSING_CONFIG'
    | 'INVALID_CONFIG'
    | 'MISSING_INPUT'
    | 'INVALID_EDGE'
    | 'CYCLE';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export function wouldCreateCycle(
  edges: Pick<Edge, 'source' | 'target'>[],
  source: string,
  target: string,
): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }
  const targets = adjacency.get(source) ?? [];
  targets.push(target);
  adjacency.set(source, targets);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return [...adjacency.keys()].some(visit);
}

export function validatePipeline(
  nodes: PipelineNode[],
  edges: Edge[],
  blocks: BlockDefinition[],
  categoryIds: ReadonlySet<string>,
): PipelineValidationIssue[] {
  if (nodes.length === 0) {
    return [{ code: 'EMPTY_PIPELINE', message: 'Pipeline chưa có block nào.' }];
  }

  const issues: PipelineValidationIssue[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const blockById = new Map(blocks.map((block) => [block.id, block]));

  for (const node of nodes) {
    const block = blockById.get(node.data.blockId);
    if (!block) {
      issues.push({ code: 'UNKNOWN_BLOCK', nodeId: node.id, message: `${node.data.blockName}: block definition không tồn tại.` });
      continue;
    }
    if (!categoryIds.has(block.categoryId)) {
      issues.push({ code: 'UNKNOWN_CATEGORY', nodeId: node.id, message: `${block.name}: category "${block.categoryId}" không tồn tại.` });
    }

    for (const [key, field] of Object.entries(block.configSchema ?? {})) {
      const value = node.data.config[key];
      const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      if (field.validation?.required && empty) {
        issues.push({ code: 'MISSING_CONFIG', nodeId: node.id, message: `${block.name}: thiếu cấu hình "${field.label}".` });
        continue;
      }
      if (empty) continue;

      if (field.type === 'number') {
        const numberValue = Number(value);
        const invalid = !Number.isFinite(numberValue)
          || (field.validation?.min !== undefined && numberValue < field.validation.min)
          || (field.validation?.max !== undefined && numberValue > field.validation.max);
        if (invalid) {
          issues.push({ code: 'INVALID_CONFIG', nodeId: node.id, message: `${block.name}: giá trị "${field.label}" không hợp lệ.` });
        }
      } else if (typeof value === 'string') {
        const invalid = (field.validation?.minLength !== undefined && value.length < field.validation.minLength)
          || (field.validation?.maxLength !== undefined && value.length > field.validation.maxLength);
        if (invalid) {
          issues.push({ code: 'INVALID_CONFIG', nodeId: node.id, message: `${block.name}: độ dài "${field.label}" không hợp lệ.` });
        }
      }
    }

    for (const input of node.data.inputs.filter((port) => port.required)) {
      const connected = edges.some((edge) => edge.target === node.id && edge.targetHandle === input.id);
      if (!connected) {
        issues.push({ code: 'MISSING_INPUT', nodeId: node.id, message: `${block.name}: input "${input.label}" chưa được nối.` });
      }
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    const sourcePort = source?.data.outputs.find((port) => port.id === edge.sourceHandle);
    const targetPort = target?.data.inputs.find((port) => port.id === edge.targetHandle);
    if (!source || !target || !sourcePort || !targetPort || sourcePort.artifact !== targetPort.artifact) {
      issues.push({ code: 'INVALID_EDGE', edgeId: edge.id, message: `Edge "${edge.id}" tham chiếu node/port không hợp lệ.` });
    }
  }

  if (wouldCreateCycle(edges, '__validation_source__', '__validation_target__')) {
    issues.push({ code: 'CYCLE', message: 'Pipeline chứa chu trình.' });
  }

  return issues;
}
