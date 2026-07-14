import { z } from 'zod';
import { IsoDateCodec, UuidSchema } from '../shared';

import { createPaginatedResponseSchema } from "../response";

export const NodeExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export const NodeExecutionStatusSchema = z.enum(
  Object.values(NodeExecutionStatus) as [string, ...string[]],
);

export type NodeExecutionStatus = z.infer<typeof NodeExecutionStatusSchema>;

export const CreateNodeExecutionSchema = z.object({
  workflowRunId: UuidSchema,
  nodeId: z.string().min(1),
  nodeType: z.string().min(1),
  status: NodeExecutionStatusSchema.optional(),
  workerId: UuidSchema.optional(),
  retryCount: z.number().int().optional(),
  startedAt: IsoDateCodec.optional(),
  finishedAt: IsoDateCodec.optional(),
});

export const UpdateNodeExecutionSchema = CreateNodeExecutionSchema.partial();

export const NodeExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: NodeExecutionStatusSchema,
  workerId: z.string(),
  retryCount: z.number(),
  startedAt: IsoDateCodec,
  finishedAt: IsoDateCodec,
});

export type CreateNodeExecution = z.infer<typeof CreateNodeExecutionSchema>;
export type UpdateNodeExecution = z.infer<typeof UpdateNodeExecutionSchema>;
export type NodeExecution = z.infer<typeof NodeExecutionSchema>;

export const PaginatedNodeExecutionResponseSchema = createPaginatedResponseSchema(NodeExecutionSchema);
