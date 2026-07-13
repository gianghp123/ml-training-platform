import { z } from 'zod';
import { UuidSchema } from '../shared';

export const CreateModelRegistrySchema = z.object({
  artifactId: UuidSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  userId: z.string().min(1),
});

export const UpdateModelRegistrySchema = CreateModelRegistrySchema.partial();

export const ModelRegistrySchema = z.object({
  id: z.string().uuid(),
  artifactId: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  userId: z.string(),
});

export type CreateModelRegistry = z.infer<typeof CreateModelRegistrySchema>;
export type UpdateModelRegistry = z.infer<typeof UpdateModelRegistrySchema>;
export type ModelRegistry = z.infer<typeof ModelRegistrySchema>;
