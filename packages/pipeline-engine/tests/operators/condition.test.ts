import { evaluateCondition } from '../../src/operators/_condition';
import type { NodeContext } from '../../src/types';

function makeCtx(config: Record<string, unknown>, inputContracts: Record<string, unknown> = {}): NodeContext {
  return {
    node: { id: 'n1', blockId: 'select-target', blockVersion: 1, config },
    definition: {} as NodeContext['definition'],
    inputContracts: inputContracts as NodeContext['inputContracts'],
    outputContracts: {},
    errors: [],
  };
}

describe('evaluateCondition', () => {
  it('returns true when rule has no condition', () => {
    expect(evaluateCondition({ op: 'exists', target: '$config.x' }, makeCtx({}))).toBe(true);
  });

  it('returns true when condition object is empty (no field)', () => {
    expect(evaluateCondition({ op: 'exists', target: '$config.x', condition: {} }, makeCtx({}))).toBe(true);
  });

  it('resolves $config.* and applies equals', () => {
    const rule = { op: 'exists', target: '$config.x', condition: { field: 'task', equals: 'classification' } };
    expect(evaluateCondition(rule, makeCtx({ task: 'classification' }))).toBe(true);
    expect(evaluateCondition(rule, makeCtx({ task: 'regression' }))).toBe(false);
    expect(evaluateCondition(rule, makeCtx({}))).toBe(false);
  });

  it('resolves $config.* and applies in[]', () => {
    const rule = { op: 'exists', target: '$config.x', condition: { field: 'task', in: ['classification', 'regression'] } };
    expect(evaluateCondition(rule, makeCtx({ task: 'classification' }))).toBe(true);
    expect(evaluateCondition(rule, makeCtx({ task: 'regression' }))).toBe(true);
    expect(evaluateCondition(rule, makeCtx({ task: 'clustering' }))).toBe(false);
    expect(evaluateCondition(rule, makeCtx({}))).toBe(false);
  });

  it('resolves $input.* port contracts', () => {
    const rule = { op: 'eq', target: '$config.x', condition: { field: '$input.model.algorithm', in: ['KMeans'] } };
    const ctx = makeCtx({}, {
      model: { artifact: 'Model', algorithm: 'KMeans', task: 'clustering', featureSchema: [], targetSchema: null },
    });
    expect(evaluateCondition(rule, ctx)).toBe(true);

    const ctx2 = makeCtx({}, {
      model: { artifact: 'Model', algorithm: 'RandomForest', task: 'classification', featureSchema: [], targetSchema: null },
    });
    expect(evaluateCondition(rule, ctx2)).toBe(false);
  });

  it('AND-combines equals and in when both are present', () => {
    const rule = { op: 'exists', target: '$config.x', condition: { field: 'task', equals: 'classification', in: ['classification', 'regression'] } };
    expect(evaluateCondition(rule, makeCtx({ task: 'classification' }))).toBe(true);
    expect(evaluateCondition(rule, makeCtx({ task: 'regression' }))).toBe(false);
  });
});
