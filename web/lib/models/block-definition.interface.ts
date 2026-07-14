export type ArtifactType =
  | 'Dataset'
  | 'Folds'
  | 'TrainedModel'
  | 'ModelSpec'
  | 'Predictions'
  | 'FittedTransformer'
  | 'Hyperparameters'
  | 'LossConfig'
  | 'EarlyStoppingConfig'
  | 'Metrics';

export type PortType = ArtifactType;

export type TaskType = 'classification' | 'regression' | 'clustering';

export interface BlockConfigValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  step?: number;
}

export interface InputOption {
  label: string;
  value: string;
}

export interface BlockConfigField {
  type: 'text' | 'number' | 'select' | 'switch' | 'textarea' | 'radio' | 'checkbox';
  label: string;
  default?: string | number | boolean | string[];
  options?: InputOption[];
  validation?: BlockConfigValidation;
  description?: string;
  dependsOn?: { field: string; equals: string | number | boolean };
}

export interface BlockPort {
  id: string;
  label: string;
  direction: 'input' | 'output';
  artifact: ArtifactType;
  required?: boolean;
  multiple?: boolean;
}

export interface BlockDefinition {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  configSchema?: Record<string, BlockConfigField>;
  portSchema?: { ports: BlockPort[] };
  runtimeInfo?: Record<string, unknown>;
  dockerImage?: string;
  version?: string;
}
