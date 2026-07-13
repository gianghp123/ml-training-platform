import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';
import { getDatasetColumns } from '../utils/contract-helpers';
import { resolvePath } from './_resolve-path';

export function disjoint(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const leftContract = resolvePath(rule.left as string, ctx);
  const rightContract = resolvePath(rule.right as string, ctx);

  if (!leftContract || !rightContract || typeof leftContract !== 'object' || typeof rightContract !== 'object') {
    return [];
  }

  const leftNames = getDatasetColumns(leftContract as Contract).map((c) => c.name);
  const rightNames = getDatasetColumns(rightContract as Contract).map((c) => c.name);
  const overlap = leftNames.filter((name) => rightNames.includes(name));

  if (overlap.length === 0) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'COLUMNS_NOT_DISJOINT',
      severity: rule.severity,
      message: rule.message || `Column names overlap: ${overlap.join(', ')}.`,
      context: { overlap },
    },
  ];
}
