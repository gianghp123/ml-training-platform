import { z } from 'zod';
import { IsoDateCodec, UuidSchema } from '../shared';

import { createPaginatedResponseSchema } from "../response";

export const CreateWorkflowVersionSchema = z.object({
  workflowId: UuidSchema,
  version: z.number(),
  graphJson: z.record(z.string(), z.unknown()),
});

export const UpdateWorkflowVersionSchema = CreateWorkflowVersionSchema.partial();

export const WorkflowVersionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string(),
  version: z.number(),
  graphJson: z.record(z.string(), z.unknown()),
  createdAt: IsoDateCodec,
});

export type CreateWorkflowVersion = z.infer<typeof CreateWorkflowVersionSchema>;
export type UpdateWorkflowVersion = z.infer<typeof UpdateWorkflowVersionSchema>;
export type WorkflowVersion = z.infer<typeof WorkflowVersionSchema>;

export const PaginatedWorkflowVersionResponseSchema = createPaginatedResponseSchema(WorkflowVersionSchema);
