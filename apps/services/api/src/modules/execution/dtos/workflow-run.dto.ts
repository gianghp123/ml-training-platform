import {
  CreateWorkflowRunSchema,
  PaginatedWorkflowRunResponseSchema,
  UpdateWorkflowRunSchema,
  WorkflowRunSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkflowRunDto extends createZodDto(CreateWorkflowRunSchema.meta({ id: 'CreateWorkflowRun' }), { codec: true }) { }
export class UpdateWorkflowRunDto extends createZodDto(UpdateWorkflowRunSchema.meta({ id: 'UpdateWorkflowRun' }), { codec: true }) { }
export class WorkflowRunDto extends createZodDto(WorkflowRunSchema.meta({ id: 'WorkflowRun' }), { codec: true }) { }
export class PaginatedWorkflowRunResponseDto extends createZodDto(PaginatedWorkflowRunResponseSchema.meta({ id: 'PaginatedWorkflowRunResponse' }), { codec: true }) { }
