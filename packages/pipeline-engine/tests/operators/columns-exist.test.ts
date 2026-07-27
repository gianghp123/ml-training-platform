import type { Column, Contract } from '@training-ml/contracts';
import { columnsExist } from '../../src/operators/columns-exist';
import type { NodeContext } from '../../src/types';

const ds = (names: string[] | 'unknown'): Contract =>
  ({
    artifact: 'Dataset',
    schema: {
      columns:
        names === 'unknown'
          ? 'unknown'
          : names.map((name): Column => ({ name, primitive: 'int', semantic: 'numeric', nullable: false })),
      target: null,
    },
    role: 'full',
    task: null,
  }) as unknown as Contract;

const ctx = {
  node: { id: 'n1', blockId: 'b', blockVersion: 1, config: { keys: ['CustomerID'] } },
  inputContracts: { left: ds(['CustomerID', 'Age']), right: ds(['TotalSpent']), unknownSrc: ds('unknown') },
  definition: {},
  outputContracts: {},
  errors: [],
} as unknown as NodeContext;

describe('columnsExist', () => {
  it('passes when every key exists in every input', () => {
    expect(
      columnsExist({ op: 'columnsExist', columns: '$config.keys', inputs: ['$input.left'] } as never, ctx),
    ).toEqual([]);
  });

  it('reports keys missing from any input', () => {
    const errors = columnsExist(
      { op: 'columnsExist', columns: '$config.keys', inputs: ['$input.left', '$input.right'] } as never,
      ctx,
    );
    expect(errors[0].code).toBe('KEYS_NOT_FOUND');
    expect(errors[0].context).toEqual({ missing: { right: ['CustomerID'] } });
  });

  it('skips inputs with unknown columns', () => {
    expect(
      columnsExist({ op: 'columnsExist', columns: '$config.keys', inputs: ['$input.unknownSrc'] } as never, ctx),
    ).toEqual([]);
  });

  it('skips unconnected (unresolvable) inputs', () => {
    expect(
      columnsExist({ op: 'columnsExist', columns: '$config.keys', inputs: ['$input.left', '$input.gone'] } as never, ctx),
    ).toEqual([]);
  });
});
