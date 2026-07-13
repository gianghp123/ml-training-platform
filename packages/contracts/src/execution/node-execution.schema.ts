import { z } from 'zod';
import { UuidSchema } from '../shared';

export enum NodeExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export const CreateNodeExecutionSchema = z.object({
  workflowRunId: UuidSchema,
  nodeId: z.string().min(1),
  nodeType: z.string().min(1),
  status: z.nativeEnum(NodeExecutionStatus).optional(),
  workerId: UuidSchema.optional(),
  retryCount: z.number().int().optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
});

export const UpdateNodeExecutionSchema = CreateNodeExecutionSchema.partial();

export const NodeExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.nativeEnum(NodeExecutionStatus),
  workerId: z.string(),
  retryCount: z.number(),
  startedAt: z.date(),
  finishedAt: z.date(),
});

export type CreateNodeExecution = z.infer<typeof CreateNodeExecutionSchema>;
export type UpdateNodeExecution = z.infer<typeof UpdateNodeExecutionSchema>;
export type NodeExecution = z.infer<typeof NodeExecutionSchema>;
