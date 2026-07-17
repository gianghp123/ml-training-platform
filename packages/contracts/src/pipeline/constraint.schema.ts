import { z } from 'zod';
import { ValidationSeveritySchema } from './validation-error.schema';

export const ConstraintType = {
  REQUIRED: 'required',
  FORBIDDEN: 'forbidden',
} as const;

export const ConstraintTypeSchema = z.enum(
  Object.values(ConstraintType) as [string, ...string[]],
);
export type ConstraintType = z.infer<typeof ConstraintTypeSchema>;

export const ConstraintSchema = z.object({
  sourcePort: z.string(),
  targetPort: z.string(),
  type: ConstraintTypeSchema,
});

export type Constraint = z.infer<typeof ConstraintSchema>;

export const BaseConstraintRuleSchema = z.object({
  op: z.string(),
  message: z.string().optional(),
  severity: ValidationSeveritySchema.optional(),
  condition: z.record(z.string(), z.unknown()).optional(),
});

export const ConstraintRuleSchema = BaseConstraintRuleSchema.and(z.record(z.string(), z.unknown()));

export type ConstraintRule = z.infer<typeof ConstraintRuleSchema>;

export const ConstraintSetSchema = z.object({
  selectedColumns: z.record(z.string(), z.unknown()).optional(),
  rules: z.array(z.lazy(() => ConstraintRuleSchema)).optional(),
});

export type ConstraintSet = z.infer<typeof ConstraintSetSchema>;
