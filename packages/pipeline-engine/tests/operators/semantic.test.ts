import { PipelineArtifactType, DatasetRole, MlTask, SemanticType } from '@training-ml/contracts';
import { semantic } from '../../src/operators/semantic';
import type { NodeContext } from '../../src/types';

function makeCtx(columnName: string) {
  const ctx: NodeContext = {
    node: { id: 'n1', blockId: 'normalization', blockVersion: 1, config: { columns: columnName } },
    definition: {} as NodeContext['definition'],
    inputContracts: {
      dataset: {
        artifact: PipelineArtifactType.DATASET,
        schema: {
          columns: [
            { name: 'age', primitive: 'int', semantic: SemanticType.NUMERIC },
            { name: 'gender', primitive: 'string', semantic: SemanticType.CATEGORICAL },
          ],
          target: null,
        },
        role: DatasetRole.FULL,
        task: null,
      },
    },
    outputContracts: {},
    errors: [],
  };
  return ctx;
}

describe('semantic operator', () => {
  it('passes for numeric column', () => {
    const rule = { op: 'semantic', target: '$config.columns', severity: 'error', expected: ['numeric'] };
    expect(semantic(rule, makeCtx('age'))).toEqual([]);
  });

  it('fails for categorical column', () => {
    const rule = { op: 'semantic', target: '$config.columns', severity: 'error', expected: ['numeric'] };
    const errors = semantic(rule, makeCtx('gender'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('SEMANTIC_MISMATCH');
  });
});
