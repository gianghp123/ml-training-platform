import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const SaveModelBlock: BlockDefinition = {
  id: 'save_model',
  code: 'save_model',
  name: 'Save Model',
  categoryId: 'export',
  description: 'Save trained model to registry',
  configSchema: {
    name: { type: 'text', label: 'Model Name', default: '', validation: { required: true } } satisfies BlockConfigField,
    version: { type: 'text', label: 'Version', default: '1.0.0', validation: { required: true } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [
      { id: 'model', type: 'model', label: 'Model' },
      { id: 'metrics', type: 'metrics', label: 'Metrics', optional: true },
    ],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [],
  } as Record<string, unknown>,
};

export const ExportDatasetBlock: BlockDefinition = {
  id: 'export_dataset',
  code: 'export_dataset',
  name: 'Export Dataset',
  categoryId: 'export',
  description: 'Export processed dataset',
  configSchema: {
    format: {
      type: 'radio',
      label: 'Format',
      default: 'csv',
      options: [
        { label: 'CSV', value: 'csv' },
        { label: 'JSON', value: 'json' },
        { label: 'Parquet', value: 'parquet' },
      ],
    } satisfies BlockConfigField,
    path: { type: 'text', label: 'Output Path', default: '', validation: { required: true } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [],
  } as Record<string, unknown>,
};

export const LogMetricsBlock: BlockDefinition = {
  id: 'log_metrics',
  code: 'log_metrics',
  name: 'Log Metrics',
  categoryId: 'export',
  description: 'Log metrics to dashboard',
  configSchema: {} as Record<string, unknown>,
  inputSchema: {
    entries: [{ id: 'metrics', type: 'metrics', label: 'Metrics' }],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [],
  } as Record<string, unknown>,
};
