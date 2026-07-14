import { createZodDto } from 'nestjs-zod';
import {
  CreateModelRegistrySchema,
  UpdateModelRegistrySchema,
  ModelRegistrySchema,
  PaginatedModelRegistryResponseSchema,
} from '@training-ml/contracts';

export class CreateModelRegistryDto extends createZodDto(CreateModelRegistrySchema.meta({ id: 'CreateModelRegistry' }), { codec: true }) {}
export class UpdateModelRegistryDto extends createZodDto(UpdateModelRegistrySchema.meta({ id: 'UpdateModelRegistry' }), { codec: true }) {}
export class ModelRegistryDto extends createZodDto(ModelRegistrySchema.meta({ id: 'ModelRegistry' }), { codec: true }) {}
export class PaginatedModelRegistryResponseDto extends createZodDto(PaginatedModelRegistryResponseSchema.meta({ id: 'PaginatedModelRegistryResponse' }), { codec: true }) {}
