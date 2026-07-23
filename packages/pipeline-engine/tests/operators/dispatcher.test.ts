import { evaluateRule } from '../../src/operators';
import type { NodeContext } from '../../src/types';

function makeCtx(config: Record<string, unknown>): NodeContext {
  return {
    node: { id: 'n1', blockId: 'load-csv', blockVersion: 1, config },
    definition: {} as NodeContext['definition'],
    inputContracts: {},
    outputContracts: {},
    errors: [],
  };
}

describe('evaluateRule', () => {
  it('skips a rule whose condition is not satisfied (no errors returned)', () => {
    const rule = {
      op: 'exists',
      target: '$config.file',
      severity: 'error',
      message: 'File is required.',
      condition: { field: 'task', equals: 'classification' },
    };
    const errors = evaluateRule(rule, makeCtx({ task: 'regression' }));
    expect(errors).toEqual([]);
  });

  it('runs a rule whose condition is satisfied', () => {
    const rule = {
      op: 'exists',
      target: '$config.file',
      severity: 'error',
      message: 'File is required.',
      condition: { field: 'task', equals: 'classification' },
    };
    const errors = evaluateRule(rule, makeCtx({ task: 'classification' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('REQUIRED_FIELD_MISSING');
  });

  it('runs a rule that has no condition (back-compat)', () => {
    const rule = { op: 'exists', target: '$config.file', severity: 'error', message: 'File is required.' };
    const errors = evaluateRule(rule, makeCtx({}));
    expect(errors).toHaveLength(1);
  });

  it('still returns UNKNOWN_OPERATOR when the op is missing, regardless of condition', () => {
    const rule = { op: 'mystery', target: '$config.x', condition: { field: 'task', equals: 'classification' } };
    const errors = evaluateRule(rule, makeCtx({ task: 'classification' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('UNKNOWN_OPERATOR');
  });
});
