import { z } from 'zod';
import { UuidSchema } from '../shared';

export const CreateBlockDefinitionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  categoryId: UuidSchema,
  description: z.string().optional(),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
  dockerImage: z.string().optional(),
  version: z.string().optional(),
});

export const UpdateBlockDefinitionSchema = CreateBlockDefinitionSchema.partial();

export const BlockDefinitionSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  categoryId: z.string(),
  description: z.string(),
  configSchema: z.record(z.string(), z.unknown()),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  dockerImage: z.string(),
  version: z.string(),
});

export type CreateBlockDefinition = z.infer<typeof CreateBlockDefinitionSchema>;
export type UpdateBlockDefinition = z.infer<typeof UpdateBlockDefinitionSchema>;
export type BlockDefinition = z.infer<typeof BlockDefinitionSchema>;
