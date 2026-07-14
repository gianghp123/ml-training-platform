import {
  BlockDefinitionSchema,
  CreateBlockDefinitionSchema,
  PaginatedBlockDefinitionResponseSchema,
  UpdateBlockDefinitionSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateBlockDefinitionDto extends createZodDto(CreateBlockDefinitionSchema.meta({ id: 'CreateBlockDefinition' }), { codec: true }) { }
export class UpdateBlockDefinitionDto extends createZodDto(UpdateBlockDefinitionSchema.meta({ id: 'UpdateBlockDefinition' }), { codec: true }) { }
export class BlockDefinitionDto extends createZodDto(BlockDefinitionSchema.meta({ id: 'BlockDefinition' }), { codec: true }) { }
export class PaginatedBlockDefinitionResponseDto extends createZodDto(PaginatedBlockDefinitionResponseSchema.meta({ id: 'PaginatedBlockDefinitionResponse' }), { codec: true }) { }
