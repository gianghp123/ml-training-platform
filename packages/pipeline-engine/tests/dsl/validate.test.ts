import type { Column } from '@training-ml/contracts';
import { parseExpression } from '../../src/dsl/parser';
import { validateAst } from '../../src/dsl/validate';

const columns: Column[] = [
  { name: 'Age', primitive: 'int', semantic: 'numeric', nullable: false },
  { name: 'Income', primitive: 'float', semantic: 'numeric', nullable: true },
  { name: 'Country', primitive: 'string', semantic: 'categorical', nullable: false },
];

describe('validateAst', () => {
  it('accepts an expression over known numeric columns', () => {
    expect(validateAst(parseExpression('Income / (Age + 1)'), columns)).toEqual([]);
  });

  it('reports unknown columns', () => {
    const errors = validateAst(parseExpression('Salary * 2'), columns);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('EXPRESSION_UNKNOWN_COLUMN');
    expect(errors[0].name).toBe('Salary');
  });

  it('reports non-numeric columns', () => {
    const errors = validateAst(parseExpression('Country + 1'), columns);
    expect(errors[0].code).toBe('EXPRESSION_NON_NUMERIC_COLUMN');
    expect(errors[0].name).toBe('Country');
  });

  it('reports wrong argument counts', () => {
    expect(validateAst(parseExpression('abs()'), columns)[0].code).toBe('EXPRESSION_INVALID_ARITY');
    expect(validateAst(parseExpression('pow(Age)'), columns)[0].code).toBe('EXPRESSION_INVALID_ARITY');
    expect(validateAst(parseExpression('clip(Age, 0)'), columns)[0].code).toBe('EXPRESSION_INVALID_ARITY');
    expect(validateAst(parseExpression('round(Age, 2)'), columns)).toEqual([]);
  });

  it('collects errors from nested calls', () => {
    const errors = validateAst(parseExpression('log(Foo) + sqrt(Country)'), columns);
    expect(errors.map((e) => e.code).sort()).toEqual([
      'EXPRESSION_NON_NUMERIC_COLUMN',
      'EXPRESSION_UNKNOWN_COLUMN',
    ]);
  });
});
