export type PortType =
  | 'Dataset'
  | 'Folds'
  | 'TrainedModel'
  | 'Hyperparameters'
  | 'LossConfig'
  | 'EarlyStoppingConfig'
  | 'Metrics';

export type TaskType = 'classification' | 'regression' | 'clustering';

export interface BlockInputPort {
  name: string;
  type: PortType;
  label?: string;
  optional?: boolean;
  meta?: { task?: TaskType };
  [key: string]: any;
}

export interface BlockOutputPort {
  name: string;
  type: PortType;
  label?: string;
  optional?: boolean;
  meta?: { task?: TaskType };
  [key: string]: any;
}


export interface BlockDefinition {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  configSchema?: Record<string, unknown>;
  inputSchema?: BlockInputPort[];
  outputSchema?: BlockOutputPort[];
  dockerImage?: string;
  version?: string;
}
