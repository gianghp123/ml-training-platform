import type { Column, Contract } from '@training-ml/contracts';
import { disjoint } from '../../src/operators/disjoint';
import type { NodeContext } from '../../src/types';

const ds = (names: string[]): Contract =>
  ({
    artifact: 'Dataset',
    schema: {
      columns: names.map((name): Column => ({ name, primitive: 'int', semantic: 'numeric', nullable: false })),
      target: null,
    },
    role: 'full',
    task: null,
  }) as unknown as Contract;

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: { keys: ['CustomerID'] } },
  inputContracts: {
    left: ds(['CustomerID', 'Age']),
    right: ds(['CustomerID', 'TotalSpent']),
    datasetA: ds(['a', 'b']),
    datasetB: ds(['c', 'd']),
    datasetC: ds(['a', 'e']),
  },
  definition: {},
  outputContracts: {},
  errors: [],
} as unknown as NodeContext;

describe('disjoint', () => {
  it('legacy left/right: passes when columns are disjoint', () => {
    expect(disjoint({ op: 'disjoint', left: '$input.datasetA', right: '$input.datasetB' } as never, ctx)).toEqual([]);
  });

  it('legacy left/right: flags overlapping columns', () => {
    const errors = disjoint({ op: 'disjoint', left: '$input.datasetA', right: '$input.datasetC' } as never, ctx);
    expect(errors[0].code).toBe('COLUMNS_NOT_DISJOINT');
    expect(errors[0].context).toEqual({ overlap: ['a'] });
  });

  it('exclude removes key columns from comparison', () => {
    expect(
      disjoint(
        { op: 'disjoint', left: '$input.left', right: '$input.right', exclude: '$config.keys' } as never,
        ctx,
      ),
    ).toEqual([]);
  });

  it('N-ary targets: flags overlap across any pair, skipping unresolved inputs', () => {
    const errors = disjoint(
      {
        op: 'disjoint',
        targets: ['$input.datasetA', '$input.datasetB', '$input.datasetC', '$input.datasetD'],
      } as never,
      ctx,
    );
    expect(errors[0].code).toBe('COLUMNS_NOT_DISJOINT');
    expect(errors[0].context).toEqual({ overlap: ['a'] });
  });
});
