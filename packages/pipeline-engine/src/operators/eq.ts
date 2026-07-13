import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { resolvePath } from './_resolve-path';

export function eq(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const left = resolvePath(rule.left as string, ctx);
  const right = rule.right;

  const rightValues = Array.isArray(right) ? right : [right];
  const matches = rightValues.some((r) => JSON.stringify(left) === JSON.stringify(r));
  const negate = rule.negate === true;

  if (negate ? !matches : matches) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: negate ? 'VALUE_NOT_ALLOWED' : 'VALUE_MISMATCH',
      severity: rule.severity,
      message: rule.message || `Expected ${JSON.stringify(left)} to ${negate ? 'not be' : 'be'} one of ${JSON.stringify(rightValues)}.`,
      context: { left, right: rightValues },
    },
  ];
}
