import { z } from 'zod';
import { ValidationErrorSchema } from './validation-error.schema';
import { ContractSchema } from './contract.schema';

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  contracts: z.record(z.string(), z.record(z.string(), ContractSchema)),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;
