import { DatasetRole, MlTask, PipelineArtifactType } from '@training-ml/contracts';
import { eq } from '../../src/operators/eq';
import type { NodeContext } from '../../src/types';

function makeCtx(role: string, task: MlTask = MlTask.CLASSIFICATION): NodeContext {
  return {
    node: { id: 'n1', blockId: 'rf', blockVersion: 1, config: {} },
    definition: {} as NodeContext['definition'],
    inputContracts: {
      dataset: {
        artifact: PipelineArtifactType.DATASET,
        schema: { columns: [], target: null },
        role: role as DatasetRole,
        task,
      },
    },
    outputContracts: {},
    errors: [],
  };
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

  it('passes when right is a path and the resolved values match', () => {
    const ctx: NodeContext = {
      node: { id: 'eval', blockId: 'evaluation', blockVersion: 1, config: {} },
      definition: {} as NodeContext['definition'],
      inputContracts: {
        model: { artifact: 'Model', algorithm: 'RF', task: MlTask.CLASSIFICATION, featureSchema: [], targetSchema: null },
        dataset: {
          artifact: PipelineArtifactType.DATASET,
          schema: { columns: [], target: null },
          role: DatasetRole.TEST,
          task: MlTask.CLASSIFICATION,
        },
      },
      outputContracts: {},
      errors: [],
    };
    const rule = {
      op: 'eq',
      left: '$input.model.task',
      right: '$input.dataset.task',
      severity: 'error',
    };
    expect(eq(rule, ctx)).toEqual([]);
  });

  it('fails when right is a path and the resolved values do not match', () => {
    const ctx: NodeContext = {
      node: { id: 'eval', blockId: 'evaluation', blockVersion: 1, config: {} },
      definition: {} as NodeContext['definition'],
      inputContracts: {
        model: { artifact: 'Model', algorithm: 'RF', task: MlTask.CLASSIFICATION, featureSchema: [], targetSchema: null },
        dataset: {
          artifact: PipelineArtifactType.DATASET,
          schema: { columns: [], target: null },
          role: DatasetRole.TEST,
          task: MlTask.REGRESSION,
        },
      },
      outputContracts: {},
      errors: [],
    };
    const rule = {
      op: 'eq',
      left: '$input.model.task',
      right: '$input.dataset.task',
      severity: 'error',
    };
    const errors = eq(rule, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('VALUE_MISMATCH');
  });

  it('passes when right is a literal array of strings and one matches', () => {
    const rule = { op: 'eq', left: '$input.dataset.task', right: ['classification', 'regression'], severity: 'error' };
    expect(eq(rule, makeCtx('train', MlTask.CLASSIFICATION))).toEqual([]);
  });

  it('passes with negate when right is a path and the resolved value differs', () => {
    const ctx: NodeContext = {
      node: { id: 'save', blockId: 'save-model', blockVersion: 1, config: { format: 'joblib' } },
      definition: {} as NodeContext['definition'],
      inputContracts: {
        model: { artifact: 'Model', algorithm: 'KMeans', task: MlTask.CLUSTERING, featureSchema: [], targetSchema: null },
      },
      outputContracts: {},
      errors: [],
    };
    const rule = {
      op: 'eq',
      left: '$config.format',
      right: 'onnx',
      negate: true,
      severity: 'error',
    };
    expect(eq(rule, ctx)).toEqual([]);
  });
});
