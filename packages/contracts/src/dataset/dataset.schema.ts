import { z } from 'zod';

export const DatasetFormat = {
  CSV: 'csv',
  JSON: 'json',
  PARQUET: 'parquet',
  AVRO: 'avro',
} as const;

export const DatasetFormatSchema = z.enum(
  Object.values(DatasetFormat) as [string, ...string[]],
);

export type DatasetFormat = z.infer<typeof DatasetFormatSchema>;

export const CreateDatasetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  storageUri: z.string().min(1),
  format: DatasetFormatSchema,
  size: z.number(),
  checksum: z.string().optional(),
  version: z.number().optional(),
  userId: z.string().min(1),
});

export const UpdateDatasetSchema = CreateDatasetSchema.partial();

export const DatasetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  storageUri: z.string(),
  format: DatasetFormatSchema,
  size: z.number(),
  checksum: z.string(),
  version: z.number(),
  userId: z.string(),
});

export type CreateDataset = z.infer<typeof CreateDatasetSchema>;
export type UpdateDataset = z.infer<typeof UpdateDatasetSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
