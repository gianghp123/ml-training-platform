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
  workerId: UuidSchema.nullable().optional(),
  retryCount: z.number().int().optional(),
  startedAt: IsoDateCodec.nullable().optional(),
  finishedAt: IsoDateCodec.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  outputSummary: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const UpdateNodeExecutionSchema = CreateNodeExecutionSchema.partial();

export const NodeExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: NodeExecutionStatusSchema,
  workerId: UuidSchema.nullable(),
  retryCount: z.number(),
  startedAt: IsoDateCodec.nullable(),
  finishedAt: IsoDateCodec.nullable(),
  errorMessage: z.string().nullable(),
  outputSummary: z.record(z.string(), z.unknown()).nullable(),
});

export type CreateNodeExecution = z.infer<typeof CreateNodeExecutionSchema>;
export type UpdateNodeExecution = z.infer<typeof UpdateNodeExecutionSchema>;
export type NodeExecution = z.infer<typeof NodeExecutionSchema>;

export const PaginatedNodeExecutionResponseSchema = createPaginatedResponseSchema(NodeExecutionSchema);
