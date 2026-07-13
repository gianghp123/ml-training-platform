import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  WorkflowSchema,
  PaginatedWorkflowResponseSchema,
} from '@training-ml/contracts';

export class CreateWorkflowDto extends createZodDto(CreateWorkflowSchema) {}
export class UpdateWorkflowDto extends createZodDto(UpdateWorkflowSchema) {}
export class WorkflowDto extends createZodDto(WorkflowSchema) {}
export class PaginatedWorkflowResponseDto extends createZodDto(PaginatedWorkflowResponseSchema) {}
