import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { getDatasetColumns, isDatasetContract } from '../utils/contract-helpers.js';
import { resolveItems, resolvePath } from './_resolve-path.js';

export function columnsExist(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const names = resolveItems(rule.columns, ctx);
  if (names.length === 0) return [];

  const missing: Record<string, string[]> = {};
  for (const path of (rule.inputs as string[]) ?? []) {
    const value = resolvePath(String(path), ctx);
    if (!value || typeof value !== 'object' || !isDatasetContract(value as Contract)) continue;
    const columns = getDatasetColumns(value as Contract);
    if (columns.length === 0) continue;
    const portId = String(path).split('.')[1] ?? String(path);
    const absent = names.filter((n) => !columns.some((c) => c.name === n));
    if (absent.length > 0) missing[portId] = absent;
  }

  if (Object.keys(missing).length === 0) return [];

  return [
    {
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'KEYS_NOT_FOUND',
      severity: rule.severity,
      message:
        rule.message ||
        `Columns not found in all inputs: ${Object.entries(missing)
          .map(([port, cols]) => `${port}: [${cols.join(', ')}]`)
          .join('; ')}.`,
      context: { missing },
    },
  ];
}
