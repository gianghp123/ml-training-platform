import type { BlockDefinition } from '@training-ml/contracts';
import type { BlockConfigField } from '../socket-types';

export const LoadDatasetBlock: BlockDefinition = {
  id: 'load_dataset',
  code: 'load_dataset',
  name: 'Load Dataset',
  categoryId: 'data',
  description: 'Load a dataset from storage',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    datasetId: {
      type: 'select',
      label: 'Dataset',
      validation: { required: true },
      options: [{
        value: 'animal',
        label: 'Animal',
      }],
      default: 'animal',
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: { entries: [] } as Record<string, unknown>,
  outputSchema: {
    entries: [
      { id: 'dataset', type: 'dataset', label: 'Dataset' },
    ],
  } as Record<string, unknown>,
};

export const SplitDatasetBlock: BlockDefinition = {
  id: 'split_dataset',
  code: 'split_dataset',
  name: 'Split Dataset',
  categoryId: 'data',
  description: 'Split dataset into train/validation/test',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    trainRatio: { type: 'number', label: 'Train Ratio', default: 0.7, validation: { min: 0, max: 1, step: 0.01 } } satisfies BlockConfigField,
    valRatio: { type: 'number', label: 'Val Ratio', default: 0.15, validation: { min: 0, max: 1, step: 0.01 } } satisfies BlockConfigField,
    testRatio: { type: 'number', label: 'Test Ratio', default: 0.15, validation: { min: 0, max: 1, step: 0.01 } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [{ id: 'dataset', type: 'dataset', label: 'Dataset' }],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [
      { id: 'train', type: 'dataset', label: 'Train' },
      { id: 'val', type: 'dataset', label: 'Val' },
      { id: 'test', type: 'dataset', label: 'Test' },
    ],
  } as Record<string, unknown>,
};
