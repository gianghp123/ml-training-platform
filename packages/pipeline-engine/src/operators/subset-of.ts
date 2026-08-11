import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { resolveItems, resolvePath } from './_resolve-path.js';

export function subsetOf(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const left = resolveItems(rule.left, ctx);

  const rightRaw = resolvePath(rule.right as string, ctx);
  let right: string[] = [];
  if (Array.isArray(rightRaw)) {
    right = rightRaw as string[];
  } else if (typeof rightRaw === 'string') {
    right = [rightRaw];
  }

  const missing = left.filter((item) => !right.includes(item));
  if (missing.length === 0) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'NOT_SUBSET',
      severity: rule.severity,
      message: rule.message || `Items not found in target set: ${missing.join(', ')}.`,
      context: { missing },
    },
  ];
}
