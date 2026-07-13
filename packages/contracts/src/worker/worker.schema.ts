import { z } from 'zod';

export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export const CreateWorkerSchema = z.object({
  hostname: z.string().min(1),
  status: z.nativeEnum(WorkerStatus).optional(),
  capability: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateWorkerSchema = CreateWorkerSchema.partial();

export const WorkerSchema = z.object({
  id: z.string().uuid(),
  hostname: z.string(),
  status: z.nativeEnum(WorkerStatus),
  lastHeartbeat: z.date(),
  capability: z.record(z.string(), z.unknown()),
});

export type CreateWorker = z.infer<typeof CreateWorkerSchema>;
export type UpdateWorker = z.infer<typeof UpdateWorkerSchema>;
export type Worker = z.infer<typeof WorkerSchema>;
