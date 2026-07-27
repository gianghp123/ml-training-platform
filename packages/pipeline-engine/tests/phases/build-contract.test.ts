import type { BlockDefinition, Column, Contract } from '@training-ml/contracts';
import { buildOutputContracts } from '../../src/phases/build-contract';
import type { NodeContext } from '../../src/types';

const cols = (...names: string[]): Column[] =>
  names.map((name) => ({ name, primitive: 'int', semantic: 'numeric', nullable: false }) as Column);

const ds = (nameCols: Column[] | 'unknown', extra: Partial<{ target: string | null; task: string | null; role: string }> = {}) =>
  ({
    artifact: 'Dataset',
    schema: { columns: nameCols, target: extra.target ?? null },
    role: extra.role ?? 'full',
    task: extra.task ?? null,
  }) as unknown as Contract;

function ctxWith(
  outputTransform: unknown,
  inputContracts: Record<string, Contract>,
  config: Record<string, unknown> = {},
): NodeContext {
  return {
    node: { id: 'n1', blockId: 'b', blockVersion: 1, config },
    definition: {
      ports: { inputs: [], outputs: [{ id: 'dataset', artifact: 'Dataset' }] },
      outputTransform,
    } as unknown as BlockDefinition,
    inputContracts,
    outputContracts: {},
    errors: [],
  } as NodeContext;
}

describe('buildOutputContracts: copyInput + addColumns', () => {
  const transform = {
    declared: {
      copyInput: true,
      addColumns: [{ name: '$config.outputColumn', primitive: '$config.outputType' }],
    },
  };

  it('appends the new column', () => {
    const { contracts, errors } = buildOutputContracts(
      ctxWith(transform, { dataset: ds(cols('Age', 'Income')) }, { outputColumn: 'IncomePerAge', outputType: 'float' }),
    );
    expect(errors).toEqual([]);
    const out = contracts.dataset as { schema: { columns: Column[] } };
    expect(out.schema.columns.map((c) => c.name)).toEqual(['Age', 'Income', 'IncomePerAge']);
    expect(out.schema.columns[2]).toMatchObject({ primitive: 'float', semantic: 'numeric', nullable: true });
  });

  it('boolean output column gets categorical semantic', () => {
    const { contracts } = buildOutputContracts(
      ctxWith(transform, { dataset: ds(cols('Age')) }, { outputColumn: 'IsAdult', outputType: 'boolean' }),
    );
    const out = contracts.dataset as { schema: { columns: Column[] } };
    expect(out.schema.columns[1]).toMatchObject({ primitive: 'boolean', semantic: 'categorical' });
  });

  it('emits COLUMN_COLLISION when the name exists', () => {
    const { errors } = buildOutputContracts(
      ctxWith(transform, { dataset: ds(cols('Age')) }, { outputColumn: 'Age', outputType: 'float' }),
    );
    expect(errors[0].code).toBe('COLUMN_COLLISION');
  });
});

describe('buildOutputContracts: joinColumns', () => {
  const transform = {
    declared: { joinColumns: { left: '$input.left', right: '$input.right', keys: '$config.keys' } },
  };

  it('merges columns, dropping duplicate keys, keeping left metadata', () => {
    const { contracts, errors } = buildOutputContracts(
      ctxWith(
        transform,
        {
          left: ds(cols('CustomerID', 'Age'), { target: 'Age', task: 'regression', role: 'train' }),
          right: ds(cols('CustomerID', 'TotalSpent'), { role: 'test' }),
        },
        { keys: ['CustomerID'] },
      ),
    );
    expect(errors).toEqual([]);
    const out = contracts.dataset as { schema: { columns: Column[]; target: string | null }; role: string; task: string | null };
    expect(out.schema.columns.map((c) => c.name)).toEqual(['CustomerID', 'Age', 'TotalSpent']);
    expect(out.schema.target).toBe('Age');
    expect(out.role).toBe('train');
    expect(out.task).toBe('regression');
  });

  it('emits COLUMN_COLLISION on non-key overlap (defense-in-depth)', () => {
    const { errors } = buildOutputContracts(
      ctxWith(
        transform,
        { left: ds(cols('CustomerID', 'created_at')), right: ds(cols('CustomerID', 'created_at')) },
        { keys: ['CustomerID'] },
      ),
    );
    expect(errors[0].code).toBe('COLUMN_COLLISION');
  });
});

describe('buildOutputContracts: concatColumns merge', () => {
  const transform = {
    declared: { concatColumns: ['$inputs.datasetA', '$inputs.datasetB', '$inputs.datasetC', '$inputs.datasetD'] },
  };

  it('merges columns from connected inputs only', () => {
    const { contracts } = buildOutputContracts(
      ctxWith(transform, { datasetA: ds(cols('a', 'b')), datasetB: ds(cols('c')) }),
    );
    const out = contracts.dataset as { schema: { columns: Column[] } };
    expect(out.schema.columns.map((c) => c.name)).toEqual(['a', 'b', 'c']);
  });

  it('takes target/task from the first input that defines one', () => {
    const { contracts } = buildOutputContracts(
      ctxWith(transform, {
        datasetA: ds(cols('a')),
        datasetB: ds(cols('c'), { target: 'c', task: 'classification', role: 'train' }),
      }),
    );
    const out = contracts.dataset as { schema: { target: string | null }; role: string; task: string | null };
    expect(out.schema.target).toBe('c');
    expect(out.task).toBe('classification');
    expect(out.role).toBe('full');
  });
});
