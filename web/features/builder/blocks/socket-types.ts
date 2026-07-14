import type { BlockPort, PortType } from '@/lib/models';
export type { BlockConfigField, BlockConfigValidation, InputOption } from '@/lib/models';

export const SocketTypes = [
  'Dataset',
  'Folds',
  'TrainedModel',
  'ModelSpec',
  'Predictions',
  'FittedTransformer',
  'Hyperparameters',
  'LossConfig',
  'EarlyStoppingConfig',
  'Metrics'
] as const;

export type SocketType = PortType;

export type SocketDefinition = BlockPort;

export interface PortDefinition {
  dataType: "tabular" | "none";
  label: string;
  schema?: Record<string, string>;
}
