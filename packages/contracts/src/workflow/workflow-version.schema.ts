import { z } from 'zod';
import { UuidSchema } from '../shared';

export const CreateWorkflowVersionSchema = z.object({
  workflowId: UuidSchema,
  version: z.number(),
  graphJson: z.record(z.string(), z.unknown()),
});

export const UpdateWorkflowVersionSchema = CreateWorkflowVersionSchema.partial();

export const WorkflowVersionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string(),
  version: z.number(),
  graphJson: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
});

export type CreateWorkflowVersion = z.infer<typeof CreateWorkflowVersionSchema>;
export type UpdateWorkflowVersion = z.infer<typeof UpdateWorkflowVersionSchema>;
export type WorkflowVersion = z.infer<typeof WorkflowVersionSchema>;

import { createPaginatedResponseSchema } from "../response";
export const PaginatedWorkflowVersionResponseSchema = createPaginatedResponseSchema(WorkflowVersionSchema);
