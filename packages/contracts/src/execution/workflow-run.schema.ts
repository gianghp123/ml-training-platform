import { z } from 'zod';
import { UuidSchema } from '../shared';

export const WorkflowRunStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const WorkflowRunStatusSchema = z.enum(
  Object.values(WorkflowRunStatus) as [string, ...string[]],
);

export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;

export const CreateWorkflowRunSchema = z.object({
  workflowVersionId: UuidSchema,
  datasetId: UuidSchema,
  status: WorkflowRunStatusSchema.optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  userId: z.string().min(1),
});

export const UpdateWorkflowRunSchema = CreateWorkflowRunSchema.partial();

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflowVersionId: z.string(),
  datasetId: z.string(),
  status: WorkflowRunStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date(),
  userId: z.string(),
});

export type CreateWorkflowRun = z.infer<typeof CreateWorkflowRunSchema>;
export type UpdateWorkflowRun = z.infer<typeof UpdateWorkflowRunSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

import { createPaginatedResponseSchema } from "../response";
export const PaginatedWorkflowRunResponseSchema = createPaginatedResponseSchema(WorkflowRunSchema);
