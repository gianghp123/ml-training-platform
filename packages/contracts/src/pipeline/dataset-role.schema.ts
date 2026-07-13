import { z } from 'zod';

export const DatasetRole = {
  FULL: 'full',
  TRAIN: 'train',
  TEST: 'test',
} as const;

export const DatasetRoleSchema = z.enum(
  Object.values(DatasetRole) as [string, ...string[]],
);
export type DatasetRole = z.infer<typeof DatasetRoleSchema>;
