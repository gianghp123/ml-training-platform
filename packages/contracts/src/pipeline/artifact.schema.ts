import { z } from 'zod';

export const PipelineArtifactType = {
  DATASET: 'Dataset',
  MODEL: 'Model',
  METRICS: 'Metrics',
  SAVED_MODEL: 'SavedModel',
} as const;

export const PipelineArtifactTypeSchema = z.enum(
  Object.values(PipelineArtifactType) as [string, ...string[]],
);
export type PipelineArtifactType = z.infer<typeof PipelineArtifactTypeSchema>;
