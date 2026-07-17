import { z } from 'zod';

export const ValidationScope = {
  PORT: 'port',
  CONFIG: 'config',
  CONSTRAINT: 'constraint',
  CONTRACT: 'contract',
} as const;

export const ValidationScopeSchema = z.enum(
  Object.values(ValidationScope) as [string, ...string[]],
);
export type ValidationScope = z.infer<typeof ValidationScopeSchema>;

export const ValidationSeverity = {
  ERROR: 'error',
  WARNING: 'warning',
} as const;

export const ValidationSeveritySchema = z.enum(
  Object.values(ValidationSeverity) as [string, ...string[]],
);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

export const ValidationErrorSchema = z.object({
  nodeId: z.string(),
  scope: ValidationScopeSchema,
  fieldId: z.string().optional(),
  code: z.string(),
  severity: ValidationSeveritySchema.optional(),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;
