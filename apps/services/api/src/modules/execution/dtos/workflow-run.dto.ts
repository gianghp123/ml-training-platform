import { createZodDto } from 'nestjs-zod';
import {
  CreateWorkflowRunSchema,
  UpdateWorkflowRunSchema,
  WorkflowRunSchema,
} from '@training-ml/contracts';

export class CreateWorkflowRunDto extends createZodDto(CreateWorkflowRunSchema) {}
export class UpdateWorkflowRunDto extends createZodDto(UpdateWorkflowRunSchema) {}
export class WorkflowRunDto extends createZodDto(WorkflowRunSchema) {}
