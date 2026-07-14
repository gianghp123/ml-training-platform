import {
  CreateNodeExecutionSchema,
  NodeExecutionSchema,
  PaginatedNodeExecutionResponseSchema,
  UpdateNodeExecutionSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateNodeExecutionDto extends createZodDto(CreateNodeExecutionSchema.meta({ id: 'CreateNodeExecution' }), { codec: true }) { }
export class UpdateNodeExecutionDto extends createZodDto(UpdateNodeExecutionSchema.meta({ id: 'UpdateNodeExecution' }), { codec: true }) { }
export class NodeExecutionDto extends createZodDto(NodeExecutionSchema.meta({ id: 'NodeExecution' }), { codec: true }) { }
export class PaginatedNodeExecutionResponseDto extends createZodDto(PaginatedNodeExecutionResponseSchema.meta({ id: 'PaginatedNodeExecutionResponse' }), { codec: true }) { }
