import { z } from 'zod';
import { UuidSchema } from '../shared';

export enum ArtifactType {
  MODEL = 'model',
  DATASET = 'dataset',
  LOG = 'log',
  METRIC = 'metric',
  CHECKPOINT = 'checkpoint',
}

export const CreateArtifactSchema = z.object({
  workflowRunId: UuidSchema,
  nodeExecutionId: UuidSchema,
  name: z.string().min(1),
  artifactType: z.nativeEnum(ArtifactType),
  mimeType: z.string().min(1),
  storageUri: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateArtifactSchema = CreateArtifactSchema.partial();

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string(),
  nodeExecutionId: z.string(),
  name: z.string(),
  artifactType: z.nativeEnum(ArtifactType),
  mimeType: z.string(),
  storageUri: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type CreateArtifact = z.infer<typeof CreateArtifactSchema>;
export type UpdateArtifact = z.infer<typeof UpdateArtifactSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
