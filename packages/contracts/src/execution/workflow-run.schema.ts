import { z } from 'zod';
import { UuidSchema } from '../shared';

export enum WorkflowRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const CreateWorkflowRunSchema = z.object({
  workflowVersionId: UuidSchema,
  datasetId: UuidSchema,
  status: z.nativeEnum(WorkflowRunStatus).optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  userId: z.string().min(1),
});

export const UpdateWorkflowRunSchema = CreateWorkflowRunSchema.partial();

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflowVersionId: z.string(),
  datasetId: z.string(),
  status: z.nativeEnum(WorkflowRunStatus),
  startedAt: z.date(),
  finishedAt: z.date(),
  userId: z.string(),
});

export type CreateWorkflowRun = z.infer<typeof CreateWorkflowRunSchema>;
export type UpdateWorkflowRun = z.infer<typeof UpdateWorkflowRunSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
