import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { resolvePath } from './_resolve-path.js';

export function rowCountMatches(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const targets = (rule.targets as string[]) ?? [];
  const rowCounts = targets
    .map((path) => {
      const contract = resolvePath(path, ctx);
      return contract && typeof contract === 'object' ? (contract as { rowCount?: number }).rowCount : undefined;
    })
    .filter((n): n is number => typeof n === 'number');

  if (rowCounts.length <= 1) return [];

  const first = rowCounts[0];
  if (rowCounts.every((count) => count === first)) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'ROW_COUNT_MISMATCH',
      severity: rule.severity,
      message: rule.message || 'Input datasets do not have matching row counts.',
      context: { rowCounts },
    },
  ];
}
