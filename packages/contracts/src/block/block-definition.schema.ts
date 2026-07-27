import { z } from 'zod';
import { PipelineArtifactTypeSchema } from '../pipeline/artifact.schema';
import { ConfigFieldSchema } from '../pipeline/config-field.schema';
import { ConstraintSetSchema } from '../pipeline/constraint.schema';

export const BlockStatus = {
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  RETIRED: 'retired',
} as const;

export const BlockStatusSchema = z.enum(
  Object.values(BlockStatus) as [string, ...string[]],
);
export type BlockStatus = z.infer<typeof BlockStatusSchema>;

export const PortSchema = z.object({
  id: z.string(),
  artifact: PipelineArtifactTypeSchema,
  optional: z.boolean().optional(),
});

export type Port = z.infer<typeof PortSchema>;

export const ConfigSchemaSchema = z.object({
  fields: z.array(ConfigFieldSchema),
});

export type ConfigSchema = z.infer<typeof ConfigSchemaSchema>;

const OutputTransformBodySchema: z.ZodType<unknown> = z.union([
  z.object({
    copyInput: z.literal(true),
    columnUpdates: z
      .array(
        z.object({
          columns: z.union([z.array(z.string()), z.string()]),
          primitive: z.string().optional(),
          semantic: z.string().optional(),
          nullable: z.boolean().optional(),
        }),
      )
      .optional(),
    addColumns: z
      .array(z.object({ name: z.string(), primitive: z.string() }))
      .optional(),
    set: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    keepColumns: z.union([z.array(z.string()), z.string()]),
  }),
  z.object({
    renameColumns: z.union([z.record(z.string(), z.string()), z.string()]),
  }),
  z.object({
    concatColumns: z.union([z.array(z.string()), z.string()]),
  }),
  z.object({
    joinColumns: z.object({
      left: z.string(),
      right: z.string(),
      keys: z.string(),
    }),
  }),
  z.object({
    ports: z.record(z.string(), z.lazy(() => OutputTransformSchema)),
  }),
  z.object({
    artifact: PipelineArtifactTypeSchema,
    algorithm: z.string().optional(),
    task: z.string().optional(),
    featureSchema: z.unknown().optional(),
    targetSchema: z.unknown().optional(),
    format: z.string().optional(),
    sourceModel: z.record(z.string(), z.unknown()).optional(),
    location: z.record(z.string(), z.unknown()).optional(),
    metrics: z.unknown().optional(),
    schema: z.unknown().optional(),
    role: z.string().optional(),
  }),
]);

export const OutputTransformSchema: z.ZodType<unknown> = z.union([
  OutputTransformBodySchema,
  z.object({
    declared: OutputTransformBodySchema,
    confirmProvider: z.literal('backend').optional(),
  }),
]);

export type OutputTransform = z.infer<typeof OutputTransformSchema>;

export const BlockDefinitionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  status: BlockStatusSchema,
  executorKey: z.string().min(1),

  name: z.string(),
  categoryId: z.string(),

  ports: z.object({
    inputs: z.array(PortSchema),
    outputs: z.array(PortSchema),
  }),

  configSchema: ConfigSchemaSchema,

  constraints: ConstraintSetSchema,

  outputTransform: OutputTransformSchema,
});

export type BlockDefinition = z.infer<typeof BlockDefinitionSchema>;

export const CreateBlockDefinitionSchema = BlockDefinitionSchema;
export const UpdateBlockDefinitionSchema = BlockDefinitionSchema.partial();

export type CreateBlockDefinition = z.infer<typeof CreateBlockDefinitionSchema>;
export type UpdateBlockDefinition = z.infer<typeof UpdateBlockDefinitionSchema>;

import { createPaginatedResponseSchema } from "../response";
export const PaginatedBlockDefinitionResponseSchema = createPaginatedResponseSchema(BlockDefinitionSchema);
