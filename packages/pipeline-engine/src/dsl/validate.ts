import type { Column } from '@training-ml/contracts';
import { FUNCTION_ARITY, type DslNode } from './ast.js';

export interface DslSemanticError {
  code: 'EXPRESSION_UNKNOWN_COLUMN' | 'EXPRESSION_NON_NUMERIC_COLUMN' | 'EXPRESSION_INVALID_ARITY';
  message: string;
  name?: string;
}

export function validateAst(node: DslNode, columns: Column[]): DslSemanticError[] {
  const errors: DslSemanticError[] = [];
  const byName = new Map(columns.map((c) => [c.name, c]));

  const visit = (n: DslNode): void => {
    switch (n.kind) {
      case 'number':
        return;
      case 'column': {
        const col = byName.get(n.name);
        if (!col) {
          errors.push({
            code: 'EXPRESSION_UNKNOWN_COLUMN',
            name: n.name,
            message: `Column "${n.name}" does not exist in the input dataset.`,
          });
        } else if (col.semantic !== 'numeric') {
          errors.push({
            code: 'EXPRESSION_NON_NUMERIC_COLUMN',
            name: n.name,
            message: `Column "${n.name}" is not numeric; formulas can only reference numeric columns.`,
          });
        }
        return;
      }
      case 'unary':
        visit(n.operand);
        return;
      case 'binary':
      case 'compare':
        visit(n.left);
        visit(n.right);
        return;
      case 'call': {
        const arity = FUNCTION_ARITY[n.fn];
        if (n.args.length < arity.min || n.args.length > arity.max) {
          const expected = arity.min === arity.max ? String(arity.min) : `${arity.min}-${arity.max}`;
          errors.push({
            code: 'EXPRESSION_INVALID_ARITY',
            name: n.fn,
            message: `Function "${n.fn}" expects ${expected} argument(s), got ${n.args.length}.`,
          });
        }
        n.args.forEach(visit);
        return;
      }
    }
  };

  visit(node);
  return errors;
}
