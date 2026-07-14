import {
  BlockCategorySchema,
  CreateBlockCategorySchema,
  PaginatedBlockCategoryResponseSchema,
  UpdateBlockCategorySchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateBlockCategoryDto extends createZodDto(CreateBlockCategorySchema.meta({ id: 'CreateBlockCategory' }), { codec: true }) { }
export class UpdateBlockCategoryDto extends createZodDto(UpdateBlockCategorySchema.meta({ id: 'UpdateBlockCategory' }), { codec: true }) { }
export class BlockCategoryDto extends createZodDto(BlockCategorySchema.meta({ id: 'BlockCategory' }), { codec: true }) { }
export class PaginatedBlockCategoryResponseDto extends createZodDto(PaginatedBlockCategoryResponseSchema.meta({ id: 'PaginatedBlockCategoryResponse' }), { codec: true }) { }
