import { DatasetRole, MlTask, PipelineArtifactType, SemanticType } from '@training-ml/contracts';
import { subsetOf } from '../../src/operators/subset-of';
import type { NodeContext } from '../../src/types';

function makeCtx(config: Record<string, unknown>, inputContracts: Record<string, unknown> = {}): NodeContext {
  return {
    node: { id: 'n1', blockId: 'feature-selection', blockVersion: 1, config },
    definition: {} as NodeContext['definition'],
    inputContracts: inputContracts as NodeContext['inputContracts'],
    outputContracts: {},
    errors: [],
  };
}

const datasetInput = {
  artifact: PipelineArtifactType.DATASET,
  schema: {
    columns: [
      { name: 'age', primitive: 'int', semantic: SemanticType.NUMERIC },
      { name: 'income', primitive: 'float', semantic: SemanticType.NUMERIC },
      { name: 'target', primitive: 'string', semantic: SemanticType.CATEGORICAL },
    ],
    target: 'target',
  },
  role: DatasetRole.FULL,
  task: MlTask.CLASSIFICATION,
};

describe('subsetOf operator', () => {
  it('passes when a string left path resolves to a string contained in right', () => {
    const rule = {
      op: 'subsetOf',
      left: '$input.dataset.schema.target',
      right: '$config.columns',
      severity: 'error',
    };
    const ctx = makeCtx({ columns: ['age', 'income', 'target'] }, { dataset: datasetInput });
    expect(subsetOf(rule, ctx)).toEqual([]);
  });

  it('fails when a string left path resolves to a string missing from right', () => {
    const rule = {
      op: 'subsetOf',
      left: '$input.dataset.schema.target',
      right: '$config.columns',
      severity: 'error',
    };
    const ctx = makeCtx({ columns: ['age', 'income'] }, { dataset: datasetInput });
    const errors = subsetOf(rule, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('NOT_SUBSET');
    expect(errors[0].context?.missing).toEqual(['target']);
  });

  it('passes when left is an array of paths and all resolved items are in right', () => {
    const rule = {
      op: 'subsetOf',
      left: ['$config.requiredA', '$config.requiredB'],
      right: '$config.columns',
      severity: 'error',
    };
    const ctx = makeCtx({ requiredA: 'age', requiredB: 'income', columns: ['age', 'income', 'target'] });
    expect(subsetOf(rule, ctx)).toEqual([]);
  });

  it('fails when left is an array of paths and any resolved item is missing from right', () => {
    const rule = {
      op: 'subsetOf',
      left: ['$config.requiredA', '$config.requiredB'],
      right: '$config.columns',
      severity: 'error',
    };
    const ctx = makeCtx({ requiredA: 'age', requiredB: 'missing_col', columns: ['age', 'income', 'target'] });
    const errors = subsetOf(rule, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('NOT_SUBSET');
    expect(errors[0].context?.missing).toEqual(['missing_col']);
  });

  it('passes when left is a single-element array (matches seed migration shape)', () => {
    const rule = {
      op: 'subsetOf',
      left: ['$input.dataset.schema.target'],
      right: '$config.columns',
      severity: 'error',
      message: 'Target must remain among the kept columns.',
    };
    const ctx = makeCtx({ columns: ['age', 'income', 'target'] }, { dataset: datasetInput });
    expect(subsetOf(rule, ctx)).toEqual([]);
  });

  it('does not crash and silently ignores non-string entries in left array', () => {
    const rule = {
      op: 'subsetOf',
      left: ['$config.a', 42 as unknown as string],
      right: '$config.columns',
      severity: 'error',
    };
    const ctx = makeCtx({ a: 'age', columns: ['age', 'income'] });
    expect(subsetOf(rule, ctx)).toEqual([]);
  });
});
