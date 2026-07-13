import { z } from 'zod';

export const WorkerStatus = {
  IDLE: 'idle',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export const WorkerStatusSchema = z.enum(
  Object.values(WorkerStatus) as [string, ...string[]],
);

export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

export const CreateWorkerSchema = z.object({
  hostname: z.string().min(1),
  status: WorkerStatusSchema.optional(),
  capability: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateWorkerSchema = CreateWorkerSchema.partial();

export const WorkerSchema = z.object({
  id: z.string().uuid(),
  hostname: z.string(),
  status: WorkerStatusSchema,
  lastHeartbeat: z.date(),
  capability: z.record(z.string(), z.unknown()),
});

export type CreateWorker = z.infer<typeof CreateWorkerSchema>;
export type UpdateWorker = z.infer<typeof UpdateWorkerSchema>;
export type Worker = z.infer<typeof WorkerSchema>;

import { createPaginatedResponseSchema } from "../response";
export const PaginatedWorkerResponseSchema = createPaginatedResponseSchema(WorkerSchema);
