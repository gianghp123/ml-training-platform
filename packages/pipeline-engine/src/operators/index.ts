import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { evaluateCondition } from './_condition.js';
import { disjoint } from './disjoint.js';
import { eq } from './eq.js';
import { exists } from './exists.js';
import { lte } from './lte.js';
import { rowCountMatches } from './row-count-matches.js';
import { semantic } from './semantic.js';
import { columnsExist } from './columns-exist.js';
import { subsetOf } from './subset-of.js';

export type OperatorFn = (rule: ConstraintRule, ctx: NodeContext) => ValidationError[];

export const operators: Record<string, OperatorFn> = {
  exists,
  semantic,
  eq,
  lte,
  disjoint,
  subsetOf,
  rowCountMatches,
  columnsExist,
};

export function evaluateRule(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const op = operators[rule.op];
  if (!op) {
    return [
      {
        nodeId: ctx.node.id,
        scope: 'constraint',
        code: 'UNKNOWN_OPERATOR',
        severity: 'error',
        message: `Unknown constraint operator: ${rule.op}`,
        context: { op: rule.op },
      },
    ];
  }
  if (!evaluateCondition(rule, ctx)) {
    return [];
  }
  return op(rule, ctx);
}
