import { z } from 'zod';
import { createPaginatedResponseSchema } from "../response";
import { IsoDateCodec, UuidSchema } from '../shared';

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
  startedAt: IsoDateCodec.optional(),
  finishedAt: IsoDateCodec.optional(),
  userId: z.string().min(1),
});

export const UpdateWorkflowRunSchema = CreateWorkflowRunSchema.partial();

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflowVersionId: z.string(),
  datasetId: z.string(),
  status: WorkflowRunStatusSchema,
  startedAt: IsoDateCodec,
  finishedAt: IsoDateCodec,
  userId: z.string(),
});

export type CreateWorkflowRun = z.infer<typeof CreateWorkflowRunSchema>;
export type UpdateWorkflowRun = z.infer<typeof UpdateWorkflowRunSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

export const PaginatedWorkflowRunResponseSchema = createPaginatedResponseSchema(WorkflowRunSchema);
