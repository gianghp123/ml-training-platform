import { z } from 'zod';

export const MlTask = {
  CLASSIFICATION: 'classification',
  REGRESSION: 'regression',
  CLUSTERING: 'clustering',
} as const;

export const MlTaskSchema = z.enum(Object.values(MlTask) as [string, ...string[]]);
export type MlTask = z.infer<typeof MlTaskSchema>;
