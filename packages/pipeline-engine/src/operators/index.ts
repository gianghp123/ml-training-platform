import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { evaluateCondition } from './_condition';
import { disjoint } from './disjoint';
import { eq } from './eq';
import { exists } from './exists';
import { lte } from './lte';
import { rowCountMatches } from './row-count-matches';
import { semantic } from './semantic';
import { subsetOf } from './subset-of';

export type OperatorFn = (rule: ConstraintRule, ctx: NodeContext) => ValidationError[];

export const operators: Record<string, OperatorFn> = {
  exists,
  semantic,
  eq,
  lte,
  disjoint,
  subsetOf,
  rowCountMatches,
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
