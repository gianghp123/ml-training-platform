import {
  CreateWorkflowRunSchema,
  ExecuteWorkflowRunSchema,
  PaginatedWorkflowRunResponseSchema,
  UpdateWorkflowRunSchema,
  WorkflowRunAcceptedSchema,
  WorkflowRunDetailSchema,
  WorkflowRunSchema,
  WorkflowRunValidationErrorResponseSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkflowRunDto extends createZodDto(CreateWorkflowRunSchema.meta({ id: 'CreateWorkflowRun' }), { codec: true }) { }
export class UpdateWorkflowRunDto extends createZodDto(UpdateWorkflowRunSchema.meta({ id: 'UpdateWorkflowRun' }), { codec: true }) { }
export class WorkflowRunDto extends createZodDto(WorkflowRunSchema.meta({ id: 'WorkflowRun' }), { codec: true }) { }
export class WorkflowRunDetailDto extends createZodDto(WorkflowRunDetailSchema.meta({ id: 'WorkflowRunDetail' }), { codec: true }) { }
export class ExecuteWorkflowRunDto extends createZodDto(ExecuteWorkflowRunSchema.meta({ id: 'ExecuteWorkflowRun' }), { codec: true }) { }
export class WorkflowRunAcceptedDto extends createZodDto(WorkflowRunAcceptedSchema.meta({ id: 'WorkflowRunAccepted' }), { codec: true }) { }
export class WorkflowRunValidationErrorResponseDto extends createZodDto(WorkflowRunValidationErrorResponseSchema.meta({ id: 'WorkflowRunValidationErrorResponse' }), { codec: true }) { }
export class PaginatedWorkflowRunResponseDto extends createZodDto(PaginatedWorkflowRunResponseSchema.meta({ id: 'PaginatedWorkflowRunResponse' }), { codec: true }) { }
