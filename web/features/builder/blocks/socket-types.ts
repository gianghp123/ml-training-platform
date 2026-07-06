export const SocketTypes = ['dataset', 'model', 'metrics', 'config'] as const;
export type SocketType = typeof SocketTypes[number];

export interface SocketDefinition {
  id: string;
  type: SocketType;
  label: string;
  optional?: boolean;
}

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
  default?: string | number | boolean;
  options?: InputOption[];
  validation?: BlockConfigValidation;
}

export interface PortDefinition {
  dataType: "tabular" | "none";
  label: string;
  schema?: Record<string, string>;
}