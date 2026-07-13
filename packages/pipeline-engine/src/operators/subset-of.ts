import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { getDatasetColumns } from '../utils/contract-helpers';
import { resolvePath } from './_resolve-path';

export function subsetOf(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const leftRaw = resolvePath(rule.left as string, ctx);
  const rightRaw = resolvePath(rule.right as string, ctx);

  let left: string[] = [];
  let right: string[] = [];

  if (Array.isArray(leftRaw)) {
    left = leftRaw as string[];
  } else if (typeof leftRaw === 'string') {
    left = [leftRaw];
  }

  if (Array.isArray(rightRaw)) {
    right = rightRaw as string[];
  } else if (rightRaw && typeof rightRaw === 'object' && 'artifact' in rightRaw) {
    right = getDatasetColumns(rightRaw as Contract).map((c) => c.name);
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
