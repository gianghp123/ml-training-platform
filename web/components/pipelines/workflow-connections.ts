import type { Edge } from '@xyflow/react';

import type { NodeType } from '../../types';

type DropElement = {
  closest(selector: string): { getAttribute(name: string): string | null } | null;
};

export function findWorkflowNodeId(elements: readonly DropElement[]): string | null {
  for (const element of elements) {
    const nodeId = element.closest('.react-flow__node')?.getAttribute('data-id');
    if (nodeId) return nodeId;
  }
  return null;
}

export function canCreateWorkflowEdge(isRunning: boolean): boolean {
  return !isRunning;
}

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
  const sourceHandle = connection.sourceHandle;
  let stroke = '#3192fc'; // default vibrant blue
  if (sourceHandle === 'data_out' || sourceHandle === 'save_model') {
    stroke = '#32D583'; // vibrant green
  } else if (sourceHandle === 'compute_metric') {
    stroke = '#F79009'; // vibrant orange
  } else if (sourceHandle === 'create_artifacts') {
    stroke = '#7A5AF8'; // vibrant purple
  }

  return {
    ...connection,
    animated: true,
    style: { 
      stroke, 
      strokeWidth: 3,
      filter: `drop-shadow(0px 0px 3px ${stroke}80)` // Glowing effect
    },
  };
}
