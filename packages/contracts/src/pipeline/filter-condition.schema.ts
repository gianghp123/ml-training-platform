import { z } from 'zod';

export const FilterOp = {
  EQ: 'eq',
  NE: 'ne',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  CONTAINS: 'contains',
  IS_NULL: 'isNull',
  IS_NOT_NULL: 'isNotNull',
  IN: 'in',
} as const;

export const FilterOpSchema = z.enum(
  Object.values(FilterOp) as [string, ...string[]],
);
export type FilterOp = z.infer<typeof FilterOpSchema>;

export const FilterConditionSchema = z.object({
  column: z.string().min(1),
  op: FilterOpSchema,
  value: z
    .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
    .optional(),
});
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
