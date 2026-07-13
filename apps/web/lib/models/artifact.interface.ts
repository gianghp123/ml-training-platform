import { ArtifactType } from '../enums';

export interface Artifact {
  id: string;
  workflowRunId: string;
  nodeExecutionId: string;
  name: string;
  artifactType: ArtifactType;
  mimeType: string;
  storageUri: string;
  metadata?: Record<string, unknown>;
}
