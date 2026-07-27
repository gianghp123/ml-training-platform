import type { BlockDefinition, Column, Contract } from '@training-ml/contracts';
import { validateConfig } from '../../src/phases/validate-config';
import type { NodeContext } from '../../src/types';

const columns: Column[] = [
  { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
  { name: 'Country', primitive: 'string', semantic: 'categorical', nullable: false },
];

const inputDataset = {
  artifact: 'Dataset',
  schema: { columns, target: null },
  role: 'full',
  task: null,
} as unknown as Contract;

const filterRowsDef = {
  configSchema: {
    fields: [
      {
        type: 'ConditionList',
        id: 'conditions',
        ops: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'isNull', 'isNotNull', 'in'],
      },
      { type: 'Select', id: 'combinator', options: ['AND', 'OR'], default: 'AND' },
      { type: 'Boolean', id: 'invert', default: false },
    ],
  },
} as unknown as BlockDefinition;

const formulaDef = {
  configSchema: {
    fields: [
      { type: 'Text', id: 'outputColumn' },
      { type: 'Select', id: 'outputType', options: ['float', 'int', 'boolean'], default: 'float' },
      { type: 'Expression', id: 'expression' },
    ],
  },
} as unknown as BlockDefinition;

function ctxWith(definition: BlockDefinition, config: Record<string, unknown>): NodeContext {
  return {
    node: { id: 'n1', blockId: 'b', blockVersion: 1, config },
    definition,
    inputContracts: { dataset: inputDataset },
    outputContracts: {},
    errors: [],
  } as NodeContext;
}

describe('validateConfig: ConditionList', () => {
  const codes = (config: Record<string, unknown>) =>
    validateConfig(ctxWith(filterRowsDef, config)).map((e) => e.code);

  it('accepts valid conditions', () => {
    expect(
      codes({
        conditions: [
          { column: 'Age', op: 'gte', value: 18 },
          { column: 'Country', op: 'eq', value: 'US' },
          { column: 'Age', op: 'isNotNull' },
        ],
      }),
    ).toEqual([]);
  });

  it('requires at least one condition', () => {
    expect(codes({ conditions: [] })).toEqual(['EMPTY_CONDITIONS']);
    expect(codes({})).toEqual(['EMPTY_CONDITIONS']);
  });

  it('rejects conditions on unknown columns', () => {
    expect(codes({ conditions: [{ column: 'Nope', op: 'eq', value: 1 }] })).toEqual([
      'CONDITION_COLUMN_NOT_FOUND',
    ]);
  });

  it('requires a value for non-null ops', () => {
    expect(codes({ conditions: [{ column: 'Age', op: 'gte' }] })).toEqual(['CONDITION_VALUE_MISSING']);
  });

  it('rejects non-array value for in', () => {
    expect(codes({ conditions: [{ column: 'Country', op: 'in', value: 'US' }] })).toEqual([
      'CONDITION_VALUE_TYPE_MISMATCH',
    ]);
  });

  it('rejects range ops on string columns', () => {
    expect(codes({ conditions: [{ column: 'Country', op: 'gt', value: 'A' }] })).toEqual([
      'CONDITION_VALUE_TYPE_MISMATCH',
    ]);
  });

  it('rejects unknown ops', () => {
    expect(codes({ conditions: [{ column: 'Age', op: 'regex', value: 1 }] })).toEqual(['INVALID_OPTION']);
  });
});

describe('validateConfig: Expression', () => {
  const codes = (config: Record<string, unknown>) =>
    validateConfig(ctxWith(formulaDef, config)).map((e) => e.code);

  it('accepts a valid expression and output column', () => {
    expect(codes({ outputColumn: 'IncomePerAge', outputType: 'float', expression: 'Age + 1' })).toEqual([]);
  });

  it('requires an expression', () => {
    expect(codes({ outputColumn: 'X', expression: '' })).toContain('EXPRESSION_PARSE_ERROR');
  });

  it('reports parse errors with position in context', () => {
    const errors = validateConfig(ctxWith(formulaDef, { outputColumn: 'X', expression: 'Age +' }));
    expect(errors[0].code).toBe('EXPRESSION_PARSE_ERROR');
    expect(typeof errors[0].context?.position).toBe('number');
  });

  it('reports unknown and non-numeric columns', () => {
    expect(codes({ outputColumn: 'X', expression: 'Salary + 1' })).toEqual(['EXPRESSION_UNKNOWN_COLUMN']);
    expect(codes({ outputColumn: 'X', expression: 'Country + 1' })).toEqual([
      'EXPRESSION_NON_NUMERIC_COLUMN',
    ]);
  });

  it('rejects an output column that already exists', () => {
    expect(codes({ outputColumn: 'Age', expression: 'Age + 1' })).toEqual(['EXPRESSION_OUTPUT_COLLISION']);
  });

  it('rejects an output column with invalid identifier format', () => {
    expect(codes({ outputColumn: '1bad name', expression: 'Age + 1' })).toEqual(['EXPRESSION_OUTPUT_INVALID']);
  });
});
