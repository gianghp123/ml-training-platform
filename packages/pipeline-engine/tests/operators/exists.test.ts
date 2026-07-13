import { exists } from '../../src/operators/exists';
import type { NodeContext } from '../../src/types';

function makeCtx(config: Record<string, unknown>) {
  const ctx: NodeContext = {
    node: { id: 'n1', blockId: 'load-csv', blockVersion: 1, config },
    definition: {} as NodeContext['definition'],
    inputContracts: {},
    outputContracts: {},
    errors: [],
  };
  return ctx;
}

describe('exists operator', () => {
  it('passes when field exists', () => {
    const rule = { op: 'exists', target: '$config.file', severity: 'error', message: 'File is required.' };
    expect(exists(rule, makeCtx({ file: 'data.csv' }))).toEqual([]);
  });

  it('fails when field is missing', () => {
    const rule = { op: 'exists', target: '$config.file', severity: 'error', message: 'File is required.' };
    const errors = exists(rule, makeCtx({}));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('REQUIRED_FIELD_MISSING');
  });
});
