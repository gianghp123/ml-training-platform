import { z } from 'zod';

import { createPaginatedResponseSchema } from "../response";
import { IsoDateCodec } from '../shared';

export const CreateWorkflowSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: IsoDateCodec,
  updatedAt: IsoDateCodec,
});

export type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflow = z.infer<typeof UpdateWorkflowSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

export const PaginatedWorkflowResponseSchema = createPaginatedResponseSchema(WorkflowSchema);
