import type { ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types.js';
import { evaluateRule } from '../operators/index.js';

export function validateConstraints(ctx: NodeContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const constraints = ctx.definition.constraints;

  if (constraints.rules) {
    for (const rule of constraints.rules) {
      errors.push(...evaluateRule(rule, ctx));
    }
  }

  return errors;
}
