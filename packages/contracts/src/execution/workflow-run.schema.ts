import { z } from 'zod';
import { createPaginatedResponseSchema } from '../response';
import { IsoDateCodec, UuidSchema } from '../shared';
import { ArtifactSchema } from './artifact.schema';
import { NodeExecutionSchema } from './node-execution.schema';
import { PipelineGraphSchema } from './pipeline-graph.schema';

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
  workflowVersionId: UuidSchema.nullable().optional(),
  datasetId: UuidSchema.nullable().optional(),
  graphSnapshot: PipelineGraphSchema,
  status: WorkflowRunStatusSchema.optional(),
  startedAt: IsoDateCodec.nullable().optional(),
  finishedAt: IsoDateCodec.nullable().optional(),
  userId: z.string().min(1),
});

export const UpdateWorkflowRunSchema = CreateWorkflowRunSchema.partial();

export const WorkflowRunSchema = z.object({
  id: UuidSchema,
  workflowVersionId: UuidSchema.nullable(),
  datasetId: UuidSchema.nullable(),
  graphSnapshot: z.union([
    PipelineGraphSchema,
    z.object({
      nodes: z.tuple([]),
      edges: z.tuple([]),
    }),
  ]),
  status: WorkflowRunStatusSchema,
  startedAt: IsoDateCodec.nullable(),
  finishedAt: IsoDateCodec.nullable(),
  userId: z.string(),
});

export const WorkflowRunDetailSchema = WorkflowRunSchema.extend({
  datasetIds: z.array(UuidSchema),
  nodeExecutions: z.array(NodeExecutionSchema),
  artifacts: z.array(ArtifactSchema),
});

export type CreateWorkflowRun = z.infer<typeof CreateWorkflowRunSchema>;
export type UpdateWorkflowRun = z.infer<typeof UpdateWorkflowRunSchema>;
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export type WorkflowRunDetail = z.infer<typeof WorkflowRunDetailSchema>;

export const PaginatedWorkflowRunResponseSchema =
  createPaginatedResponseSchema(WorkflowRunSchema);
