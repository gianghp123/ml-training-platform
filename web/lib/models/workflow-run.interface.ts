import { WorkflowRunStatus } from '../enums';

export interface WorkflowRun {
  id: string;
  workflowVersionId: string;
  datasetId: string;
  status: WorkflowRunStatus;
  startedAt?: Date;
  finishedAt?: Date;
  userId: string;
}
