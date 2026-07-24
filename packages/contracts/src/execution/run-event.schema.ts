import { z } from 'zod';
import { UuidSchema } from '../shared';

export const RunEventType = {
  RUN_SNAPSHOT: 'run.snapshot',
  RUN_QUEUED: 'run.queued',
  RUN_STARTED: 'run.started',
  NODE_STARTED: 'node.started',
  NODE_LOG: 'node.log',
  NODE_COMPLETED: 'node.completed',
  NODE_FAILED: 'node.failed',
  ARTIFACT_CREATED: 'artifact.created',
  RUN_COMPLETED: 'run.completed',
  RUN_FAILED: 'run.failed',
} as const;

export const RunEventTypeSchema = z.enum(
  Object.values(RunEventType) as [string, ...string[]],
);

export const RunEventLevelSchema = z.enum([
  'debug',
  'info',
  'warning',
  'error',
]);

const createRunEventSchema = <T extends z.ZodLiteral<string>>(type: T) =>
  z.object({
    type,
    runId: UuidSchema,
    timestamp: z.iso.datetime(),
    nodeId: z.string().min(1).optional(),
    level: RunEventLevelSchema.optional(),
    message: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  });

export const RunEventSchema = z.discriminatedUnion('type', [
  createRunEventSchema(z.literal(RunEventType.RUN_SNAPSHOT)),
  createRunEventSchema(z.literal(RunEventType.RUN_QUEUED)),
  createRunEventSchema(z.literal(RunEventType.RUN_STARTED)),
  createRunEventSchema(z.literal(RunEventType.NODE_STARTED)),
  createRunEventSchema(z.literal(RunEventType.NODE_LOG)),
  createRunEventSchema(z.literal(RunEventType.NODE_COMPLETED)),
  createRunEventSchema(z.literal(RunEventType.NODE_FAILED)),
  createRunEventSchema(z.literal(RunEventType.ARTIFACT_CREATED)),
  createRunEventSchema(z.literal(RunEventType.RUN_COMPLETED)),
  createRunEventSchema(z.literal(RunEventType.RUN_FAILED)),
]);

export const TerminalRunEventTypes = [
  RunEventType.RUN_COMPLETED,
  RunEventType.RUN_FAILED,
] as const;

export type RunEventType = z.infer<typeof RunEventTypeSchema>;
export type RunEventLevel = z.infer<typeof RunEventLevelSchema>;
export type RunEvent = z.infer<typeof RunEventSchema>;
