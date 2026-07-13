import { ConfigFieldType, type ValidationError } from '@training-ml/contracts';
import type { NodeContext } from '../types';

export function validateConfig(ctx: NodeContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = ctx.node.config;

  for (const field of ctx.definition.configSchema.fields) {
    const value = config[field.id];

    if (field.type === ConfigFieldType.NUMBER) {
      if (value !== undefined && value !== null) {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors.push(buildConfigError(ctx, field.id, 'VALUE_NOT_NUMBER', `Field "${field.id}" must be a number.`));
        } else if (field.min !== undefined && num < field.min) {
          errors.push(buildConfigError(ctx, field.id, 'VALUE_BELOW_MIN', `Field "${field.id}" must be at least ${field.min}.`));
        } else if (field.max !== undefined && num > field.max) {
          errors.push(buildConfigError(ctx, field.id, 'VALUE_ABOVE_MAX', `Field "${field.id}" must be at most ${field.max}.`));
        }
      }
    }

    if (field.type === ConfigFieldType.SELECT) {
      if (value !== undefined && value !== null && !field.options.includes(String(value))) {
        errors.push(buildConfigError(ctx, field.id, 'INVALID_OPTION', `Field "${field.id}" must be one of ${field.options.join(', ')}.`));
      }
    }
  }

  return errors;
}

function buildConfigError(
  ctx: NodeContext,
  fieldId: string,
  code: string,
  message: string,
): ValidationError {
  return {
    nodeId: ctx.node.id,
    scope: 'config',
    fieldId,
    code,
    severity: 'error',
    message,
    context: { fieldId },
  };
}
