import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { resolvePath } from './_resolve-path';

export function exists(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const target = resolvePath(rule.target as string, ctx);
  if (target !== undefined && target !== null && target !== '') return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'REQUIRED_FIELD_MISSING',
      severity: rule.severity,
      message: rule.message || 'A required field is missing.',
      context: { target: rule.target },
    },
  ];
}
