import { createZodDto } from 'nestjs-zod';
import {
  CreateBlockCategorySchema,
  UpdateBlockCategorySchema,
  BlockCategorySchema,
} from '@training-ml/contracts';

export class CreateBlockCategoryDto extends createZodDto(CreateBlockCategorySchema) {}
export class UpdateBlockCategoryDto extends createZodDto(UpdateBlockCategorySchema) {}
export class BlockCategoryDto extends createZodDto(BlockCategorySchema) {}
