import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkflowVersionSchema,
  UpdateWorkflowVersionSchema,
  WorkflowVersionSchema,
  PaginatedWorkflowVersionResponseSchema,
} from '@training-ml/contracts';

export class CreateWorkflowVersionDto extends createZodDto(CreateWorkflowVersionSchema) {}
export class UpdateWorkflowVersionDto extends createZodDto(UpdateWorkflowVersionSchema) {}
export class WorkflowVersionDto extends createZodDto(WorkflowVersionSchema) {}
export class PaginatedWorkflowVersionResponseDto extends createZodDto(PaginatedWorkflowVersionResponseSchema) {}
