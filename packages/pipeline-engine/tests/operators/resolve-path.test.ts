import { resolvePath } from '../../src/operators/_resolve-path';
import type { NodeContext } from '../../src/types';

const datasetContract = {
  artifact: 'Dataset',
  schema: { columns: [], target: null },
  role: 'full',
  task: null,
} as never;

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: { keys: ['id'] } },
  inputContracts: { datasetA: datasetContract },
} as unknown as NodeContext;

describe('resolvePath', () => {
  it('resolves $input.<port> paths', () => {
    expect(resolvePath('$input.datasetA.role', ctx)).toBe('full');
  });

  it('resolves $inputs.<port> as an alias', () => {
    expect(resolvePath('$inputs.datasetA.role', ctx)).toBe('full');
  });

  it('resolves $config paths', () => {
    expect(resolvePath('$config.keys', ctx)).toEqual(['id']);
  });
});
