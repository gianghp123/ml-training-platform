import {
  CreateDatasetSchema,
  DatasetSchema,
  PaginatedDatasetResponseSchema,
  UpdateDatasetSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateDatasetDto extends createZodDto(CreateDatasetSchema) { }
export class UpdateDatasetDto extends createZodDto(UpdateDatasetSchema) { }
export class DatasetDto extends createZodDto(DatasetSchema) { }
export class PaginatedDatasetResponseDto extends createZodDto(PaginatedDatasetResponseSchema) { }
