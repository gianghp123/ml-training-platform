import { createZodDto } from 'nestjs-zod';
import {
  CreateDatasetSchema,
  UpdateDatasetSchema,
  DatasetSchema,
} from '@training-ml/contracts';

export class CreateDatasetDto extends createZodDto(CreateDatasetSchema) {}
export class UpdateDatasetDto extends createZodDto(UpdateDatasetSchema) {}
export class DatasetDto extends createZodDto(DatasetSchema) {}
