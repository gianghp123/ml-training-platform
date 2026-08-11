import type { ConstraintRule, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { getColumnByName } from '../utils/contract-helpers.js';
import { resolvePath } from './_resolve-path.js';

export function semantic(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const target = resolvePath(rule.target as string, ctx);
  const expected = (rule.expected as string[]) ?? [];
  const contract = Object.values(ctx.inputContracts)[0];

  if (!contract) return [];

  const columnNames = Array.isArray(target) ? (target as string[]) : typeof target === 'string' ? [target] : [];
  const errors: ValidationError[] = [];

  for (const columnName of columnNames) {
    const column = getColumnByName(contract, columnName);
    if (!column) {
      errors.push({
        nodeId: ctx.node.id,
        scope: 'constraint',
        fieldId: rule.fieldId as string | undefined,
        code: 'COLUMN_NOT_FOUND',
        severity: rule.severity,
        message: `Column "${columnName}" not found in input schema.`,
        context: { column: columnName },
      });
      continue;
    }

    if (expected.includes(column.semantic ?? '')) continue;

    errors.push({
      nodeId: ctx.node.id,
      scope: 'constraint',
      fieldId: rule.fieldId as string | undefined,
      code: 'SEMANTIC_MISMATCH',
      severity: rule.severity,
      message: `Column "${columnName}" is ${column.semantic ?? 'unknown'}, but expected one of: ${expected.join(', ')}.`,
      context: { column: columnName, expected, actual: column.semantic },
    });
  }

  return errors;
}
