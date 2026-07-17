import { z } from 'zod';
import { createPaginatedResponseSchema } from "../response";
import { DatasetProfileSchema } from './dataset-profile.schema';
import { DatasetFormatSchema, DatasetStatusSchema } from './dataset.constants';
import { ValidationOptionsSchema } from './validation-option.schema';


export const CreateDatasetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  format: DatasetFormatSchema,
  validationOptions: ValidationOptionsSchema.optional(),
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
  status: DatasetStatusSchema,
  profile: DatasetProfileSchema.nullable(),
  validationError: z.string().nullable(),
  checksum: z.string(),
  version: z.number(),
  userId: z.string(),
});

export type CreateDataset = z.infer<typeof CreateDatasetSchema>;
export type UpdateDataset = z.infer<typeof UpdateDatasetSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;

export const PaginatedDatasetResponseSchema = createPaginatedResponseSchema(DatasetSchema);

export const UploadUrlResponseSchema = z.object({
  datasetId: z.string().uuid(),
  url: z.string().url(),
  objectKey: z.string(),
});

export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
