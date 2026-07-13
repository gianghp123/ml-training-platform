import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { getDatasetColumns } from '../utils/contract-helpers';
import { resolvePath } from './_resolve-path';

export function lte(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const leftRaw = resolvePath(rule.left as string, ctx);
  const rightRaw = rule.right;

  let left = Number(leftRaw);
  let right: number;

  if (typeof rightRaw === 'object' && rightRaw !== null && 'count' in rightRaw) {
    const countRule = rightRaw as { count: string; where?: Record<string, unknown> };
    const contract = resolvePath(countRule.count, ctx);
    if (!contract || typeof contract !== 'object') {
      right = 0;
    } else {
      const columns = getDatasetColumns(contract as Contract);
      const where = countRule.where ?? {};
      right = columns.filter((col) =>
        Object.entries(where).every(([key, val]) => (col as Record<string, unknown>)[key] === val),
      ).length;
    }
  } else {
    right = Number(rightRaw);
  }

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return [
      {
        nodeId: ctx.node.id,
        scope: 'constraint',
        fieldId: rule.fieldId as string | undefined,
        code: 'INVALID_COMPARISON',
        severity: rule.severity,
        message: rule.message || 'Cannot compare non-numeric values.',
        context: { left: leftRaw, right: rightRaw },
      },
    ];
  }

  if (left <= right) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'VALUE_TOO_LARGE',
      severity: rule.severity,
      message: rule.message || `Expected ${left} to be <= ${right}.`,
      context: { left, right },
    },
  ];
}
