import { z } from 'zod';
import { ColumnSchema } from '../dataset/column.schema';
import { PipelineArtifactType } from './artifact.schema';
import { DatasetRoleSchema } from './dataset-role.schema';
import { MlTaskSchema } from './ml-task.schema';


export const UnknownColumnSetSchema = z.literal('unknown');

export const DatasetContractSchema = z.object({
  artifact: z.literal(PipelineArtifactType.DATASET),
  schema: z.object({
    columns: z.union([z.array(ColumnSchema), UnknownColumnSetSchema]),
    target: z.string().nullable(),
  }),
  role: DatasetRoleSchema,
  task: MlTaskSchema.nullable(),
});

export const ModelContractSchema = z.object({
  artifact: z.literal(PipelineArtifactType.MODEL),
  algorithm: z.string(),
  task: MlTaskSchema,
  featureSchema: z.union([z.array(ColumnSchema), UnknownColumnSetSchema]),
  targetSchema: z.string().nullable(),
});

export const MetricsContractSchema = z.object({
  artifact: z.literal(PipelineArtifactType.METRICS),
  task: MlTaskSchema,
  metrics: z.union([z.record(z.string(), z.number()), UnknownColumnSetSchema]),
});

export const SavedModelContractSchema = z.object({
  artifact: z.literal(PipelineArtifactType.SAVED_MODEL),
  format: z.string(),
  sourceModel: z.object({
    algorithm: z.string(),
    task: MlTaskSchema,
  }),
  location: z.object({
    type: z.literal('objectStorage'),
    reference: z.string(),
  }),
});

export const ContractSchema = z.discriminatedUnion('artifact', [
  DatasetContractSchema,
  ModelContractSchema,
  MetricsContractSchema,
  SavedModelContractSchema,
]);

export type Contract = z.infer<typeof ContractSchema>;
export type DatasetContract = z.infer<typeof DatasetContractSchema>;
export type ModelContract = z.infer<typeof ModelContractSchema>;
export type MetricsContract = z.infer<typeof MetricsContractSchema>;
export type SavedModelContract = z.infer<typeof SavedModelContractSchema>;
