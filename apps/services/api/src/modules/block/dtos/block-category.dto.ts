import {
  BlockCategorySchema,
  CreateBlockCategorySchema,
  PaginatedBlockCategoryResponseSchema,
  UpdateBlockCategorySchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateBlockCategoryDto extends createZodDto(CreateBlockCategorySchema) { }
export class UpdateBlockCategoryDto extends createZodDto(UpdateBlockCategorySchema) { }
export class BlockCategoryDto extends createZodDto(BlockCategorySchema) { }
export class PaginatedBlockCategoryResponseDto extends createZodDto(PaginatedBlockCategoryResponseSchema) { }
