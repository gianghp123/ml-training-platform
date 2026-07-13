import {
  CreateNodeExecutionSchema,
  NodeExecutionSchema,
  PaginatedNodeExecutionResponseSchema,
  UpdateNodeExecutionSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateNodeExecutionDto extends createZodDto(CreateNodeExecutionSchema) { }
export class UpdateNodeExecutionDto extends createZodDto(UpdateNodeExecutionSchema) { }
export class NodeExecutionDto extends createZodDto(NodeExecutionSchema) { }
export class PaginatedNodeExecutionResponseDto extends createZodDto(PaginatedNodeExecutionResponseSchema) { }
