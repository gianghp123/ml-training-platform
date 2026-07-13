import { createZodDto } from 'nestjs-zod';
import {
  CreateNodeExecutionSchema,
  UpdateNodeExecutionSchema,
  NodeExecutionSchema,
} from '@training-ml/contracts';

export class CreateNodeExecutionDto extends createZodDto(CreateNodeExecutionSchema) {}
export class UpdateNodeExecutionDto extends createZodDto(UpdateNodeExecutionSchema) {}
export class NodeExecutionDto extends createZodDto(NodeExecutionSchema) {}
