import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePipeline, wouldCreateCycle } from './pipeline-validator.ts';
import type { BlockDefinition } from '../../../lib/models/block-definition.interface.ts';
import type { PipelineNode } from './node-factory.ts';

test('wouldCreateCycle rejects an edge that closes a path', () => {
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
  ];

  assert.equal(wouldCreateCycle(edges, 'c', 'a'), true);
  assert.equal(wouldCreateCycle(edges, 'c', 'd'), false);
});

test('validatePipeline reports missing required config and input', () => {
  const block: BlockDefinition = {
    id: 'trainer',
    code: 'trainer',
    name: 'Trainer',
    categoryId: 'model',
    configSchema: {
      target: { type: 'text', label: 'Target', validation: { required: true } },
    },
    portSchema: {
      ports: [
        { id: 'dataset', label: 'Dataset', direction: 'input', artifact: 'Dataset', required: true, multiple: false },
      ],
    },
  };
  const node = {
    id: 'trainer-1',
    type: 'block',
    position: { x: 0, y: 0 },
    data: {
      blockId: block.id,
      blockCode: block.code,
      blockName: block.name,
      categoryId: block.categoryId,
      config: {},
      inputs: block.portSchema?.ports ?? [],
      outputs: [],
      status: 'idle',
    },
  } as PipelineNode;

  const issues = validatePipeline([node], [], [block], new Set(['model']));

  assert.deepEqual(issues.map((issue) => issue.code), ['MISSING_CONFIG', 'MISSING_INPUT']);
});
