import { z } from 'zod';

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
