import { DatasetRole, MlTask, PipelineArtifactType } from '@training-ml/contracts';
import { eq } from '../../src/operators/eq';
import type { NodeContext } from '../../src/types';

function makeCtx(role: string) {
  const ctx: NodeContext = {
    node: { id: 'n1', blockId: 'rf', blockVersion: 1, config: {} },
    definition: {} as NodeContext['definition'],
    inputContracts: {
      dataset: {
        artifact: PipelineArtifactType.DATASET,
        schema: { columns: [], target: null },
        role: role as DatasetRole,
        task: MlTask.CLASSIFICATION,
      },
    },
    outputContracts: {},
    errors: [],
  };
  return ctx;
}

describe('eq operator', () => {
  it('passes when value matches', () => {
    const rule = { op: 'eq', left: '$input.dataset.role', right: 'train', severity: 'error' };
    expect(eq(rule, makeCtx('train'))).toEqual([]);
  });

  it('fails when value does not match', () => {
    const rule = { op: 'eq', left: '$input.dataset.role', right: 'train', severity: 'error' };
    const errors = eq(rule, makeCtx('test'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('VALUE_MISMATCH');
  });
});
