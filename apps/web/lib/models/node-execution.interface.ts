import { NodeExecutionStatus } from '../enums';

export interface NodeExecution {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  workerId?: string;
  retryCount: number;
  startedAt?: Date;
  finishedAt?: Date;
}
