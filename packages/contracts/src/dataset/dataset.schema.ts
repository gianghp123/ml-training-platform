import { z } from 'zod';

export enum DatasetFormat {
  CSV = 'csv',
  JSON = 'json',
  PARQUET = 'parquet',
  AVRO = 'avro',
}

export const CreateDatasetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  storageUri: z.string().min(1),
  format: z.nativeEnum(DatasetFormat),
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
  format: z.nativeEnum(DatasetFormat),
  size: z.number(),
  checksum: z.string(),
  version: z.number(),
  userId: z.string(),
});

export type CreateDataset = z.infer<typeof CreateDatasetSchema>;
export type UpdateDataset = z.infer<typeof UpdateDatasetSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
