import {
  CreateWorkflowRunSchema,
  PaginatedWorkflowRunResponseSchema,
  UpdateWorkflowRunSchema,
  WorkflowRunSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkflowRunDto extends createZodDto(CreateWorkflowRunSchema) { }
export class UpdateWorkflowRunDto extends createZodDto(UpdateWorkflowRunSchema) { }
export class WorkflowRunDto extends createZodDto(WorkflowRunSchema) { }
export class PaginatedWorkflowRunResponseDto extends createZodDto(PaginatedWorkflowRunResponseSchema) { }
