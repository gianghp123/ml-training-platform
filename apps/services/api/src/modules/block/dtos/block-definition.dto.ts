import {
  BlockDefinitionSchema,
  CreateBlockDefinitionSchema,
  PaginatedBlockDefinitionResponseSchema,
  UpdateBlockDefinitionSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateBlockDefinitionDto extends createZodDto(CreateBlockDefinitionSchema) { }
export class UpdateBlockDefinitionDto extends createZodDto(UpdateBlockDefinitionSchema) { }
export class BlockDefinitionDto extends createZodDto(BlockDefinitionSchema) { }
export class PaginatedBlockDefinitionResponseDto extends createZodDto(PaginatedBlockDefinitionResponseSchema) { }
