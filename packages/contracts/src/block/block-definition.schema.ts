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
});

export type Port = z.infer<typeof PortSchema>;

export const ConfigSchemaSchema = z.object({
  fields: z.array(ConfigFieldSchema),
});

export type ConfigSchema = z.infer<typeof ConfigSchemaSchema>;

export const OutputTransformSchema: z.ZodType<unknown> = z.union([
  z.object({
    copyInput: z.literal(true),
    columnUpdates: z
      .array(
        z.object({
          columns: z.array(z.string()),
          primitive: z.string().optional(),
          semantic: z.string().optional(),
          nullable: z.boolean().optional(),
        }),
      )
      .optional(),
    set: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    keepColumns: z.array(z.string()),
  }),
  z.object({
    renameColumns: z.record(z.string(), z.string()),
  }),
  z.object({
    concatColumns: z.array(z.string()),
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
  }),
]);

export type OutputTransform = z.infer<typeof OutputTransformSchema>;

export const BlockDefinitionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  status: BlockStatusSchema,

  metadata: z.object({
    name: z.string(),
    category: z.string(),
  }),

  ports: z.object({
    inputs: z.array(PortSchema),
    outputs: z.array(PortSchema),
  }),

  configSchema: ConfigSchemaSchema,

  constraints: ConstraintSetSchema,

  outputTransform: OutputTransformSchema,
});

export type BlockDefinition = z.infer<typeof BlockDefinitionSchema>;
