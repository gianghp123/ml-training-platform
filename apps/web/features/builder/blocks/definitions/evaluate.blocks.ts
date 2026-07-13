import type { BlockDefinition } from '@training-ml/contracts';
import type { BlockConfigField } from '../socket-types';

export const EvaluateBlock: BlockDefinition = {
  id: 'evaluate',
  code: 'evaluate',
  name: 'Evaluate',
  categoryId: 'evaluate',
  description: 'Evaluate model performance on a dataset',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    metrics: {
      type: 'checkbox',
      label: 'Metrics',
      options: [
        { label: 'Accuracy', value: 'accuracy' },
        { label: 'F1 Score', value: 'f1' },
        { label: 'Precision', value: 'precision' },
        { label: 'Recall', value: 'recall' },
        { label: 'AUC', value: 'auc' },
      ],
      validation: { required: true },
    } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [
      { id: 'model', type: 'model', label: 'Model' },
      { id: 'dataset', type: 'dataset', label: 'Dataset' },
    ],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'metrics', type: 'metrics', label: 'Metrics' }],
  } as Record<string, unknown>,
};

export const CrossValidateBlock: BlockDefinition = {
  id: 'cross_validate',
  code: 'cross_validate',
  name: 'Cross Validate',
  categoryId: 'evaluate',
  description: 'K-fold cross validation',
  dockerImage: '',
  version: '1.0.0',
  configSchema: {
    folds: { type: 'number', label: 'Folds', default: 5, validation: { min: 2, max: 20, required: true } } satisfies BlockConfigField,
    shuffle: { type: 'switch', label: 'Shuffle', default: true } satisfies BlockConfigField,
  } as Record<string, unknown>,
  inputSchema: {
    entries: [
      { id: 'model', type: 'model', label: 'Model' },
      { id: 'dataset', type: 'dataset', label: 'Dataset' },
    ],
  } as Record<string, unknown>,
  outputSchema: {
    entries: [{ id: 'metrics', type: 'metrics', label: 'Metrics' }],
  } as Record<string, unknown>,
};
