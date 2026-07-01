import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWorkflowEdge,
  canCreateWorkflowEdge,
  findWorkflowNodeId,
  getDefaultTargetHandle,
} from './workflow-connections.ts';

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
    style: { stroke: 'var(--primary)', strokeWidth: 2 },
  });
});

test('blocks new edges while the pipeline is running', () => {
  assert.equal(canCreateWorkflowEdge(true), false);
  assert.equal(canCreateWorkflowEdge(false), true);
});

test('finds the block below a connection overlay at the drop point', () => {
  const overlay = { closest: () => null };
  const node = {
    closest: (selector: string) => selector === '.react-flow__node'
      ? { getAttribute: (name: string) => name === 'data-id' ? 'preprocessing-1' : null }
      : null,
  };

  assert.equal(findWorkflowNodeId([overlay, node]), 'preprocessing-1');
});
