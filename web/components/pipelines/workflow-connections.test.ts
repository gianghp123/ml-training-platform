import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWorkflowEdge, getDefaultTargetHandle } from './workflow-connections.ts';

test('selects a target handle for every block type', () => {
  assert.equal(getDefaultTargetHandle('ingestion', 'Dataset'), 'input');
  assert.equal(getDefaultTargetHandle('preprocessing', 'Scaler'), 'data_in');
  assert.equal(getDefaultTargetHandle('training', 'Model'), 'training_data');
  assert.equal(getDefaultTargetHandle('evaluation', 'Metrics'), 'eval_in');
  assert.equal(getDefaultTargetHandle('deploy', 'Artifact Bundle'), 'art_in');
  assert.equal(getDefaultTargetHandle('deploy', 'Registry'), 'save_in');
});

test('builds an edge for an arbitrary cross-type body drop', () => {
  const edge = buildWorkflowEdge({
    source: 'evaluation-1',
    target: 'ingestion-1',
    sourceHandle: 'compute_metric',
    targetHandle: 'input',
    id: 'edge-1',
  });

  assert.deepEqual(edge, {
    id: 'edge-1',
    source: 'evaluation-1',
    target: 'ingestion-1',
    sourceHandle: 'compute_metric',
    targetHandle: 'input',
    animated: true,
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
  });
});
