import { createZodDto } from 'nestjs-zod';
import {
  CreateBlockDefinitionSchema,
  UpdateBlockDefinitionSchema,
  BlockDefinitionSchema,
} from '@training-ml/contracts';

export class CreateBlockDefinitionDto extends createZodDto(CreateBlockDefinitionSchema) {}
export class UpdateBlockDefinitionDto extends createZodDto(UpdateBlockDefinitionSchema) {}
export class BlockDefinitionDto extends createZodDto(BlockDefinitionSchema) {}
