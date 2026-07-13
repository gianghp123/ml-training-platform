export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  graphJson: Record<string, unknown>;
  createdAt: Date;
}
