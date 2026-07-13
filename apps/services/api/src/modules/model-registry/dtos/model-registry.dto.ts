import { createZodDto } from 'nestjs-zod';
import {
  CreateModelRegistrySchema,
  UpdateModelRegistrySchema,
  ModelRegistrySchema,
} from '@training-ml/contracts';

export class CreateModelRegistryDto extends createZodDto(CreateModelRegistrySchema) {}
export class UpdateModelRegistryDto extends createZodDto(UpdateModelRegistrySchema) {}
export class ModelRegistryDto extends createZodDto(ModelRegistrySchema) {}
