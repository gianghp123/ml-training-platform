import { z } from 'zod';
import { BlockDefinitionSchema } from '../block';
import {
  DatasetFormatSchema,
  DatasetProfileSchema,
  ValidationOptionsSchema,
} from '../dataset';
import { ValidationErrorSchema } from '../pipeline';
import { UuidSchema } from '../shared';
import { PipelineGraphSchema } from './pipeline-graph.schema';
import { WorkflowRunStatus } from './workflow-run.schema';

export const ExecuteWorkflowRunSchema = z.object({
  graph: PipelineGraphSchema,
  workflowVersionId: UuidSchema.optional(),
});

export const WorkflowRunAcceptedSchema = z.object({
  runId: UuidSchema,
  status: z.literal(WorkflowRunStatus.PENDING),
  eventsUrl: z.string().min(1),
});

export const WorkflowRunValidationErrorResponseSchema = z.object({
  message: z.string(),
  errors: z.array(ValidationErrorSchema),
});

export const WorkflowExecutionBlockSchema = BlockDefinitionSchema.pick({
  id: true,
  version: true,
  executorKey: true,
  name: true,
  ports: true,
  configSchema: true,
  constraints: true,
  outputTransform: true,
});

export const WorkflowExecutionDatasetSchema = z.object({
  id: UuidSchema,
  objectKey: z.string().min(1),
  name: z.string().min(1),
  format: DatasetFormatSchema,
  profile: DatasetProfileSchema.nullable().optional(),
  validationOptions: ValidationOptionsSchema.nullable().optional(),
});

export const WorkflowExecutionJobSchema = z.object({
  schemaVersion: z.literal(1),
  runId: UuidSchema,
  userId: z.string().min(1),
  graph: PipelineGraphSchema,
  blocks: z.record(z.string(), WorkflowExecutionBlockSchema),
  datasets: z.record(z.string(), WorkflowExecutionDatasetSchema),
});

export type ExecuteWorkflowRun = z.infer<typeof ExecuteWorkflowRunSchema>;
export type WorkflowRunAccepted = z.infer<
  typeof WorkflowRunAcceptedSchema
>;
export type WorkflowRunValidationErrorResponse = z.infer<
  typeof WorkflowRunValidationErrorResponseSchema
>;
export type WorkflowExecutionBlock = z.infer<
  typeof WorkflowExecutionBlockSchema
>;
export type WorkflowExecutionDataset = z.infer<
  typeof WorkflowExecutionDatasetSchema
>;
export type WorkflowExecutionJob = z.infer<
  typeof WorkflowExecutionJobSchema
>;
