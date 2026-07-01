import type { Edge } from '@xyflow/react';

import type { NodeType } from '../../types';

export function getDefaultTargetHandle(type: NodeType, name: string): string {
  if (type === 'preprocessing') return 'data_in';
  if (type === 'training') return 'training_data';
  if (type === 'evaluation') return 'eval_in';
  if (type === 'deploy') {
    return name.toLowerCase().includes('artifact') ? 'art_in' : 'save_in';
  }
  return 'input';
}

export function buildWorkflowEdge(connection: {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}): Edge {
  return {
    ...connection,
    animated: true,
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
  };
}
