import {
  CreateDatasetSchema,
  DatasetSchema,
  PaginatedDatasetResponseSchema,
  UpdateDatasetSchema,
  UploadUrlResponseSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateDatasetDto extends createZodDto(CreateDatasetSchema.meta({ id: 'CreateDataset' }), { codec: true }) { }
export class UpdateDatasetDto extends createZodDto(UpdateDatasetSchema.meta({ id: 'UpdateDataset' }), { codec: true }) { }
export class DatasetDto extends createZodDto(DatasetSchema.meta({ id: 'Dataset' }), { codec: true }) { }
export class PaginatedDatasetResponseDto extends createZodDto(PaginatedDatasetResponseSchema.meta({ id: 'PaginatedDatasetResponse' }), { codec: true }) { }
export class UploadUrlResponseDto extends createZodDto(UploadUrlResponseSchema.meta({ id: 'UploadUrlResponse' }), { codec: true }) { }
