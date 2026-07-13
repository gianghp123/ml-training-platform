import type { BlockDefinition } from '@/lib/models';
import type { BlockConfigField } from '../socket-types';

export const TrainModelBlock: BlockDefinition = {
  id: 'train_model',
  code: 'train_model',
  name: 'Train Model',
  categoryId: 'model',
  description: 'Train a model on a dataset',
  configSchema: {
    epochs: { type: 'number', label: 'Epochs', default: 10, validation: { min: 1, max: 1000, required: true } } satisfies BlockConfigField,
    learningRate: { type: 'number', label: 'Learning Rate', default: 0.001, validation: { min: 0.0001, max: 1, step: 0.0001 } } satisfies BlockConfigField,
    batchSize: { type: 'number', label: 'Batch Size', default: 32, validation: { min: 1, max: 512 } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [
      { id: 'train_dataset', type: 'dataset', label: 'Train Dataset' },
      { id: 'val_dataset', type: 'dataset', label: 'Val Dataset', optional: true },
    ],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'model', type: 'model', label: 'Model' }],
  } as Record<string, unknown>,
};

export const FineTuneBlock: BlockDefinition = {
  id: 'fine_tune',
  code: 'fine_tune',
  name: 'Fine Tune',
  categoryId: 'model',
  description: 'Fine-tune a pre-trained model',
  configSchema: {
    epochs: { type: 'number', label: 'Epochs', default: 5, validation: { min: 1, max: 100 } } satisfies BlockConfigField,
    learningRate: { type: 'number', label: 'Learning Rate', default: 0.0001, validation: { min: 0.00001, max: 0.1, step: 0.00001 } } satisfies BlockConfigField,
    freezeLayers: { type: 'number', label: 'Freeze Layers', default: 0, validation: { min: 0 } } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [
      { id: 'model', type: 'model', label: 'Base Model' },
      { id: 'dataset', type: 'dataset', label: 'Dataset' },
    ],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'model', type: 'model', label: 'Fine-tuned Model' }],
  } as Record<string, unknown>,
};
