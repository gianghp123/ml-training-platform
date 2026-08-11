import {
  ConfigFieldType,
  FilterOp,
  PipelineArtifactType,
  type ValidationError,
} from '@training-ml/contracts';
import { DslParseError } from '../dsl/tokenizer.js';
import { parseExpression } from '../dsl/parser.js';
import { validateAst } from '../dsl/validate.js';
import type { NodeContext } from '../types.js';
import { getDatasetColumns } from '../utils/contract-helpers.js';

const NO_VALUE_OPS: string[] = [FilterOp.IS_NULL, FilterOp.IS_NOT_NULL];
const RANGE_OPS: string[] = [FilterOp.GT, FilterOp.GTE, FilterOp.LT, FilterOp.LTE];
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

    if (field.type === ConfigFieldType.CONDITION_LIST) {
      errors.push(...validateConditionList(ctx, field.id, field.ops as string[], value));
    }

    if (field.type === ConfigFieldType.EXPRESSION) {
      errors.push(...validateExpressionField(ctx, field.id, value, config));
    }
  }

  return errors;
}

function firstInputColumns(ctx: NodeContext) {
  const input = Object.values(ctx.inputContracts).find((c) => c.artifact === PipelineArtifactType.DATASET);
  return input ? getDatasetColumns(input) : [];
}

function validateConditionList(
  ctx: NodeContext,
  fieldId: string,
  allowedOps: string[],
  value: unknown,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const conditions = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  if (conditions.length === 0) {
    errors.push(buildConfigError(ctx, fieldId, 'EMPTY_CONDITIONS', 'At least one filter condition is required.'));
    return errors;
  }

  const columns = firstInputColumns(ctx);
  const known = columns.length > 0;

  conditions.forEach((cond, i) => {
    const label = `Condition ${i + 1}`;
    if (!cond || typeof cond !== 'object' || typeof cond.column !== 'string' || cond.column === '') {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_TYPE_MISMATCH', `${label}: "column" is required.`));
      return;
    }
    const column = columns.find((c) => c.name === cond.column);
    if (known && !column) {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_COLUMN_NOT_FOUND', `${label}: column "${cond.column}" does not exist in the input dataset.`));
      return;
    }
    if (typeof cond.op !== 'string' || !allowedOps.includes(cond.op)) {
      errors.push(buildConfigError(ctx, fieldId, 'INVALID_OPTION', `${label}: op must be one of ${allowedOps.join(', ')}.`));
      return;
    }
    if (!NO_VALUE_OPS.includes(cond.op) && (cond.value === undefined || cond.value === null || cond.value === '')) {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_MISSING', `${label}: a value is required for operator "${cond.op}".`));
      return;
    }
    if (cond.op === FilterOp.IN && cond.value !== undefined && !Array.isArray(cond.value)) {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_TYPE_MISMATCH', `${label}: operator "in" requires an array value.`));
      return;
    }
    if (known && column && RANGE_OPS.includes(cond.op) && column.primitive === 'string') {
      errors.push(buildConfigError(ctx, fieldId, 'CONDITION_VALUE_TYPE_MISMATCH', `${label}: operator "${cond.op}" cannot be used on string column "${column.name}".`));
    }
  });

  return errors;
}

function validateExpressionField(
  ctx: NodeContext,
  fieldId: string,
  value: unknown,
  config: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const columns = firstInputColumns(ctx);

  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(buildConfigError(ctx, fieldId, 'EXPRESSION_PARSE_ERROR', 'An expression is required.'));
  } else {
    try {
      const ast = parseExpression(value);
      if (columns.length > 0) {
        for (const err of validateAst(ast, columns)) {
          errors.push(buildConfigError(ctx, fieldId, err.code, err.message));
        }
      }
    } catch (e) {
      if (e instanceof DslParseError) {
        errors.push({
          ...buildConfigError(ctx, fieldId, 'EXPRESSION_PARSE_ERROR', e.message),
          context: { fieldId, position: e.position },
        });
      } else {
        throw e;
      }
    }
  }

  const outputName = config['outputColumn'];
  if (typeof outputName === 'string' && outputName !== '') {
    if (!IDENTIFIER_RE.test(outputName)) {
      errors.push(buildConfigError(ctx, 'outputColumn', 'EXPRESSION_OUTPUT_INVALID', `Output column "${outputName}" must be a valid identifier (letters, digits, underscores; not starting with a digit).`));
    } else if (columns.some((c) => c.name === outputName)) {
      errors.push(buildConfigError(ctx, 'outputColumn', 'EXPRESSION_OUTPUT_COLLISION', `Output column "${outputName}" already exists in the input dataset.`));
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
