import {
  CreateWorkflowVersionSchema,
  PaginatedWorkflowVersionResponseSchema,
  UpdateWorkflowVersionSchema,
  WorkflowVersionSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkflowVersionDto extends createZodDto(CreateWorkflowVersionSchema.meta({ id: 'CreateWorkflowVersion' }), { codec: true }) { }
export class UpdateWorkflowVersionDto extends createZodDto(UpdateWorkflowVersionSchema.meta({ id: 'UpdateWorkflowVersion' }), { codec: true }) { }
export class WorkflowVersionDto extends createZodDto(WorkflowVersionSchema.meta({ id: 'WorkflowVersion' }), { codec: true }) { }
export class PaginatedWorkflowVersionResponseDto extends createZodDto(PaginatedWorkflowVersionResponseSchema.meta({ id: 'PaginatedWorkflowVersionResponse' }), { codec: true }) { }
