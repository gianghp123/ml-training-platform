import type { ConstraintRule } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { resolvePath } from './_resolve-path';

type Condition = { field?: string; equals?: unknown; in?: unknown[] };

export function evaluateCondition(rule: ConstraintRule, ctx: NodeContext): boolean {
  const condition = rule.condition as Condition | undefined;
  if (!condition || typeof condition.field !== 'string') return true;

  const path = condition.field.startsWith('$') ? condition.field : `$config.${condition.field}`;
  const value = resolvePath(path, ctx);

  if (condition.equals !== undefined && value !== condition.equals) {
    return false;
  }

  if (Array.isArray(condition.in) && !condition.in.includes(value)) {
    return false;
  }

  return true;
}
