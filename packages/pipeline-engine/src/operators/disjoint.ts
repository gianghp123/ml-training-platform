import type { ConstraintRule, Contract, ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { getDatasetColumns } from '../utils/contract-helpers.js';
import { resolveItems, resolvePath } from './_resolve-path.js';

export function disjoint(rule: ConstraintRule, ctx: NodeContext): ValidationError[] {
  const excluded = new Set(rule.exclude !== undefined ? resolveItems(rule.exclude, ctx) : []);

  const namesOf = (value: unknown): string[] => {
    if (!value || typeof value !== 'object') return [];
    return getDatasetColumns(value as Contract)
      .map((c) => c.name)
      .filter((name) => !excluded.has(name));
  };

  let sets: string[][];
  if (Array.isArray(rule.targets)) {
    sets = rule.targets
      .map((p) => resolvePath(String(p), ctx))
      .filter((v) => v !== undefined && v !== null)
      .map(namesOf);
  } else {
    sets = [namesOf(resolvePath(rule.left as string, ctx)), namesOf(resolvePath(rule.right as string, ctx))];
  }

  const counts = new Map<string, number>();
  for (const names of sets) {
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const overlap = [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);

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
