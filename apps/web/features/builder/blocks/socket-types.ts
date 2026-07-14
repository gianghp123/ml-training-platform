export type { ConfigField, Port } from '@training-ml/contracts';
export { PipelineArtifactType, PipelineArtifactTypeSchema } from '@training-ml/contracts';

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
