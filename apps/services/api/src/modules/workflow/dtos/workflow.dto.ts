import {
  CreateWorkflowSchema,
  PaginatedWorkflowResponseSchema,
  UpdateWorkflowSchema,
  WorkflowSchema,
} from '@training-ml/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkflowDto extends createZodDto(CreateWorkflowSchema.meta({ id: 'CreateWorkflow' }), { codec: true }) { }
export class UpdateWorkflowDto extends createZodDto(UpdateWorkflowSchema.meta({ id: 'UpdateWorkflow' }), { codec: true }) { }
export class WorkflowDto extends createZodDto(WorkflowSchema.meta({ id: 'Workflow' }), { codec: true }) { }
export class PaginatedWorkflowResponseDto extends createZodDto(PaginatedWorkflowResponseSchema.meta({ id: 'PaginatedWorkflowResponse' }), { codec: true }) { }
